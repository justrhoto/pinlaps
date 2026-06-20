import type { Arcade, Lap } from "../types";

export const BACKUP_VERSION = 1;

export interface Backup {
  app: "pinlaps";
  version: number;
  exportedAt: string;
  arcades: Arcade[];
  laps: Lap[];
}

export interface BackupData {
  arcades: Arcade[];
  laps: Lap[];
}

/** Build a versioned backup payload from the current data. */
export const createBackup = (arcades: Arcade[], laps: Lap[]): Backup => ({
  app: "pinlaps",
  version: BACKUP_VERSION,
  exportedAt: new Date().toISOString(),
  arcades,
  laps,
});

/** Serialize a backup to a pretty-printed JSON string. */
export const serializeBackup = (arcades: Arcade[], laps: Lap[]): string => {
  return JSON.stringify(createBackup(arcades, laps), null, 2);
};

const isArcade = (value: unknown): value is Arcade => {
  if (typeof value !== "object" || value === null) return false;
  const a = value as Record<string, unknown>;
  return (
    typeof a.id === "string" &&
    typeof a.name === "string" &&
    Array.isArray(a.machines)
  );
};

const isLap = (value: unknown): value is Lap => {
  if (typeof value !== "object" || value === null) return false;
  const l = value as Record<string, unknown>;
  return (
    typeof l.id === "string" &&
    typeof l.arcadeId === "string" &&
    Array.isArray(l.scores)
  );
};

/**
 * Parse and validate a backup file's contents. Throws an Error with a
 * user-facing message when the input is not a recognizable backup.
 */
export const parseBackup = (json: string): BackupData => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("File is not valid JSON.");
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Unrecognized backup file.");
  }

  const obj = parsed as Record<string, unknown>;
  if (!Array.isArray(obj.arcades) || !Array.isArray(obj.laps)) {
    throw new Error("Backup file is missing arcades or laps.");
  }
  if (!obj.arcades.every(isArcade)) {
    throw new Error("Backup file contains invalid arcade data.");
  }
  if (!obj.laps.every(isLap)) {
    throw new Error("Backup file contains invalid lap data.");
  }

  return { arcades: obj.arcades, laps: obj.laps };
};

/**
 * Merge two id-keyed lists. Existing order is preserved; incoming items with a
 * matching id overwrite the existing entry, and new ids are appended. Merging
 * makes restoring a backup idempotent and safe (never discards local data).
 */
export const mergeById = <T extends { id: string }>(
  existing: T[],
  incoming: T[],
): T[] => {
  const byId = new Map(existing.map((item) => [item.id, item]));
  for (const item of incoming) byId.set(item.id, item);
  return Array.from(byId.values());
};
