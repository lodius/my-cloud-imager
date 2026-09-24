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
  |-- Photo metadata API: app/api/photos/route.ts
  |-- Album API: app/api/albums/route.ts
  |-- Auth API: app/api/auth/*
  |-- Storage API: app/api/storage/route.ts
  |-- Controlled media API: app/api/media/[filename]/route.ts
  |-- Thumbnail API: app/api/thumbnails/[filename]/route.ts
  v
Durable media directory
  MEDIA_ROOT=/mnt/photos

Operational scripts
  |-- npm run backup
  |-- npm run restore
```

### Current stack

- Next.js App Router
- React and TypeScript
- Tailwind CSS plus custom responsive CSS
- Node.js runtime for the upload route
- Local filesystem storage
- SQLite for photo metadata, album membership, favorites, archive state, and future job state

### Storage rule

Photo files should live outside the Git repository on a durable mounted disk. The application supports `MEDIA_ROOT`; if it is not set, uploads are written to `data/photos` inside the project directory for local development only.

## 3. Implemented Features

| Feature | Status | Notes |
| --- | --- | --- |
| Responsive photo library layout | Done | Desktop and mobile layouts are implemented, including a bounded scrollable image preview for phone screens and light/dark themes. |
| Sidebar navigation | Done | Library, Albums, Favorites, and Archive controls are present. |
| Search field | Partial | Filters the active gallery records by filename/title and location. Metadata search is still limited. |
| Albums view | Done | Loads persistent albums and counts, with an explicit empty state when no albums exist. Open albums support adding/removing existing photos and album deletion. |
| Multiple photo picker | Done | The UI accepts multiple image files. |
| Upload API | Done | `POST /api/upload` accepts multipart files, validates them, detects duplicates, and creates metadata records. |
| Local file persistence | Done | Files are uniquely named, sanitized, and written under `MEDIA_ROOT`. |
| SQLite metadata index | Partial | Uploads are indexed with file, date, EXIF, dimension, and state metadata. Processing state remains pending. |
| Display uploaded photos | Done | Persisted uploads are fetched through controlled thumbnail URLs, grouped by capture/upload year, and can be opened in a protected detail view. |
| Favorites and archive state | Partial | Favorite/archive flags persist in SQLite and favorites/archive views filter correctly; visible archive/unarchive actions and bulk actions remain. |
| Album creation | Done | Named albums persist in SQLite through `/api/albums`; photos can be added, removed, and albums can be deleted. Viewing an album no longer overwrites the main library list. |
| Controlled media serving | Done | Indexed files are served through `/api/media/[filename]` and `/api/thumbnails/[filename]`; the app fails closed when authentication is not configured. |
| Upload confirmation state | Done | The UI shows the number of newly accepted uploads. |
| Tailscale/private-library presentation | Done | The UI and documentation assume private access. Actual Tailscale configuration is external to this app. |
| Storage indicator | Done | The sidebar uses whole-device usage for the bar and separates uploaded-photo and Lumen application footprints. |
| Production build | Done | `npm run build` passes. |
| Linting | Done | `npm run lint` passes. |

## 4. Not Yet Implemented

| Feature | Status | Priority | Description |
| --- | --- | --- | --- |
| Display uploaded photos | Done | P0 | Read indexed files, render thumbnails, and open protected original detail views with arrow-key, button, and metadata navigation. |
| SQLite metadata index | Partial | P0 | Tracks filename, type, size, dimensions, dates, EXIF, and state metadata. Processing state remains. |
| Thumbnail generation | Done | P0 | Uploads generate 640px WebP thumbnails and the gallery uses their controlled URL. |
| Real dates and EXIF data | Done | P1 | Extract capture date, camera model, and GPS coordinates when available; upload time is the fallback. |
| Persistent albums | Done | P1 | Album records, membership tables, album browsing, counts, photo assignment/removal, multi-photo picker, and album deletion are implemented. |
| Favorites and archive | Partial | P1 | Favorite/archive state is persisted and filterable; visible archive/unarchive actions and bulk management remain. |
| Accurate storage usage | Done | P1 | Calculate filesystem usage and media-directory bytes from the configured volume. |
| Delete and download | Done | P1 | Protected original download and confirmed deletion remove database memberships, originals, and thumbnails together. |
| Authentication | Done | P0 | Password authentication with HTTP-only signed session cookies protects the UI and media APIs. The app fails closed when `AUTH_PASSWORD` is missing; set `AUTH_COOKIE_SECURE=true` only behind HTTPS. |
| Setup and login UX | Done | P0 | Login-first entry, setup checklist, password visibility toggle, loading feedback, and inline errors are implemented responsively. |
| Upload limits and validation | Done | P0 | Reject unsupported formats, files over 50 MB by default, and images over 10000px per dimension. |
| Duplicate detection | Done | P2 | SHA-256 checksums prevent the same file from being stored repeatedly. |
| Background processing | Not started | P1 | Move EXIF extraction and thumbnails out of the upload request. |
| Backup workflow | Partial | P0 | `npm run backup` and guarded `npm run restore` are available; a scheduled systemd timer is templated, while a real Pi restore drill remains. |
| HTTPS/reverse proxy | Not started | P0 | Add a controlled proxy and security headers for deployment. |
| systemd service | Partial | P1 | App and daily backup unit/timer templates exist under `deploy/`; they must be installed and configured on the Pi. |
| Offline/native clients | Not started | P2 | Consider only after the browser workflow is reliable. |

## 4a. Known Performance Issues (Image Loading)

Reported: gallery image loading feels very slow. Root causes identified:

1. **No lazy loading.** Grid photos render as CSS `background-image` divs, not `<img loading="lazy">`, so every photo in a view starts downloading immediately regardless of scroll position.
2. **Per-request auth overhead.** `/api/media` and `/api/thumbnails` re-run `isAuthenticated()` (cookie parse + HMAC compare) and a SQLite lookup on every single image request.
3. **HTTP/1.1 connection limits.** Browsers cap concurrent connections per origin (~6); with no lazy loading, all image requests queue and serialize.
4. **No conditional caching (ETag/Last-Modified).** Only `Cache-Control: max-age=3600` is set; there is no cheap 304 revalidation path.
5. **Streamed per-request disk reads** instead of a static-file-optimized path; a smaller factor but adds overhead on constrained hardware (Raspberry Pi).
6. **`npm run build` was silently failing** (TypeScript error in `app/api/albums/route.ts` from an untyped `listAlbums()` return), which meant testing was happening against the slower `next dev` server instead of a production build. Fixed by adding an explicit `AlbumSummary` return type to `listAlbums()` in `lib/db.ts`.

Planned fixes, in order: (1) lazy-load grid thumbnails, (2) add ETag/Last-Modified to media/thumbnail routes, (3) verify production build is used for perf testing, (4) consider a smaller dedicated grid-thumbnail size separate from the 640px preview thumbnail.



### Phase 1: Make the library real

1. Add a SQLite database. Done.
2. Create a photo record for every successful upload. Done.
3. Add a read API that returns photo records and thumbnail URLs. Done.
4. Replace sample gallery records with API data. Done; the gallery is persisted-data-only.
5. Serve originals and thumbnails through controlled routes. Done.

### Phase 2: Make uploads safe and useful

1. Validate image type and file size.
2. Generate a stable ID and SHA-256 checksum per file.
3. Extract EXIF dates and GPS metadata. Done; images without EXIF use upload time and no location.
4. Generate thumbnails in a background job.
5. Add upload progress and failure feedback.

### Phase 3: Complete library behavior

1. Persist albums, favorites, and archive state. Done; archive controls are the next UI refinement.
2. Add photo detail view. Done; detail displays the protected original, file facts, dimensions, capture/upload metadata, camera/GPS data, and actions.
3. Add deletion and download. Done.
4. Implement search over indexed metadata. Partial; current search covers filename/title and location labels, while display grouping uses capture year with upload-time fallback.
5. Replace static storage information with filesystem statistics. Done.

### Phase 4: Prepare the Pi for long-term use

1. Move originals to a mounted SSD or other durable disk.
2. Run the app with systemd. Templates are available under `deploy/`.
3. Add a reverse proxy and HTTPS if needed for the access model.
4. Configure Tailscale ACLs for the intended devices and users.
5. Schedule and regularly test backups. A daily systemd timer template is available through `deploy/`.
6. Add health checks and basic application logs.

## 6. Production Readiness Checklist

- [ ] Original photos are on a separate durable volume. Raspberry Pi deployment is currently paused.
- [ ] Every original has a database record.
- [ ] Uploads reject unsafe or unsupported files.
- [x] The app requires authentication and fails closed when `AUTH_PASSWORD` is missing; Tailscale remains the private network boundary.
- [ ] The media directory is not directly exposed by the web server.
- [ ] Thumbnails are generated and served separately from originals.
- [x] Database and originals are backed up independently.
- [ ] Restore from backup has been tested on the Raspberry Pi.
- [ ] The server starts automatically after a Pi reboot. (Template provided; Pi installation pending.)
- [ ] Tailscale access is limited to intended devices or users.

## 7. Definition of Done for the First Real Release

The first release should allow the owner to upload photos from a browser, see those same photos in the library after a restart, search by filename and capture date, create an album, mark a photo as a favorite, download or delete a photo, and restore the library from a backup. All of those actions should work through the private Tailscale path without exposing the media directory itself.
