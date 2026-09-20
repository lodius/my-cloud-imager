"use client";

  import { ChangeEvent, useMemo, useState } from "react";

  const photos = [
    { title: "The Dolomites", date: "Sep 08, 2024", location: "Italy", image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1000&q=85" },
    { title: "A quiet morning", date: "Sep 03, 2024", location: "Home", image: "https://images.unsplash.com/photo-1497250681960-ef046c08a56e?auto=format&fit=crop&w=1000&q=85" },
    { title: "Blue hour", date: "Aug 27, 2024", location: "Porto", image: "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1000&q=85" },
    { title: "Summer table", date: "Aug 21, 2024", location: "Lisbon", image: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1000&q=85" },
    { title: "Old town walk", date: "Aug 19, 2024", location: "Porto", image: "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=1000&q=85" },
    { title: "Late light", date: "Aug 12, 2024", location: "Home", image: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1000&q=85" },
    { title: "Coastal road", date: "Jul 30, 2024", location: "Portugal", image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1000&q=85" },
    { title: "Good company", date: "Jul 18, 2024", location: "Lisbon", image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1000&q=85" },
  ];
  const albums = [
    { name: "Summer 2024", count: 124, image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=500&q=80" },
    { name: "Portugal", count: 86, image: "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=500&q=80" },
    { name: "Favorites", count: 32, image: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=500&q=80" },
  ];

  export default function Home() {
    const [activeView, setActiveView] = useState("Library");
    const [query, setQuery] = useState("");
    const [uploaded, setUploaded] = useState<string[]>([]);
    const filteredPhotos = useMemo(() => photos.filter((photo) => `${photo.title} ${photo.location}`.toLowerCase().includes(query.toLowerCase())), [query]);
    async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
      const files = Array.from(event.target.files ?? []);
      if (files.length === 0) return;
      const formData = new FormData();
      files.forEach((file) => formData.append("photos", file));
      const response = await fetch("/api/upload", { method: "POST", body: formData });
      if (response.ok) setUploaded((current) => [...files.map((file) => file.name), ...current]);
    }

    return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">o</span><span>lumen</span></div>
      <div className="side-section"><p className="eyebrow">Your library</p>{["Library", "Albums", "Favorites", "Archive"].map((view) => <button className={`nav-item ${activeView === view ? "active" : ""}`} key={view} onClick={() => setActiveView(view)}><span className="nav-icon">{view === "Library" ? "◫" : view === "Albums" ? "▦" : view === "Favorites" ? "♡" : "⌁"}</span>{view}{view === "Library" && <span className="nav-count">2,481</span>}</button>)}</div>
      <div className="side-section"><div className="section-heading"><p className="eyebrow">Albums</p><button className="plus-button" aria-label="Create album">+</button></div>{albums.map((album) => <button className="mini-album" key={album.name} onClick={() => setActiveView(album.name)}><span className="mini-thumb" style={{ backgroundImage: `url(${album.image})` }} /><span>{album.name}</span><small>{album.count}</small></button>)}</div>
      <div className="storage-card"><div className="storage-top"><span>Storage</span><strong>42%</strong></div><div className="storage-bar"><span /></div><p>42.1 GB of 100 GB used</p><button>Manage storage <span>↗</span></button></div>
      <div className="profile"><div className="avatar">Q</div><div><strong>Quake&apos;s library</strong><small>Private · Tailscale</small></div><span className="more">•••</span></div>
    </aside>
    <section className="content">
      <header className="topbar"><div className="mobile-brand"><span className="brand-mark">o</span> lumen</div><label className="search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your memories" /><kbd>⌘ K</kbd></label><div className="top-actions"><button className="icon-button" aria-label="Notifications">♧</button><label className="upload-button"><input type="file" accept="image/*" multiple onChange={handleUpload} /> <span>↑</span> Add photos</label></div></header>
      <div className="page-content"><div className="page-heading"><div><p className="eyebrow">{activeView === "Library" ? "All memories" : "Collection"}</p><h1>{activeView}</h1><p className="subtitle">{activeView === "Library" ? "Your photos, safe and sound." : "A curated collection of your memories."}</p></div><button className="sort-button">Newest first <span>⌄</span></button></div>
      {uploaded.length > 0 && <div className="upload-note"><span>✓</span> Ready to index {uploaded.length} new {uploaded.length === 1 ? "photo" : "photos"}<button onClick={() => setUploaded([])}>Dismiss</button></div>}
      {activeView === "Albums" ? <div className="album-grid">{albums.map((album) => <article className="album-card" key={album.name}><div className="album-cover" style={{ backgroundImage: `url(${album.image})` }} /><div><h3>{album.name}</h3><p>{album.count} photos</p></div></article>)}</div> : <><div className="month-row"><h2>September <span>2024</span></h2><span>{filteredPhotos.length + 2} photos</span></div><div className="photo-grid">{filteredPhotos.map((photo, index) => <article className={`photo-card photo-${index + 1}`} key={photo.title}><div className="photo-image" style={{ backgroundImage: `url(${photo.image})` }}><button className="favorite" aria-label={`Favorite ${photo.title}`}>♡</button></div><div className="photo-meta"><strong>{photo.title}</strong><span>{photo.location} · {photo.date}</span></div></article>)}</div>{filteredPhotos.length === 0 && <div className="empty-state"><span>⌕</span><h3>No memories found</h3><p>Try searching for a place or moment.</p></div>}<div className="month-row second-month"><h2>August <span>2024</span></h2><span>218 photos</span></div><div className="memory-strip"><div style={{ backgroundImage: `url(${photos[1].image})` }} /><div style={{ backgroundImage: `url(${photos[3].image})` }} /><div style={{ backgroundImage: `url(${photos[5].image})` }} /><div className="more-memory">+ 215 more</div></div></>}
      </div>
      </section>
    </main>;
  }
