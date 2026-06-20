import type { Arcade, Lap } from "../types";

const ARCADES_KEY = "pinball_arcades";
const LAPS_KEY = "pinball_laps";

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
  getArcades: (): Arcade[] => readJSON<Arcade[]>(ARCADES_KEY, []),

  saveArcades: (arcades: Arcade[]): void => writeJSON(ARCADES_KEY, arcades),

  getLaps: (): Lap[] => readJSON<Lap[]>(LAPS_KEY, []),

  saveLaps: (laps: Lap[]): void => writeJSON(LAPS_KEY, laps),
};
