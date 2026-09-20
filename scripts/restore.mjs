import { cp, mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";

const backupPath = process.env.BACKUP_PATH;
const restoreRoot = process.env.RESTORE_ROOT;

if (!backupPath || !restoreRoot) {
  throw new Error("BACKUP_PATH and RESTORE_ROOT are required.");
}
if (process.env.RESTORE_CONFIRM !== "YES") {
  throw new Error("Set RESTORE_CONFIRM=YES to confirm replacing the restore destination.");
}

const databaseBackup = path.join(backupPath, "lumen.db");
const mediaBackup = path.join(backupPath, "photos");
await stat(databaseBackup);
await stat(mediaBackup);
if (path.resolve(backupPath) === path.resolve(restoreRoot)) {
  throw new Error("BACKUP_PATH and RESTORE_ROOT must be different directories.");
}

await mkdir(restoreRoot, { recursive: true });
const existingEntries = await readdir(restoreRoot);
if (existingEntries.length > 0 && process.env.RESTORE_ALLOW_NONEMPTY !== "YES") {
  throw new Error("RESTORE_ROOT is not empty. Set RESTORE_ALLOW_NONEMPTY=YES to replace its contents.");
}

await cp(databaseBackup, path.join(restoreRoot, "lumen.db"), { force: true });
await cp(mediaBackup, path.join(restoreRoot, "photos"), { recursive: true, force: true });
console.log(`Restore completed at: ${restoreRoot}`);
