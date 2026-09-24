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
  year?: number;
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
  capturedAt?: string;
  cameraModel?: string;
  latitude?: number;
  longitude?: number;
  isFavorite?: boolean;
  isArchived?: boolean;
};
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
type AlbumRecord = { id: number; name: string; count: number; createdAt?: string; updatedAt?: string; coverUrls?: string[] };
type StorageInfo = {
  totalBytes: number;
  usedBytes: number;
  mediaBytes: number;
  appBytes: number;
  percentUsed: number;
  mediaPercent: number;
  mediaRoot: string;
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
    year: new Date(photo.capturedAt).getFullYear(),
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
    capturedAt: photo.capturedAt,
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
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [storedPhotos, setStoredPhotos] = useState<GalleryPhoto[]>([]);
  const [albumPhotos, setAlbumPhotos] = useState<GalleryPhoto[]>([]);
  const [realAlbums, setRealAlbums] = useState<AlbumRecord[]>([]);
  const [activeAlbumId, setActiveAlbumId] = useState<number | null>(null);
  const [activeAlbum, setActiveAlbum] = useState<AlbumRecord | null>(null);
  const [albumMessage, setAlbumMessage] = useState<string | null>(null);
  const [showAlbumPicker, setShowAlbumPicker] = useState(false);
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [authConfigured, setAuthConfigured] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    const savedTheme = window.localStorage.getItem("lumen-theme") as "light" | "dark" | null;
    return savedTheme ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    window.localStorage.setItem("lumen-theme", nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }
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
            .then((data) => {
              setStoredPhotos(data.photos.map((photo: StoredPhoto) => toGalleryPhoto(photo)));
            });
        }
      })
      .catch(() => setAuthLoading(false));
  }, []);
  const galleryPhotos = activeAlbumId !== null ? albumPhotos : storedPhotos;
  const favoriteCount = storedPhotos.filter((photo) => photo.isFavorite).length;
  const archiveCount = storedPhotos.filter((photo) => photo.isArchived).length;
  const libraryCount = storedPhotos.filter((photo) => !photo.isArchived).length;
  const albumCandidates = activeAlbumId !== null
    ? storedPhotos.filter((photo) => !albumPhotos.some((member) => member.filename === photo.filename))
    : [];
  const collectionCandidates = activeView === "Favorites"
    ? storedPhotos.filter((photo) => !photo.isFavorite)
    : activeView === "Archive"
      ? storedPhotos.filter((photo) => !photo.isArchived)
      : [];
  const viewPhotos =
    activeView === "Favorites"
      ? galleryPhotos.filter((photo) => photo.isFavorite)
      : activeView === "Archive"
        ? galleryPhotos.filter((photo) => photo.isArchived)
        : galleryPhotos.filter((photo) => !photo.isArchived);
  const filteredPhotos = useMemo(() => {
    const matchingPhotos = viewPhotos.filter((photo) =>
      `${photo.title} ${photo.location}`.toLowerCase().includes(query.toLowerCase()),
    );
    return [...matchingPhotos].sort((left, right) => {
      const leftDate = Date.parse(left.capturedAt ?? left.createdAt ?? left.date);
      const rightDate = Date.parse(right.capturedAt ?? right.createdAt ?? right.date);
      return sortOrder === "newest" ? rightDate - leftDate : leftDate - rightDate;
    });
  }, [viewPhotos, query, sortOrder]);
  const yearGroups = useMemo(() => {
    const groups = new Map<number, GalleryPhoto[]>();
    filteredPhotos.forEach((photo) => {
      const year = photo.year ?? Number(photo.date.slice(-4));
      const group = groups.get(year) ?? [];
      group.push(photo);
      groups.set(year, group);
    });
    return Array.from(groups.entries()).sort(([left], [right]) => right - left);
  }, [filteredPhotos]);
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
      event.target.value = "";
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });
    if (response.ok) {
      const result = await response.json();
      const savedCount = result.saved?.length ?? 0;
      const duplicateCount = result.duplicates?.length ?? 0;
      setUploadMessage(`${savedCount} uploaded${duplicateCount ? ` · ${duplicateCount} duplicate${duplicateCount === 1 ? "" : "s"} skipped` : ""}`);
      setUploaded((current) => [...(result.saved ?? []), ...current]);
      const refreshed = await fetch("/api/photos");
      const data = await refreshed.json();
      setStoredPhotos(
        data.photos.map((photo: StoredPhoto) => toGalleryPhoto(photo)),
      );
    } else {
      const result = await response.json().catch(() => ({}));
      setUploadMessage(result.error ?? "Upload failed");
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
  ) {
    if (!filename) return;
    const response = await fetch(
      `/api/photos/${encodeURIComponent(filename)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, value }),
      },
    );
    if (response.ok) {
      const applyUpdate = (photo: GalleryPhoto) =>
        photo.filename === filename
          ? {
              ...photo,
              ...(action === "favorite"
                ? { isFavorite: value }
                : { isArchived: value }),
            }
          : photo;
      setStoredPhotos((current) => current.map(applyUpdate));
      setAlbumPhotos((current) => current.map(applyUpdate));
      setSelectedPhoto((current) =>
        current?.filename === filename ? applyUpdate(current) : current,
      );
    }
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
      setAlbumPhotos((current) =>
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
    setActiveAlbum(album);
    const response = await fetch(`/api/albums/${album.id}`);
    if (!response.ok) return;
    const data = await response.json();
    setActiveAlbum({ ...album, ...data.album });
    setAlbumPhotos(
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
    if (response.ok) {
      setAlbumMessage("Photo added to album");
      const albums = await fetch("/api/albums").then((result) => result.json());
      setRealAlbums(albums.albums);
      if (activeAlbumId === Number(albumId)) setActiveAlbum(albums.albums.find((album: AlbumRecord) => album.id === Number(albumId)) ?? null);
    } else {
      const data = await response.json().catch(() => ({}));
      setAlbumMessage(data.error ?? "Could not add photo to album");
    }
  }
  async function removeFromAlbum(filename: string | undefined) {
    if (!filename || activeAlbumId === null) return;
    const response = await fetch(`/api/albums/${activeAlbumId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename }),
    });
    if (response.ok) {
      setAlbumMessage("Photo removed from album");
      setAlbumPhotos((current) =>
        current.filter((photo) => photo.filename !== filename),
      );
      const albums = await fetch("/api/albums").then((result) => result.json());
      setRealAlbums(albums.albums);
      setActiveAlbum(albums.albums.find((album: AlbumRecord) => album.id === activeAlbumId) ?? null);
    } else {
      const data = await response.json().catch(() => ({}));
      setAlbumMessage(data.error ?? "Could not remove photo from album");
    }
  }
  async function addSelectedPhotosToAlbum(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activeAlbumId === null) return;
    const formData = new FormData(event.currentTarget);
    const filenames = formData.getAll("album-photos").filter((value): value is string => typeof value === "string");
    for (const filename of filenames) await addToAlbum(String(activeAlbumId), filename);
    const activeAlbum = realAlbums.find((album) => album.id === activeAlbumId);
    if (activeAlbum) await openAlbum(activeAlbum);
    setShowAlbumPicker(false);
  }
  async function addSelectedPhotosToCollection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const filenames = formData.getAll("collection-photos").filter((value): value is string => typeof value === "string");
    const action = activeView === "Favorites" ? "favorite" : "archive";
    for (const filename of filenames) await togglePhoto(filename, action, true);
    setShowCollectionPicker(false);
    if (filenames.length > 0) setAlbumMessage(`${filenames.length} photo${filenames.length === 1 ? "" : "s"} added to ${activeView.toLowerCase()}`);
  }
  async function deleteAlbumById(albumId: number) {
    if (!window.confirm("Delete this album? Photos will not be deleted."))
      return;
    const response = await fetch(`/api/albums/${albumId}`, {
      method: "DELETE",
    });
    if (response.ok) {
      setRealAlbums((current) =>
        current.filter((album) => album.id !== albumId),
      );
      if (activeAlbumId === albumId) {
        setActiveAlbumId(null);
        setActiveAlbum(null);
        setAlbumPhotos([]);
        setActiveView("Library");
      }
    }
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
              onClick={() => {
                setActiveAlbumId(null);
                setActiveAlbum(null);
                setAlbumMessage(null);
                setActiveView(view);
              }}
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
              {view === "Library" && <span className="nav-count">{libraryCount}</span>}
              {view === "Albums" && <span className="nav-count">{realAlbums.length}</span>}
              {view === "Favorites" && <span className="nav-count">{favoriteCount}</span>}
              {view === "Archive" && <span className="nav-count">{archiveCount}</span>}
            </button>
          ))}
        </div>
        <div className="side-section">
          <div className="section-heading">
            <p className="eyebrow">Albums</p>
            <button
              className="plus-button"
              aria-label="Create album"
              data-tooltip="Create album"
              onClick={createNewAlbum}
            >
              +
            </button>
          </div>
          {realAlbums.map((album) => (
            <button
              className="mini-album"
              key={album.name}
              onClick={() => openAlbum(album)}
            >
              <span className={`mini-thumb ${album.coverUrls?.length ? "has-cover" : "empty-cover"}`} style={album.coverUrls?.[0] ? { backgroundImage: `url(${album.coverUrls[0]})` } : undefined} />
              <span>{album.name}</span>
              <small>{album.count}</small>
            </button>
          ))}
        </div>
        <div className="storage-card">
          <div className="storage-top">
            <span>Device storage</span>
            <strong>
              {storageInfo ? `${storageInfo.percentUsed}%` : "--"}
            </strong>
          </div>
          <div className="storage-bar">
            <span style={{ width: `${storageInfo?.percentUsed ?? 0}%` }} />
          </div>
          <p>
            {storageInfo
                  ? `Device: ${formatBytes(storageInfo.usedBytes)} of ${formatBytes(storageInfo.totalBytes)}`
              : "Storage information unavailable"}
          </p>
                {storageInfo && <small className="volume-usage">Photos path: {storageInfo.mediaRoot}<br />Uploaded photos: {formatBytes(storageInfo.mediaBytes)} · Lumen app: {formatBytes(storageInfo.appBytes)}</small>}
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
            <button className="icon-button" aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"} data-tooltip={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"} onClick={toggleTheme}>
              {theme === "dark" ? "☼" : "☾"}
            </button>
            <button className="icon-button" aria-label="Notifications" data-tooltip="Notifications">
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
                  : activeAlbum
                    ? `Created ${activeAlbum.createdAt ? new Date(activeAlbum.createdAt).toLocaleDateString() : "Not available"} · Updated ${activeAlbum.updatedAt ? new Date(activeAlbum.updatedAt).toLocaleDateString() : "Not available"}`
                    : "A curated collection of your memories."}
              </p>
            </div>
            <button className="sort-button" onClick={() => setSortOrder((current) => current === "newest" ? "oldest" : "newest")}>
              {sortOrder === "newest" ? "Newest first" : "Oldest first"} <span>⌄</span>
            </button>
          </div>
          {activeAlbumId !== null && (
            <div className="album-toolbar">
              <button type="button" className="album-add-button" onClick={() => setShowAlbumPicker((current) => !current)}>
                + Add existing photos
              </button>
              <button type="button" className="delete-album-button" onClick={() => deleteAlbumById(activeAlbumId)}>
                Delete album
              </button>
            </div>
          )}
          {activeAlbumId !== null && showAlbumPicker && (
            <form className="album-picker" onSubmit={addSelectedPhotosToAlbum}>
              <div className="album-picker-header"><strong>Add photos to {activeView}</strong><button type="button" onClick={() => setShowAlbumPicker(false)} aria-label="Close add photos" data-tooltip="Close photo picker">×</button></div>
              {albumCandidates.length > 0 ? <>
                <div className="album-picker-grid">{albumCandidates.map((photo) => <label className="album-picker-item" key={photo.filename}><input type="checkbox" name="album-photos" value={photo.filename} /><span className="picker-thumb" style={{ backgroundImage: `url(${photo.image})` }} /><span>{photo.title}</span></label>)}</div>
                <button className="album-picker-submit" type="submit">Add selected photos</button>
              </> : <p className="album-picker-empty">All uploaded photos are already in this album.</p>}
            </form>
          )}
          {activeAlbumId === null && (activeView === "Favorites" || activeView === "Archive") && (
            <>
              <div className="album-toolbar collection-toolbar">
                <button type="button" className="album-add-button" onClick={() => setShowCollectionPicker((current) => !current)}>
                  + Add existing photos
                </button>
              </div>
              {showCollectionPicker && (
                <form className="album-picker" onSubmit={addSelectedPhotosToCollection}>
                  <div className="album-picker-header"><strong>Add photos to {activeView}</strong><button type="button" onClick={() => setShowCollectionPicker(false)} aria-label="Close photo picker" data-tooltip="Close photo picker">×</button></div>
                  {collectionCandidates.length > 0 ? <>
                    <div className="album-picker-grid">{collectionCandidates.map((photo) => <label className="album-picker-item" key={photo.filename}><input type="checkbox" name="collection-photos" value={photo.filename} /><span className="picker-thumb" style={{ backgroundImage: `url(${photo.image})` }} /><span>{photo.title}</span></label>)}</div>
                    <button className="album-picker-submit" type="submit">Add selected photos</button>
                  </> : <p className="album-picker-empty">All uploaded photos are already in this view.</p>}
                </form>
              )}
            </>
          )}
          {uploaded.length > 0 && (
            <div className="upload-note">
              <span>✓</span> Uploaded {uploaded.length} new{" "}
              {uploaded.length === 1 ? "photo" : "photos"}
              <button onClick={() => setUploaded([])}>Dismiss</button>
            </div>
          )}
          {uploadMessage && (
            <div className="upload-note" role="status">
              <span>i</span> {uploadMessage}
              <button type="button" onClick={() => setUploadMessage(null)} aria-label="Dismiss upload result" data-tooltip="Dismiss upload result">×</button>
            </div>
          )}
          {albumMessage && (
            <div className="album-message" role="status">
              <span>{albumMessage}</span>
              <button type="button" onClick={() => setAlbumMessage(null)} aria-label="Dismiss album message" data-tooltip="Dismiss message">×</button>
            </div>
          )}
          {activeView === "Albums" ? (
            <div className={realAlbums.length > 0 ? "album-grid" : "empty-state"}>
              {realAlbums.length > 0 ? realAlbums.map(
                (album) => (
                  <article
                    className="album-card"
                    key={album.name}
                    onClick={() => "id" in album && openAlbum(album)}
                  >
                    <div className={`album-cover ${album.coverUrls?.length ? "has-cover" : "empty-cover"}`}>
                      {album.coverUrls?.map((coverUrl) => <span key={coverUrl} style={{ backgroundImage: `url(${coverUrl})` }} />)}
                    </div>
                    <div>
                      <h3>{album.name}</h3>
                      <p>{album.count} photos</p>
                    </div>
                    {"id" in album && (
                      <button
                        type="button"
                        className="album-delete"
                        aria-label={`Delete ${album.name}`}
                        data-tooltip={`Delete ${album.name}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          deleteAlbumById(album.id);
                        }}
                      >
                        ×
                      </button>
                    )}
                  </article>
                ),
              ) : <><span>▦</span><h3>No albums yet</h3><p>Create an album with the + button.</p></>}
            </div>
          ) : (
            <>
              {yearGroups.map(([year, yearPhotos]) => <section className="year-group" key={year}>
              <div className="month-row">
                <h2>{year}</h2>
                <span>{yearPhotos.length} photos</span>
              </div>
              <div className="photo-grid">
                {yearPhotos.map((photo, index) => (
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
                        data-tooltip={`${photo.isFavorite ? "Remove from" : "Add to"} favorites`}
                        onClick={(event) => {
                          event.stopPropagation();
                          togglePhoto(
                            photo.filename,
                            "favorite",
                            !photo.isFavorite,
                          );
                        }}
                      >
                        {photo.isFavorite ? "♥" : "♡"}
                      </button>
                      {photo.filename && (
                        <div className={`photo-actions ${activeAlbumId !== null ? "album-actions" : ""}`}>
                          <a
                            href={`/api/media/${encodeURIComponent(photo.filename)}?download=1`}
                            onClick={(event) => event.stopPropagation()}
                            aria-label={`Download ${photo.title}`}
                            data-tooltip="Download original photo"
                          >
                            ↓
                          </a>
                          {activeAlbumId !== null && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                removeFromAlbum(photo.filename);
                              }}
                              aria-label={`Remove ${photo.title} from this album`}
                              data-tooltip="Remove from album"
                            >
                              ⊘
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              togglePhoto(photo.filename, "archive", !photo.isArchived);
                            }}
                            aria-label={photo.isArchived ? `Restore ${photo.title}` : `Archive ${photo.title}`}
                            data-tooltip={photo.isArchived ? "Restore from archive" : "Archive photo"}
                          >
                            {photo.isArchived ? "↶" : "⌁"}
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              deletePhoto(photo.filename);
                            }}
                            aria-label={`Delete ${photo.title}`}
                            data-tooltip="Delete photo"
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
              </section>)}
              {filteredPhotos.length === 0 && (
                <div className="empty-state">
                  <span>⌕</span>
                  <h3>No memories found</h3>
                  <p>Try searching for a place or moment.</p>
                </div>
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
              data-tooltip="Close preview"
            >
              ×
            </button>
            <button
              className="detail-nav detail-prev"
              onClick={() => moveSelection(-1)}
              disabled={filteredPhotos.length < 2}
              aria-label="Previous photo"
              data-tooltip="Previous photo"
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
              data-tooltip="Next photo"
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
                    {selectedPhoto.source ?? "Local upload"}
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
                    {selectedPhoto.mimeType ?? "Not available"}
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
                  onClick={() =>
                    togglePhoto(
                      selectedPhoto.filename,
                      "archive",
                      !selectedPhoto.isArchived,
                    )
                  }
                >
                  {selectedPhoto.isArchived ? "Restore from archive" : "Archive"}
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
