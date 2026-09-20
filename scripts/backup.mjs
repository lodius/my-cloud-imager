import { cp, mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import Database from "better-sqlite3";

const mediaRoot = process.env.MEDIA_ROOT ?? path.join(process.cwd(), "data", "photos");
const databasePath = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "lumen.db");
const backupRoot = process.env.BACKUP_ROOT;

if (!backupRoot) {
  throw new Error("BACKUP_ROOT is required. Set it to a separate disk or backup destination.");
}

await stat(mediaRoot);
await stat(databasePath);
await mkdir(backupRoot, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const finalDirectory = path.join(backupRoot, `lumen-${timestamp}`);
const temporaryDirectory = `${finalDirectory}.tmp`;
await rm(temporaryDirectory, { recursive: true, force: true });
await mkdir(temporaryDirectory, { recursive: true });

try {
  const backupDatabase = new Database(databasePath, { readonly: true });
  await backupDatabase.backup(path.join(temporaryDirectory, "lumen.db"));
  backupDatabase.close();
  await cp(mediaRoot, path.join(temporaryDirectory, "photos"), { recursive: true });

  const manifest = {
    createdAt: new Date().toISOString(),
    database: path.basename(databasePath),
    mediaRoot,
    contents: ["lumen.db", "photos/"],
  };
  await writeFile(path.join(temporaryDirectory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  await rename(temporaryDirectory, finalDirectory);
  console.log(`Backup created: ${finalDirectory}`);
} catch (error) {
  await rm(temporaryDirectory, { recursive: true, force: true });
  throw error;
}
