import type { Arcade, Lap, Machine, SyncMeta } from "../types";
import type { DataSnapshot } from "../utils/migrate";

/**
 * Last-write-wins between two versions of the same record. A missing
 * `updatedAt` is treated as the oldest possible (pre-sync data loses to any
 * stamped record). Ties resolve to the tombstone — deletes are sticky — which
 * also keeps the merge order-independent for equal timestamps.
 */
const newer = <T extends SyncMeta>(a: T, b: T): T => {
  const ta = a.updatedAt ?? "";
  const tb = b.updatedAt ?? "";
  if (tb > ta) return b;
  if (ta > tb) return a;
  // Equal timestamps: prefer a deletion so a delete never loses to a concurrent edit.
  if (b.deletedAt && !a.deletedAt) return b;
  return a;
};

/** Union two machine lists, resolving same-id machines by last-write-wins. */
const mergeMachines = (a: Machine[], b: Machine[]): Machine[] => {
  const byId = new Map<string, Machine>();
  for (const m of a) byId.set(m.id, m);
  for (const m of b) {
    const existing = byId.get(m.id);
    byId.set(m.id, existing ? newer(existing, m) : m);
  }
  return Array.from(byId.values());
};

/**
 * Merge two versions of the same arcade: scalar fields (name, metadata,
 * tombstone) follow last-write-wins, but the machine list is always unioned so
 * an edit on one device never drops a machine added on the other.
 */
const mergeArcade = (a: Arcade, b: Arcade): Arcade => ({
  ...newer(a, b),
  machines: mergeMachines(a.machines, b.machines),
});

/** Union two id-keyed record lists, combining same-id entries. */
const mergeRecords = <T extends SyncMeta & { id: string }>(
  a: T[],
  b: T[],
  combine: (x: T, y: T) => T,
): T[] => {
  const byId = new Map<string, T>();
  for (const item of a) byId.set(item.id, item);
  for (const item of b) {
    const existing = byId.get(item.id);
    byId.set(item.id, existing ? combine(existing, item) : item);
  }
  return Array.from(byId.values());
};

/**
 * Merge two full data snapshots into one. Pure and intended to be:
 * - convergent: tombstones beat older live records (no resurrection),
 * - idempotent: `mergeState(a, a)` deep-equals `a`,
 * - order-independent for distinct timestamps.
 *
 * Laps are append-only, so same-id collisions just take the newer copy.
 */
export const mergeState = (
  local: DataSnapshot,
  remote: DataSnapshot,
): DataSnapshot => ({
  arcades: mergeRecords<Arcade>(local.arcades, remote.arcades, mergeArcade),
  laps: mergeRecords<Lap>(local.laps, remote.laps, newer),
});
