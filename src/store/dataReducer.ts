import type { Arcade, Lap, Machine } from "../types";
import { mergeState } from "../sync/merge";

export interface DataState {
  arcades: Arcade[];
  laps: Lap[];
}

export type DataAction =
  | { type: "upsertArcade"; arcade: Arcade; now: string }
  | { type: "deleteArcade"; arcadeId: string; now: string }
  | { type: "addLap"; lap: Lap }
  | { type: "merge"; arcades: Arcade[]; laps: Lap[] };

/**
 * Reconcile a saved arcade against its previous state so the machine list stays
 * mergeable: bump `updatedAt` on the arcade and on changed/new machines (while
 * preserving the timestamp of untouched ones), and turn removed machines into
 * tombstones instead of dropping them — a dropped machine would be resurrected
 * by a cross-device union merge. Pure; `now` is supplied by the caller.
 */
export const reconcileArcade = (
  prev: Arcade | undefined,
  next: Arcade,
  now: string,
): Arcade => {
  const prevMachines = new Map((prev?.machines ?? []).map((m) => [m.id, m]));
  const nextIds = new Set(next.machines.map((m) => m.id));

  const machines: Machine[] = next.machines.map((m) => {
    const before = prevMachines.get(m.id);
    const unchanged = before != null && before.name === m.name && !before.deletedAt;
    // A live machine: drop any prior tombstone (a re-add revives it).
    return {
      id: m.id,
      name: m.name,
      updatedAt: unchanged ? (before.updatedAt ?? now) : now,
    };
  });

  // Carry forward machines that existed before but are absent now.
  for (const before of prev?.machines ?? []) {
    if (nextIds.has(before.id)) continue;
    machines.push(
      before.deletedAt ? before : { ...before, deletedAt: now, updatedAt: now },
    );
  }

  return { ...next, updatedAt: now, machines };
};

/** Pure state transitions for the app's arcade and lap data. */
export const dataReducer = (state: DataState, action: DataAction): DataState => {
  switch (action.type) {
    case "upsertArcade": {
      const prev = state.arcades.find((a) => a.id === action.arcade.id);
      const arcade = reconcileArcade(prev, action.arcade, action.now);
      const arcades = prev
        ? state.arcades.map((a) => (a.id === arcade.id ? arcade : a))
        : [...state.arcades, arcade];
      return { ...state, arcades };
    }
    case "deleteArcade": {
      const { arcadeId, now } = action;
      // Soft delete: tombstone the arcade and cascade to its laps so a merge
      // from another device can't resurrect them.
      return {
        arcades: state.arcades.map((a) =>
          a.id === arcadeId ? { ...a, deletedAt: now, updatedAt: now } : a,
        ),
        laps: state.laps.map((l) =>
          l.arcadeId === arcadeId ? { ...l, deletedAt: now, updatedAt: now } : l,
        ),
      };
    }
    case "addLap":
      return { ...state, laps: [...state.laps, action.lap] };
    case "merge":
      // Conflict-aware union: LWW on arcade fields, machine-list union, and
      // tombstones beat older live records (no resurrection on backup import).
      return mergeState(state, { arcades: action.arcades, laps: action.laps });
    default:
      return state;
  }
};
