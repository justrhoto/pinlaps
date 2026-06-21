import type { Arcade, Lap } from "../types";
import { migrateToV2, SCHEMA_VERSION } from "./migrate";
import type { DataSnapshot } from "./migrate";

const ARCADES_KEY = "pinball_arcades";
const LAPS_KEY = "pinball_laps";
const SCHEMA_KEY = "pinball_schema_version";

/** Read and parse a JSON value from localStorage, falling back on any failure. */
const readJSON = <T>(key: string, fallback: T): T => {
  try {
    const data = localStorage.getItem(key);
    return data ? (JSON.parse(data) as T) : fallback;
  } catch (error) {
    console.error(`Failed to read "${key}" from storage:`, error);
    return fallback;
  }
};

/** Serialize and persist a value to localStorage, swallowing write failures. */
const writeJSON = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to write "${key}" to storage:`, error);
  }
};

export const storage = {
  /**
   * Load the full data snapshot, running any pending schema migration first.
   * Migrating both arcades and laps together keeps id remaps and the lap
   * references that point at them consistent.
   */
  loadData: (): DataSnapshot => {
    const snapshot: DataSnapshot = {
      arcades: readJSON<Arcade[]>(ARCADES_KEY, []),
      laps: readJSON<Lap[]>(LAPS_KEY, []),
    };

    const version = readJSON<number>(SCHEMA_KEY, 1);
    if (version >= SCHEMA_VERSION) return snapshot;

    const migrated = migrateToV2(snapshot);
    writeJSON(ARCADES_KEY, migrated.arcades);
    writeJSON(LAPS_KEY, migrated.laps);
    writeJSON(SCHEMA_KEY, SCHEMA_VERSION);
    return migrated;
  },

  saveArcades: (arcades: Arcade[]): void => writeJSON(ARCADES_KEY, arcades),

  saveLaps: (laps: Lap[]): void => writeJSON(LAPS_KEY, laps),
};
