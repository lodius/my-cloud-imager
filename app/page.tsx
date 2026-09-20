"use client";

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type GalleryPhoto = {
  title: string;
  date: string;
  location: string;
  image: string;
  source?: string;
  filename?: string;
  originalUrl?: string;
  originalName?: string;
  mimeType?: string;
  size?: number;
  width?: number;
  height?: number;
  createdAt?: string;
  cameraModel?: string;
  latitude?: number;
  longitude?: number;
  isFavorite?: boolean;
  isArchived?: boolean;
};
const photos: GalleryPhoto[] = [
  {
    title: "The Dolomites",
    date: "Sep 08, 2024",
    location: "Italy",
    image:
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1000&q=85",
  },
  {
    title: "A quiet morning",
    date: "Sep 03, 2024",
    location: "Home",
    image:
      "https://images.unsplash.com/photo-1497250681960-ef046c08a56e?auto=format&fit=crop&w=1000&q=85",
  },
  {
    title: "Blue hour",
    date: "Aug 27, 2024",
    location: "Porto",
    image:
      "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1000&q=85",
  },
  {
    title: "Summer table",
    date: "Aug 21, 2024",
    location: "Lisbon",
    image:
      "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1000&q=85",
  },
  {
    title: "Old town walk",
    date: "Aug 19, 2024",
    location: "Porto",
    image:
      "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=1000&q=85",
  },
  {
    title: "Late light",
    date: "Aug 12, 2024",
    location: "Home",
    image:
      "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1000&q=85",
  },
  {
    title: "Coastal road",
    date: "Jul 30, 2024",
    location: "Portugal",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1000&q=85",
  },
  {
    title: "Good company",
    date: "Jul 18, 2024",
    location: "Lisbon",
    image:
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1000&q=85",
  },
];
const albums = [
  {
    name: "Summer 2024",
    count: 124,
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=500&q=80",
  },
  {
    name: "Portugal",
    count: 86,
    image:
      "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=500&q=80",
  },
  {
    name: "Favorites",
    count: 32,
    image:
      "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=500&q=80",
  },
];
type StoredPhoto = {
  filename: string;
  originalName: string;
  capturedAt: string;
  createdAt: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  url: string;
  thumbnailUrl?: string;
  cameraModel?: string;
  latitude?: number;
  longitude?: number;
  isFavorite?: boolean;
  isArchived?: boolean;
};
type AlbumRecord = { id: number; name: string; count: number };
type StorageInfo = {
  totalBytes: number;
  mediaBytes: number;
  percentUsed: number;
};
function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}
function toGalleryPhoto(photo: StoredPhoto): GalleryPhoto {
  const location =
    typeof photo.latitude === "number" && typeof photo.longitude === "number"
      ? `${photo.latitude.toFixed(2)}, ${photo.longitude.toFixed(2)}`
      : "Uploaded";
  return {
    title: photo.originalName,
    date: new Date(photo.capturedAt).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }),
    location,
    image: photo.thumbnailUrl ?? photo.url,
    source: "Local upload",
    filename: photo.filename,
    originalName: photo.originalName,
    mimeType: photo.mimeType,
    size: photo.size,
    width: photo.width,
    height: photo.height,
    createdAt: photo.createdAt,
    originalUrl: photo.url,
    cameraModel: photo.cameraModel,
    latitude: photo.latitude,
    longitude: photo.longitude,
    isFavorite: photo.isFavorite,
    isArchived: photo.isArchived,
  };
}

export default function Home() {
  const [activeView, setActiveView] = useState("Library");
  const [query, setQuery] = useState("");
  const [uploaded, setUploaded] = useState<string[]>([]);
  const [storedPhotos, setStoredPhotos] = useState<GalleryPhoto[]>([]);
  const [realAlbums, setRealAlbums] = useState<AlbumRecord[]>([]);
  const [activeAlbumId, setActiveAlbumId] = useState<number | null>(null);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [authConfigured, setAuthConfigured] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null);
  const [demoPhotoState, setDemoPhotoState] = useState<Record<string, { isFavorite?: boolean; isArchived?: boolean }>>({});
  useEffect(() => {
    fetch("/api/auth/session")
      .then((response) => response.json())
      .then((session) => {
        setAuthConfigured(session.configured);
        setAuthenticated(session.authenticated);
        setAuthLoading(false);
        if (session.authenticated) {
          fetch("/api/albums")
            .then((response) => response.json())
            .then((data) => setRealAlbums(data.albums));
          fetch("/api/storage")
            .then((response) => (response.ok ? response.json() : null))
            .then((data) => data && setStorageInfo(data));
          return fetch("/api/photos")
            .then((response) => response.json())
            .then((data) =>
              setStoredPhotos(
                data.photos.map((photo: StoredPhoto) => toGalleryPhoto(photo)),
              ),
            );
        }
      })
      .catch(() => setAuthLoading(false));
  }, []);
  const galleryPhotos = storedPhotos.length > 0
    ? storedPhotos
    : photos.map((photo) => ({ ...photo, ...demoPhotoState[photo.title] }));
  const viewPhotos =
    activeView === "Favorites"
      ? galleryPhotos.filter((photo) => photo.isFavorite)
      : activeView === "Archive"
        ? galleryPhotos.filter((photo) => photo.isArchived)
        : galleryPhotos.filter((photo) => !photo.isArchived);
  const filteredPhotos = useMemo(
    () =>
      viewPhotos.filter((photo) =>
        `${photo.title} ${photo.location}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [viewPhotos, query],
  );
  const selectedIndex = selectedPhoto
    ? filteredPhotos.findIndex(
        (photo) => (photo.filename ?? photo.title) === (selectedPhoto.filename ?? selectedPhoto.title),
      )
    : -1;
  const moveSelection = useCallback(
    (direction: -1 | 1) => {
      if (filteredPhotos.length < 2 || selectedIndex < 0) return;
      const nextIndex =
        (selectedIndex + direction + filteredPhotos.length) %
        filteredPhotos.length;
      setSelectedPhoto(filteredPhotos[nextIndex]);
    },
    [filteredPhotos, selectedIndex],
  );
  useEffect(() => {
    if (!selectedPhoto) return;
    function handleDetailKey(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") moveSelection(-1);
      if (event.key === "ArrowRight") moveSelection(1);
      if (event.key === "Escape") setSelectedPhoto(null);
    }
    window.addEventListener("keydown", handleDetailKey);
    return () => window.removeEventListener("keydown", handleDetailKey);
  }, [selectedPhoto, moveSelection]);
  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    const formData = new FormData();
    files.forEach((file) => formData.append("photos", file));
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
    if (response.ok) {
      setUploaded((current) => [...files.map((file) => file.name), ...current]);
      const refreshed = await fetch("/api/photos");
      const data = await refreshed.json();
      setStoredPhotos(
        data.photos.map((photo: StoredPhoto) => toGalleryPhoto(photo)),
      );
    }
  }
  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authConfigured || !password || loginLoading) return;
    setLoginError("");
    setLoginLoading(true);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (response.ok) {
      setAuthenticated(true);
      setPassword("");
      window.location.reload();
    } else {
      setLoginError(
        response.status === 503
          ? "Authentication is not configured on this server."
          : "That password was not accepted.",
      );
      setLoginLoading(false);
    }
  }
  async function handleLogout() {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });
    if (response.ok) window.location.replace("/");
  }
  async function togglePhoto(
    filename: string | undefined,
    action: "favorite" | "archive",
    value: boolean,
    photoTitle?: string,
  ) {
    if (!filename) {
      const title = photoTitle ?? selectedPhoto?.title;
      if (!title) return;
      setDemoPhotoState((current) => ({
        ...current,
        [title]: {
          ...current[title],
          ...(action === "favorite" ? { isFavorite: value } : { isArchived: value }),
        },
      }));
      setSelectedPhoto((current) => current?.title === title ? {
          ...current,
          ...(action === "favorite" ? { isFavorite: value } : { isArchived: value }),
        } : current);
      return;
    }
    const response = await fetch(
      `/api/photos/${encodeURIComponent(filename)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, value }),
      },
    );
    if (response.ok)
      setStoredPhotos((current) =>
        current.map((photo) =>
          photo.filename === filename
            ? {
                ...photo,
                ...(action === "favorite"
                  ? { isFavorite: value }
                  : { isArchived: value }),
              }
            : photo,
        ),
      );
  }
  async function deletePhoto(filename: string | undefined) {
    if (
      !filename ||
      !window.confirm("Delete this photo and its thumbnail permanently?")
    )
      return;
    const response = await fetch(
      `/api/photos/${encodeURIComponent(filename)}`,
      { method: "DELETE" },
    );
    if (response.ok) {
      setStoredPhotos((current) =>
        current.filter((photo) => photo.filename !== filename),
      );
      setSelectedPhoto(null);
    }
  }
  async function createNewAlbum() {
    const name = window.prompt("Album name");
    if (!name?.trim()) return;
    const response = await fetch("/api/albums", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (response.ok) setRealAlbums((await response.json()).albums);
  }
  async function openAlbum(album: AlbumRecord) {
    setActiveView(album.name);
    setActiveAlbumId(album.id);
    const response = await fetch(`/api/albums/${album.id}`);
    if (!response.ok) return;
    const data = await response.json();
    setStoredPhotos(
      data.photos.map((photo: StoredPhoto) => toGalleryPhoto(photo)),
    );
  }
  async function addToAlbum(albumId: string, filename: string | undefined) {
    if (!filename || !albumId) return;
    const response = await fetch(`/api/albums/${albumId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename }),
    });
    if (response.ok)
      setRealAlbums((current) =>
        current.map((album) =>
          album.id === Number(albumId)
            ? { ...album, count: album.count + 1 }
            : album,
        ),
      );
  }

  if (authLoading)
    return (
      <main className="auth-screen">
        <div className="auth-panel auth-loading">
          <div className="brand">
            <span className="brand-mark">o</span>
            <span>lumen</span>
          </div>
          <span className="loading-mark" aria-hidden="true" />
          <p>Opening your private library...</p>
        </div>
      </main>
    );
  if (!authenticated)
    return (
      <main className="auth-screen">
        <div className="auth-panel">
          <div className="auth-header">
            <div className="brand">
              <span className="brand-mark">o</span>
              <span>lumen</span>
            </div>
            <span className="private-badge">Private · Tailscale</span>
          </div>
          {authConfigured ? (
            <form onSubmit={handleLogin}>
              <p className="eyebrow">Welcome back</p>
              <h1>Pick up where you left off.</h1>
              <p className="auth-copy">
                Your memories are waiting in your private library.
              </p>
              <label className="auth-label" htmlFor="library-password">
                Library password
                <div className="password-wrap">
                  <input
                    id="library-password"
                    autoFocus
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </label>
              {loginError && (
                <p className="login-error" role="alert">
                  <span>!</span>
                  {loginError}
                </p>
              )}
              <button
                className="login-button"
                type="submit"
                disabled={loginLoading || !password}
              >
                {loginLoading ? (
                  <>
                    <span className="button-spinner" /> Unlocking...
                  </>
                ) : (
                  "Unlock library"
                )}
              </button>
              <p className="auth-footnote">
                Your session stays on this device.
              </p>
            </form>
          ) : (
            <div className="setup-state">
              <p className="eyebrow">One small setup step</p>
              <h1>Make this library yours.</h1>
              <p className="auth-copy">
                Lumen needs a password before it can open your photo library.
              </p>
              <div className="setup-steps">
                <div>
                  <span>1</span>
                  <p>
                    Create <strong>.env.local</strong> in the project folder.
                  </p>
                </div>
                <div>
                  <span>2</span>
                  <p>
                    Add <strong>AUTH_PASSWORD</strong> with a strong value.
                  </p>
                </div>
                <div>
                  <span>3</span>
                  <p>Restart the server and come back here.</p>
                </div>
              </div>
              <code className="setup-code">
                AUTH_PASSWORD=your-private-password
              </code>
              <p className="auth-footnote">
                Keep this value private. It protects every photo endpoint.
              </p>
            </div>
          )}
        </div>
      </main>
    );

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">o</span>
          <span>lumen</span>
        </div>
        <div className="side-section">
          <p className="eyebrow">Your library</p>
          {["Library", "Albums", "Favorites", "Archive"].map((view) => (
            <button
              className={`nav-item ${activeView === view ? "active" : ""}`}
              key={view}
              onClick={() => setActiveView(view)}
            >
              <span className="nav-icon">
                {view === "Library"
                  ? "◫"
                  : view === "Albums"
                    ? "▦"
                    : view === "Favorites"
                      ? "♡"
                      : "⌁"}
              </span>
              {view}
              {view === "Library" && <span className="nav-count">2,481</span>}
            </button>
          ))}
        </div>
        <div className="side-section">
          <div className="section-heading">
            <p className="eyebrow">Albums</p>
            <button
              className="plus-button"
              aria-label="Create album"
              onClick={createNewAlbum}
            >
              +
            </button>
          </div>
          {(realAlbums.length > 0 ? realAlbums : albums).map((album, index) => (
            <button
              className="mini-album"
              key={album.name}
              onClick={() =>
                "id" in album ? openAlbum(album) : setActiveView(album.name)
              }
            >
              <span
                className="mini-thumb"
                style={{
                  backgroundImage: `url(${"image" in album ? album.image : photos[index % photos.length].image})`,
                }}
              />
              <span>{album.name}</span>
              <small>{album.count}</small>
            </button>
          ))}
        </div>
        <div className="storage-card">
          <div className="storage-top">
            <span>Storage</span>
            <strong>
              {storageInfo ? `${storageInfo.percentUsed}%` : "--"}
            </strong>
          </div>
          <div className="storage-bar">
            <span style={{ width: `${storageInfo?.percentUsed ?? 0}%` }} />
          </div>
          <p>
            {storageInfo
              ? `${formatBytes(storageInfo.mediaBytes)} of ${formatBytes(storageInfo.totalBytes)} in photos`
              : "Storage information unavailable"}
          </p>
          <button>
            Manage storage <span>↗</span>
          </button>
        </div>
        <div className="profile">
          <div className="avatar">Q</div>
          <div>
            <strong>Quake&apos;s library</strong>
            <small>Private · Tailscale</small>
          </div>
          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
          >
            Log out
          </button>
        </div>
      </aside>
      <section className="content">
        <header className="topbar">
          <div className="mobile-brand">
            <span className="brand-mark">o</span> lumen
          </div>
          <label className="search">
            <span>⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search your memories"
            />
            <kbd>⌘ K</kbd>
          </label>
          <div className="top-actions">
            <button className="icon-button" aria-label="Notifications">
              ♧
            </button>
            <label className="upload-button">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleUpload}
              />{" "}
              <span>↑</span> Add photos
            </label>
          </div>
        </header>
        <div className="page-content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                {activeView === "Library" ? "All memories" : "Collection"}
              </p>
              <h1>{activeView}</h1>
              <p className="subtitle">
                {activeView === "Library"
                  ? "Your photos, safe and sound."
                  : "A curated collection of your memories."}
              </p>
            </div>
            <button className="sort-button">
              Newest first <span>⌄</span>
            </button>
          </div>
          {uploaded.length > 0 && (
            <div className="upload-note">
              <span>✓</span> Ready to index {uploaded.length} new{" "}
              {uploaded.length === 1 ? "photo" : "photos"}
              <button onClick={() => setUploaded([])}>Dismiss</button>
            </div>
          )}
          {activeView === "Albums" ? (
            <div className="album-grid">
              {(realAlbums.length > 0 ? realAlbums : albums).map(
                (album, index) => (
                  <article
                    className="album-card"
                    key={album.name}
                    onClick={() => "id" in album && openAlbum(album)}
                  >
                    <div
                      className="album-cover"
                      style={{
                        backgroundImage: `url(${"image" in album ? album.image : photos[index % photos.length].image})`,
                      }}
                    />
                    <div>
                      <h3>{album.name}</h3>
                      <p>{album.count} photos</p>
                    </div>
                  </article>
                ),
              )}
            </div>
          ) : (
            <>
              <div className="month-row">
                <h2>
                  {activeAlbumId
                    ? activeView
                    : activeView === "Favorites"
                      ? "Favorites"
                      : activeView === "Archive"
                        ? "Archive"
                        : "September"}{" "}
                  <span>2024</span>
                </h2>
                <span>{filteredPhotos.length} photos</span>
              </div>
              <div className="photo-grid">
                {filteredPhotos.map((photo, index) => (
                  <article
                    className={`photo-card photo-${index + 1}`}
                    key={photo.filename ?? photo.title}
                  >
                    <div
                      className="photo-image"
                      role="button"
                      tabIndex={photo.filename ? 0 : -1}
                      onClick={() => photo.filename && setSelectedPhoto(photo)}
                      onKeyDown={(event) =>
                        event.key === "Enter" &&
                        photo.filename &&
                        setSelectedPhoto(photo)
                      }
                      style={{ backgroundImage: `url(${photo.image})` }}
                    >
                      <button
                        className="favorite"
                        aria-label={`${photo.isFavorite ? "Remove from" : "Add to"} favorites`}
                        onClick={(event) => {
                          event.stopPropagation();
                          togglePhoto(
                            photo.filename,
                            "favorite",
                            !photo.isFavorite,
                            photo.title,
                          );
                        }}
                      >
                        {photo.isFavorite ? "♥" : "♡"}
                      </button>
                      {photo.filename && (
                        <div className="photo-actions">
                          <a
                            href={`/api/media/${encodeURIComponent(photo.filename)}?download=1`}
                            onClick={(event) => event.stopPropagation()}
                            aria-label={`Download ${photo.title}`}
                          >
                            ↓
                          </a>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              deletePhoto(photo.filename);
                            }}
                            aria-label={`Delete ${photo.title}`}
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="photo-meta">
                      <strong>{photo.title}</strong>
                      <span>
                        {photo.location} · {photo.date}
                      </span>
                      {realAlbums.length > 0 && photo.filename && (
                        <select
                          className="album-select"
                          defaultValue=""
                          onChange={(event) =>
                            addToAlbum(event.target.value, photo.filename)
                          }
                          aria-label={`Add ${photo.title} to an album`}
                        >
                          <option value="">Add to album</option>
                          {realAlbums.map((album) => (
                            <option value={album.id} key={album.id}>
                              {album.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </article>
                ))}
              </div>
              {filteredPhotos.length === 0 && (
                <div className="empty-state">
                  <span>⌕</span>
                  <h3>No memories found</h3>
                  <p>Try searching for a place or moment.</p>
                </div>
              )}
              {activeView === "Library" && (
                <>
                  <div className="month-row second-month">
                    <h2>
                      August <span>2024</span>
                    </h2>
                    <span>218 photos</span>
                  </div>
                  <div className="memory-strip">
                    <div
                      style={{ backgroundImage: `url(${photos[1].image})` }}
                    />
                    <div
                      style={{ backgroundImage: `url(${photos[3].image})` }}
                    />
                    <div
                      style={{ backgroundImage: `url(${photos[5].image})` }}
                    />
                    <div className="more-memory">+ 215 more</div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </section>
      {selectedPhoto && (
        <div
          className="detail-backdrop"
          role="presentation"
          onClick={() => setSelectedPhoto(null)}
        >
          <section
            className="detail-panel"
            role="dialog"
            aria-modal="true"
            aria-label={selectedPhoto.title}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="detail-close"
              onClick={() => setSelectedPhoto(null)}
              aria-label="Close photo detail"
            >
              ×
            </button>
            <button
              className="detail-nav detail-prev"
              onClick={() => moveSelection(-1)}
              disabled={filteredPhotos.length < 2}
              aria-label="Previous photo"
            >
              ‹
            </button>
            <div
              className="detail-image"
              style={{
                backgroundImage: `url(${selectedPhoto.originalUrl ?? selectedPhoto.image})`,
              }}
            />
            <button
              className="detail-nav detail-next"
              onClick={() => moveSelection(1)}
              disabled={filteredPhotos.length < 2}
              aria-label="Next photo"
            >
              ›
            </button>
            <div className="detail-info">
              <div>
                <p className="eyebrow">
                  Photo details · {selectedIndex + 1} of {filteredPhotos.length}
                </p>
                <h2>{selectedPhoto.title}</h2>
                <div className="detail-facts">
                  <p>
                    <strong>Source</strong>
                    {selectedPhoto.source ?? "Sample library"}
                  </p>
                  <p>
                    <strong>Captured</strong>
                    {selectedPhoto.date} · {selectedPhoto.location}
                  </p>
                  <p>
                    <strong>Uploaded</strong>
                    {selectedPhoto.createdAt
                      ? new Date(selectedPhoto.createdAt).toLocaleString()
                      : "Not available"}
                  </p>
                  <p>
                    <strong>Filename</strong>
                    {selectedPhoto.originalName ?? "Sample image"}
                  </p>
                  <p>
                    <strong>Type</strong>
                    {selectedPhoto.mimeType ?? "Remote sample"}
                    {selectedPhoto.size ? ` · ${formatBytes(selectedPhoto.size)}` : ""}
                  </p>
                  <p>
                    <strong>Resolution</strong>
                    {selectedPhoto.width && selectedPhoto.height
                      ? `${selectedPhoto.width} × ${selectedPhoto.height}px`
                      : "Not available"}
                  </p>
                  <p>
                    <strong>Camera</strong>
                    {selectedPhoto.cameraModel ?? "Not available"}
                  </p>
                  <p>
                    <strong>GPS</strong>
                    {typeof selectedPhoto.latitude === "number" &&
                    typeof selectedPhoto.longitude === "number"
                      ? `${selectedPhoto.latitude.toFixed(5)}, ${selectedPhoto.longitude.toFixed(5)}`
                      : "Not available"}
                  </p>
                </div>
              </div>
              <div className="detail-actions">
                <a
                  href={`/api/media/${encodeURIComponent(selectedPhoto.filename ?? "")}?download=1`}
                >
                  Download
                </a>
                <button
                  onClick={() =>
                    togglePhoto(
                      selectedPhoto.filename,
                      "favorite",
                      !selectedPhoto.isFavorite,
                    )
                  }
                >
                  {selectedPhoto.isFavorite ? "Remove favorite" : "Favorite"}
                </button>
                <button
                  className="danger-action"
                  onClick={() => deletePhoto(selectedPhoto.filename)}
                >
                  Delete
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
