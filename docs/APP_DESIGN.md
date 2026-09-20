# Lumen App Design and Progress

## 1. Product Overview

Lumen is a private, self-hosted photo library for a Raspberry Pi. It is intended to feel familiar to Google Photos while keeping the original files on local storage controlled by the user.

The Raspberry Pi runs the application. Tailscale provides private network access from trusted devices without exposing the photo service directly to the public internet.

### Product goals

- Store original photos on durable Raspberry Pi storage.
- Browse memories quickly from desktop and mobile browsers.
- Keep the system private by default.
- Avoid dependence on a commercial cloud photo provider.
- Make backups and storage usage visible to the owner.

### Non-goals for the first production release

- Public photo sharing.
- AI face recognition or automatic content classification.
- Multi-user collaboration.
- Native iOS or Android applications.

## 2. Current Technical Design

```text
Browser
  |
  | private Tailscale connection
  v
Next.js application on Raspberry Pi
  |-- UI: app/page.tsx
  |-- Upload API: app/api/upload/route.ts
  |-- Future metadata API
  v
Durable media directory
  MEDIA_ROOT=/mnt/photos
```

### Current stack

- Next.js App Router
- React and TypeScript
- Tailwind CSS plus custom responsive CSS
- Node.js runtime for the upload route
- Local filesystem storage
- Planned: SQLite for metadata and job state

### Storage rule

Photo files should live outside the Git repository on a durable mounted disk. The application supports `MEDIA_ROOT`; if it is not set, uploads are written to `data/photos` inside the project directory for local development only.

## 3. Implemented Features

| Feature | Status | Notes |
| --- | --- | --- |
| Responsive photo library layout | Done | Desktop and mobile layouts are implemented. |
| Sidebar navigation | Done | Library, Albums, Favorites, and Archive controls are present. |
| Search field | Demo | Filters the hard-coded sample records by title and location. |
| Albums view | Demo | Displays hard-coded sample albums and counts. |
| Sample gallery | Demo | Uses remote image placeholders and sample metadata. |
| Multiple photo picker | Done | The UI accepts multiple image files. |
| Upload API | Done | `POST /api/upload` accepts multipart files. |
| Local file persistence | Done | Files are sanitized and written under `MEDIA_ROOT`. |
| Upload confirmation state | Done | The UI shows the number of newly accepted uploads. |
| Tailscale/private-library presentation | Done | The UI and documentation assume private access. Actual Tailscale configuration is external to this app. |
| Storage indicator | Demo | The displayed 42% value is currently static. |
| Production build | Done | `npm run build` passes. |
| Linting | Done | `npm run lint` passes. |

## 4. Not Yet Implemented

| Feature | Status | Priority | Description |
| --- | --- | --- | --- |
| Display uploaded photos | Not started | P0 | Read stored files and render them in the main library. |
| SQLite metadata index | Not started | P0 | Track file path, size, MIME type, dates, checksum, and processing state. |
| Thumbnail generation | Not started | P0 | Generate smaller images so the Pi does not send originals for every grid tile. |
| Real dates and EXIF data | Not started | P1 | Extract capture date, camera data, and GPS location when available. |
| Persistent albums | Not started | P1 | Store albums and photo membership in SQLite. |
| Favorites and archive | Not started | P1 | Persist these states instead of only showing navigation controls. |
| Accurate storage usage | Not started | P1 | Calculate usage from the configured media volume. |
| Delete and download | Not started | P1 | Add safe file operations with confirmation and audit-friendly behavior. |
| Authentication | Not started | P0 | Add an application-level login or trusted identity layer before wider use. |
| Upload limits and validation | Not started | P0 | Validate MIME type, file size, image dimensions, and request limits. |
| Duplicate detection | Not started | P2 | Use a checksum to avoid storing the same file repeatedly. |
| Background processing | Not started | P1 | Move EXIF extraction and thumbnails out of the upload request. |
| Backup workflow | Not started | P0 | Define and test a second copy of originals and the database. |
| HTTPS/reverse proxy | Not started | P0 | Add a controlled proxy and security headers for deployment. |
| systemd service | Not started | P1 | Start and restart the production server reliably on the Pi. |
| Offline/native clients | Not started | P2 | Consider only after the browser workflow is reliable. |

## 5. Recommended Development Roadmap

### Phase 1: Make the library real

1. Add a SQLite database.
2. Create a photo record for every successful upload.
3. Add a read API that returns photo records and thumbnail URLs.
4. Replace sample gallery records with API data.
5. Serve originals and thumbnails through controlled routes.

### Phase 2: Make uploads safe and useful

1. Validate image type and file size.
2. Generate a stable ID and SHA-256 checksum per file.
3. Extract EXIF dates and GPS metadata.
4. Generate thumbnails in a background job.
5. Add upload progress and failure feedback.

### Phase 3: Complete library behavior

1. Persist albums, favorites, and archive state.
2. Add photo detail view.
3. Add deletion and download.
4. Implement search over indexed metadata.
5. Replace static storage information with filesystem statistics.

### Phase 4: Prepare the Pi for long-term use

1. Move originals to a mounted SSD or other durable disk.
2. Run the app with systemd.
3. Add a reverse proxy and HTTPS if needed for the access model.
4. Configure Tailscale ACLs for the intended devices and users.
5. Schedule and regularly test backups.
6. Add health checks and basic application logs.

## 6. Production Readiness Checklist

- [ ] Original photos are on a separate durable volume.
- [ ] Every original has a database record.
- [ ] Uploads reject unsafe or unsupported files.
- [ ] The app requires authentication or a documented trusted identity boundary.
- [ ] The media directory is not directly exposed by the web server.
- [ ] Thumbnails are generated and served separately from originals.
- [ ] Database and originals are backed up independently.
- [ ] Restore from backup has been tested.
- [ ] The server starts automatically after a Pi reboot.
- [ ] Tailscale access is limited to intended devices or users.

## 7. Definition of Done for the First Real Release

The first release should allow the owner to upload photos from a browser, see those same photos in the library after a restart, search by filename and capture date, create an album, mark a photo as a favorite, download or delete a photo, and restore the library from a backup. All of those actions should work through the private Tailscale path without exposing the media directory itself.
