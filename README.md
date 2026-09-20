# Lumen

Lumen is a private, self-hosted photo library for a Raspberry Pi. It is accessed through an existing Tailscale network and keeps original photos on local durable storage.

## Features

- Responsive Google Photos-style library
- Password login with HTTP-only sessions
- Multiple photo uploads with validation and SHA-256 duplicate detection
- SQLite metadata indexing
- EXIF capture date, camera, and GPS extraction
- WebP thumbnail generation
- Search, favorites, archive, and persistent albums
- Protected download and confirmed deletion
- Photo detail view with metadata, actions, and previous/next navigation
- Detailed image facts including filename, type, size, dimensions, dates, camera, and GPS
- Live filesystem/media storage usage
- Timestamped backup and guarded restore commands

The gallery uses sample records only when the database is empty. Uploaded files are stored under `MEDIA_ROOT` and metadata is stored in SQLite at `DATABASE_PATH`.

## Requirements

For local development:

- Node.js LTS
- npm

For the Raspberry Pi:

- Raspberry Pi OS or another Debian-based Linux distribution
- Node.js LTS for the Pi architecture
- A durable mounted disk for originals, such as `/mnt/photos`
- Tailscale installed and connected to your tailnet
- A separate backup disk or mounted backup destination

Check the installed tools:

```bash
node --version
npm --version
tailscale status
```

## Local development

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The app always starts on authentication. Without `AUTH_PASSWORD`, it shows a setup-required screen and does not expose the gallery.

For local authentication, create `.env.local`:

```env
AUTH_PASSWORD=replace-with-a-long-random-password
AUTH_COOKIE_SECURE=false
MEDIA_ROOT=./data/photos
DATABASE_PATH=./data/lumen.db
BACKUP_ROOT=./data/backups
```

Use `AUTH_COOKIE_SECURE=true` only when the app is served through HTTPS. Keep it `false` for direct HTTP access over Tailscale.

Run the checks used before deployment:

```bash
npm run lint
npm run build
```

## Raspberry Pi installation

The commands below assume the app will live at `/opt/lumen`, run as user `lumen`, and use `/mnt/photos` for originals.

### 1. Install prerequisites

Install Node.js LTS using the method appropriate for your Pi OS image. Then create a dedicated service user and application directory:

```bash
sudo useradd --system --home /opt/lumen --shell /usr/sbin/nologin lumen
sudo mkdir -p /opt/lumen /mnt/photos /mnt/photo-backups /etc/lumen
sudo chown -R lumen:lumen /opt/lumen /mnt/photos /mnt/photo-backups
```

Mount the photo and backup disks before continuing. Do not use the project directory as the durable photo store.

### 2. Install the application

Clone the repository into the application directory, then install and build as the service user:

```bash
sudo git clone YOUR_REPOSITORY_PATH /opt/lumen
sudo chown -R lumen:lumen /opt/lumen
sudo -u lumen npm ci --prefix /opt/lumen
sudo -u lumen npm run build --prefix /opt/lumen
```

Replace `YOUR_REPOSITORY_PATH` with the repository path available to your Pi. If the directory already contains the checkout, skip the clone command.

### 3. Configure secrets and storage

Copy the example environment file and edit it:

```bash
sudo cp /opt/lumen/deploy/lumen.env.example /etc/lumen/lumen.env
sudo nano /etc/lumen/lumen.env
sudo chown lumen:lumen /etc/lumen/lumen.env
sudo chmod 600 /etc/lumen/lumen.env
```

Use values like:

```env
AUTH_PASSWORD=replace-with-a-long-random-password
AUTH_COOKIE_SECURE=false
MEDIA_ROOT=/mnt/photos
DATABASE_PATH=/mnt/photos/lumen.db
BACKUP_ROOT=/mnt/photo-backups
MAX_UPLOAD_BYTES=52428800
```

Set a real strong password. Keep `AUTH_COOKIE_SECURE=false` when accessing the Pi directly over HTTP through Tailscale. Set it to `true` only after HTTPS is configured.

### 4. Install the systemd services

The templates use `/opt/lumen` and the `lumen` user. Copy them into systemd and start the app plus daily backup timer:

```bash
sudo cp /opt/lumen/deploy/lumen.service.example /etc/systemd/system/lumen.service
sudo cp /opt/lumen/deploy/lumen-backup.service.example /etc/systemd/system/lumen-backup.service
sudo cp /opt/lumen/deploy/lumen-backup.timer.example /etc/systemd/system/lumen-backup.timer
sudo systemctl daemon-reload
sudo systemctl enable --now lumen.service
sudo systemctl enable --now lumen-backup.timer
```

Check service health:

```bash
sudo systemctl status lumen
sudo systemctl list-timers lumen-backup.timer
sudo journalctl -u lumen -n 100 --no-pager
```

The backup timer runs daily at 03:00 and uses `BACKUP_ROOT`. The backup destination should be a different physical disk or backup system from `/mnt/photos`.

### 5. Verify Tailscale access

On the Pi:

```bash
tailscale status
hostname
```

From another device on the tailnet, open `http://PI_TAILSCALE_HOSTNAME:3000` or the Pi's Tailscale IP. Replace `PI_TAILSCALE_HOSTNAME` with the value shown by `tailscale status` or `hostname`.

The app itself does not expose the media directory directly. Keep Tailscale ACLs limited to the devices and users that should access the library.

## Backups and restore

Create a manual backup:

```bash
sudo -u lumen sh -c 'set -a; . /etc/lumen/lumen.env; set +a; npm run backup --prefix /opt/lumen'
```

The command creates a timestamped folder containing `lumen.db`, `photos/`, and `manifest.json`. The systemd timer runs the same operation automatically.

Restore only after stopping the app and verifying the paths:

```bash
sudo systemctl stop lumen
sudo -u lumen sh -c 'set -a; . /etc/lumen/lumen.env; set +a; BACKUP_PATH=/mnt/photo-backups/lumen-YYYY-MM-DDTHH-MM-SS-ZZZ RESTORE_ROOT=/mnt/photos RESTORE_CONFIRM=YES RESTORE_ALLOW_NONEMPTY=YES npm run restore --prefix /opt/lumen'
sudo systemctl start lumen
```

Restore refuses to run without explicit confirmation and refuses a non-empty destination unless `RESTORE_ALLOW_NONEMPTY=YES` is provided. Test a restore on the actual Pi before treating the system as protected by backups.

## HTTPS and reverse proxy

This repository does not configure a reverse proxy or HTTPS certificate. Direct Tailscale HTTP access is supported with `AUTH_COOKIE_SECURE=false`. If you add Caddy, Nginx, or another HTTPS proxy later, bind the Next.js service to an internal interface/port, configure the proxy, then set `AUTH_COOKIE_SECURE=true` and restart Lumen.

## Current production gaps

- A real Raspberry Pi restore drill has not been automated.
- HTTPS/reverse proxy configuration is not included.
- Backup scheduling must be verified on the actual Pi and backup mount.
- The media directory still needs independent monitoring and disk-health checks.
