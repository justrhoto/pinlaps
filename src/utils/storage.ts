import { Arcade, Lap } from "../types";

const ARCADES_KEY = "pinball_arcades";
const LAPS_KEY = "pinball_laps";

export const storage = {
  getArcades: (): Arcade[] => {
    const data = localStorage.getItem(ARCADES_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveArcades: (arcades: Arcade[]): void => {
    localStorage.setItem(ARCADES_KEY, JSON.stringify(arcades));
  },

  getLaps: (): Lap[] => {
    const data = localStorage.getItem(LAPS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveLaps: (laps: Lap[]): void => {
    localStorage.setItem(LAPS_KEY, JSON.stringify(laps));
  },
};
