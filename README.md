# Lumen

Lumen is a private, self-hosted photo library for a Raspberry Pi. It is accessed through an existing Tailscale network and keeps original photos on local durable storage.

## Features

- Responsive Google Photos-style library
- Mobile-responsive gallery, login, albums, and image preview
- Light/dark theme switch with persisted preference
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
- Separate photo, device-volume, and application footprint measurements
- Timestamped backup and guarded restore commands

The gallery displays persisted uploads and albums only. Uploaded files are stored under `MEDIA_ROOT` and metadata is stored in SQLite at `DATABASE_PATH`.

## Requirements

For local development:

- Node.js LTS
- npm

For the Raspberry Pi:

- Raspberry Pi OS or another Debian-based Linux distribution
- Node.js LTS for the Pi architecture
- A durable mounted USB disk mounted at `/media/external1`
- Tailscale installed and connected to your tailnet
- A separate backup disk or mounted backup destination

### Raspberry Pi RAM guidance

- **2 GB or more:** recommended for Lumen plus normal Pi services.
- **1 GB:** usable for a small private library with `SHARP_CONCURRENCY=1` and swap enabled; avoid simultaneous large uploads.
- **512 MB:** not recommended for Next.js builds or image processing.

Builds use more memory than the running server. Build on another machine and deploy the generated app if your Pi is RAM-constrained, or ensure the Pi has temporary swap during `npm run build`. Runtime photo processing is limited by `SHARP_CONCURRENCY=1` and a 32 MB Sharp cache by default.

If the Pi reports that the build was `Killed`, confirm the OOM killer was responsible:

```bash
dmesg -T | grep -i -E 'out of memory|oom|killed process'
free -h
swapon --show
```

Before retrying, stop Lumen and other memory-heavy services:

```bash
sudo systemctl stop lumen
```

For a 1 GB Pi, temporarily increase swap to 2 GB using Raspberry Pi OS's swap service:

```bash
sudo nano /etc/dphys-swapfile
```

Set:

```env
CONF_SWAPSIZE=2048
```

Then apply it:

```bash
sudo systemctl restart dphys-swapfile
free -h
```

Retry with a bounded Node heap and telemetry disabled:

```bash
sudo -u lumen env NODE_OPTIONS=--max-old-space-size=768 NEXT_TELEMETRY_DISABLED=1 npm run build --prefix /opt/lumen
```

Restore the Lumen service after a successful build:

```bash
sudo systemctl start lumen
sudo systemctl status lumen
```

If the build is still killed, do not repeatedly build on the Pi. Build on another machine with the same Node.js/Next.js version, or use another ARM Linux machine, then deploy the resulting application and install dependencies for the Pi architecture with `npm ci`. Avoid running `npm run dev` on the Pi.

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

The commands below assume the app will live at `/opt/lumen`, run as user `lumen`, and use the USB drive mounted at `/media/external1`.

### 1. Install prerequisites

Install Node.js LTS using the method appropriate for your Pi OS image. Then create a dedicated service user and application directory:

```bash
sudo useradd --system --home /opt/lumen --shell /usr/sbin/nologin lumen
sudo mkdir -p /opt/lumen /media/external1/photos /media/external1/backups /etc/lumen
sudo chown -R lumen:lumen /opt/lumen /media/external1/photos /media/external1/backups
```

Before running these commands, confirm the USB drive is actually mounted:

```bash
findmnt /media/external1
df -h /media/external1
```

If `findmnt` shows nothing, stop and mount the USB drive first. Do not create `/media/external1` as an ordinary folder on the Pi's SD card by mistake.

The USB drive will contain:

```text
/media/external1/photos/     original photos and thumbnails
/media/external1/lumen.db    SQLite metadata database
/media/external1/backups/    temporary backup snapshots
```

For real protection against USB-drive failure, backups should eventually go to a different physical disk or another machine. A `backups` folder on the same USB drive is useful for accidental deletion, but does not protect against drive failure.

### 2. Install the application

Clone the repository into the application directory, then install and build as the service user:

```bash
sudo git clone YOUR_REPOSITORY_PATH /opt/lumen
sudo chown -R lumen:lumen /opt/lumen
sudo -u lumen npm ci --prefix /opt/lumen
sudo -u lumen npm run build --prefix /opt/lumen
```

Replace `YOUR_REPOSITORY_PATH` with the repository path available to your Pi. If the directory already contains the checkout, skip the clone command.

#### First deployment from a release archive

If you built on your Mac and copied `lumen-release.tar.gz` to `/tmp` on the Pi, use this instead of cloning:

```bash
sudo mkdir -p /opt/lumen
sudo tar -xzf /tmp/lumen-release.tar.gz -C /opt/lumen
sudo chown -R lumen:lumen /opt/lumen
sudo -u lumen npm ci --omit=dev --prefix /opt/lumen
```

Do not copy `node_modules` from the Mac. The Pi must install its own ARM-compatible Sharp and better-sqlite3 binaries. Do not delete or replace `/media/external1`; that is the USB photo storage, not the application directory. The Next config externalizes these native packages so the Pi resolves them from its own `node_modules`.

If the Pi is already running a release built on the Mac and logs errors such as `Cannot find module 'better-sqlite3-...'` or `Cannot find package 'sharp-...'`, replace the `.next` directory with a newly built release after this config change, then reinstall dependencies on the Pi:

```bash
sudo systemctl stop lumen
sudo rm -rf /opt/lumen/.next /opt/lumen/node_modules
sudo tar -xzf /tmp/lumen-release.tar.gz -C /opt/lumen
sudo chown -R lumen:lumen /opt/lumen
sudo -u lumen npm ci --omit=dev --prefix /opt/lumen
sudo systemctl start lumen
sudo journalctl -u lumen -n 100 --no-pager
```

For later releases, stop Lumen, extract the new archive over `/opt/lumen`, run the Pi-native `npm ci --omit=dev`, and start Lumen again. Keep `/etc/lumen/lumen.env`, `/media/external1/photos`, `/media/external1/lumen.db`, and `/media/external1/backups` untouched.

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
MEDIA_ROOT=/media/external1/photos
DATABASE_PATH=/media/external1/lumen.db
BACKUP_ROOT=/media/external1/backups
MAX_UPLOAD_BYTES=52428800
SHARP_CONCURRENCY=1
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

The backup timer runs daily at 03:00 and uses `BACKUP_ROOT`. The example path is on the same USB drive for convenience; change it to a different disk or backup machine for real disaster protection.

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
sudo -u lumen sh -c 'set -a; . /etc/lumen/lumen.env; set +a; BACKUP_PATH=/media/external1/backups/lumen-YYYY-MM-DDTHH-MM-SS-ZZZ RESTORE_ROOT=/media/external1/photos RESTORE_CONFIRM=YES RESTORE_ALLOW_NONEMPTY=YES npm run restore --prefix /opt/lumen'
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
