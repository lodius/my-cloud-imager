import Database from "better-sqlite3";
import path from "node:path";

export type PhotoRecord = {
  id: number;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  capturedAt: string;
  createdAt: string;
  thumbnailFilename?: string;
  cameraModel?: string;
  latitude?: number;
  longitude?: number;
  checksum?: string;
  isFavorite?: boolean;
  isArchived?: boolean;
};

type PhotoRow = PhotoRecord;

const databasePath = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "lumen.db");
const database = new Database(databasePath);
database.pragma("journal_mode = WAL");
database.exec(`
  CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL UNIQUE,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    captured_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`);
  const columns = database.prepare("PRAGMA table_info(photos)").all() as { name: string }[];
  if (!columns.some((column) => column.name === "thumbnail_filename")) {
    database.exec("ALTER TABLE photos ADD COLUMN thumbnail_filename TEXT");
  }
  if (!columns.some((column) => column.name === "camera_model")) database.exec("ALTER TABLE photos ADD COLUMN camera_model TEXT");
  if (!columns.some((column) => column.name === "latitude")) database.exec("ALTER TABLE photos ADD COLUMN latitude REAL");
  if (!columns.some((column) => column.name === "longitude")) database.exec("ALTER TABLE photos ADD COLUMN longitude REAL");
  if (!columns.some((column) => column.name === "checksum")) database.exec("ALTER TABLE photos ADD COLUMN checksum TEXT");
  if (!columns.some((column) => column.name === "is_favorite")) database.exec("ALTER TABLE photos ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0");
  if (!columns.some((column) => column.name === "is_archived")) database.exec("ALTER TABLE photos ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0");
  if (!columns.some((column) => column.name === "width")) database.exec("ALTER TABLE photos ADD COLUMN width INTEGER");
  if (!columns.some((column) => column.name === "height")) database.exec("ALTER TABLE photos ADD COLUMN height INTEGER");
  database.exec("CREATE UNIQUE INDEX IF NOT EXISTS photos_checksum_unique ON photos(checksum) WHERE checksum IS NOT NULL");
  database.exec("CREATE TABLE IF NOT EXISTS albums (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL)");
  database.exec("CREATE TABLE IF NOT EXISTS album_photos (album_id INTEGER NOT NULL REFERENCES albums(id) ON DELETE CASCADE, photo_id INTEGER NOT NULL REFERENCES photos(id) ON DELETE CASCADE, PRIMARY KEY (album_id, photo_id))");

export function insertPhoto(photo: Omit<PhotoRecord, "id">) {
  const statement = database.prepare(`
    INSERT INTO photos (filename, original_name, mime_type, size, width, height, captured_at, created_at, thumbnail_filename, camera_model, latitude, longitude, checksum)
    VALUES (@filename, @originalName, @mimeType, @size, @width, @height, @capturedAt, @createdAt, @thumbnailFilename, @cameraModel, @latitude, @longitude, @checksum)
  `);
  return statement.run(photo);
}

export function listPhotos(): PhotoRecord[] {
  return database.prepare("SELECT id, filename, original_name AS originalName, mime_type AS mimeType, size, width, height, captured_at AS capturedAt, created_at AS createdAt, thumbnail_filename AS thumbnailFilename, camera_model AS cameraModel, latitude, longitude, checksum, is_favorite AS isFavorite, is_archived AS isArchived FROM photos ORDER BY captured_at DESC, id DESC").all().map((photo) => ({ ...photo as PhotoRow, isFavorite: Boolean((photo as PhotoRow & { is_favorite?: number }).isFavorite), isArchived: Boolean((photo as PhotoRow & { is_archived?: number }).isArchived) }));
}

export function updatePhotoState(filename: string, field: "is_favorite" | "is_archived", value: boolean) {
  return database.prepare(`UPDATE photos SET ${field} = ? WHERE filename = ?`).run(value ? 1 : 0, filename);
}

export function deletePhoto(filename: string) {
  const remove = database.transaction(() => {
    const photo = getPhotoByFilename(filename);
    if (!photo) return false;
    database.prepare("DELETE FROM album_photos WHERE photo_id = ?").run(photo.id);
    database.prepare("DELETE FROM photos WHERE id = ?").run(photo.id);
    return true;
  });
  return remove();
}

export function listAlbums() {
  return database.prepare("SELECT albums.id, albums.name, COUNT(album_photos.photo_id) AS count FROM albums LEFT JOIN album_photos ON album_photos.album_id = albums.id GROUP BY albums.id ORDER BY albums.created_at DESC").all();
}

export function getAlbum(id: number) {
  return database.prepare("SELECT id, name FROM albums WHERE id = ?").get(id) as { id: number; name: string } | undefined;
}

export function listAlbumPhotos(id: number): PhotoRecord[] {
  return database.prepare("SELECT photos.id, photos.filename, photos.original_name AS originalName, photos.mime_type AS mimeType, photos.size, photos.width, photos.height, photos.captured_at AS capturedAt, photos.created_at AS createdAt, photos.thumbnail_filename AS thumbnailFilename, photos.camera_model AS cameraModel, photos.latitude, photos.longitude, photos.checksum, photos.is_favorite AS isFavorite, photos.is_archived AS isArchived FROM photos INNER JOIN album_photos ON album_photos.photo_id = photos.id WHERE album_photos.album_id = ? ORDER BY photos.captured_at DESC, photos.id DESC").all(id).map((photo) => ({ ...photo as PhotoRow, isFavorite: Boolean((photo as PhotoRow & { isFavorite?: number }).isFavorite), isArchived: Boolean((photo as PhotoRow & { isArchived?: number }).isArchived) }));
}

export function addPhotoToAlbum(albumId: number, filename: string) {
  return database.prepare("INSERT OR IGNORE INTO album_photos (album_id, photo_id) SELECT ?, id FROM photos WHERE filename = ?").run(albumId, filename);
}

export function createAlbum(name: string) {
  return database.prepare("INSERT INTO albums (name, created_at) VALUES (?, ?)").run(name.trim(), new Date().toISOString());
}

export function getPhotoByChecksum(checksum: string): PhotoRecord | undefined {
  return database.prepare("SELECT id, filename, original_name AS originalName, mime_type AS mimeType, size, width, height, captured_at AS capturedAt, created_at AS createdAt, thumbnail_filename AS thumbnailFilename, camera_model AS cameraModel, latitude, longitude, checksum FROM photos WHERE checksum = ?").get(checksum) as PhotoRow | undefined;
}

export function getPhotoByFilename(filename: string): PhotoRecord | undefined {
  return database.prepare("SELECT id, filename, original_name AS originalName, mime_type AS mimeType, size, width, height, captured_at AS capturedAt, created_at AS createdAt, thumbnail_filename AS thumbnailFilename, camera_model AS cameraModel, latitude, longitude, checksum, is_favorite AS isFavorite, is_archived AS isArchived FROM photos WHERE filename = ?").get(filename) as PhotoRow | undefined;
}
