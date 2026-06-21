import type { Arcade, Lap } from "../types";
import { mergeById } from "../utils/backup";

export interface DataState {
  arcades: Arcade[];
  laps: Lap[];
}

export type DataAction =
  | { type: "upsertArcade"; arcade: Arcade }
  | { type: "deleteArcade"; arcadeId: string }
  | { type: "addLap"; lap: Lap }
  | { type: "merge"; arcades: Arcade[]; laps: Lap[] };

/** Pure state transitions for the app's arcade and lap data. */
export const dataReducer = (state: DataState, action: DataAction): DataState => {
  switch (action.type) {
    case "upsertArcade": {
      const exists = state.arcades.some((a) => a.id === action.arcade.id);
      const arcades = exists
        ? state.arcades.map((a) =>
            a.id === action.arcade.id ? action.arcade : a,
          )
        : [...state.arcades, action.arcade];
      return { ...state, arcades };
    }
    case "deleteArcade":
      return {
        // Deleting an arcade cascades to its laps.
        arcades: state.arcades.filter((a) => a.id !== action.arcadeId),
        laps: state.laps.filter((l) => l.arcadeId !== action.arcadeId),
      };
    case "addLap":
      return { ...state, laps: [...state.laps, action.lap] };
    case "merge":
      return {
        arcades: mergeById(state.arcades, action.arcades),
        laps: mergeById(state.laps, action.laps),
      };
    default:
      return state;
  }
};
