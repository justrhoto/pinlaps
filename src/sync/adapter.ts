import type { DataSnapshot } from "../utils/migrate";
import { mergeState } from "./merge";

/**
 * Transport-agnostic sync backend. The merge logic lives in {@link mergeState}
 * and stays independent of any adapter, so backends are swappable and the merge
 * is unit-testable without a network.
 */
export interface SyncAdapter {
  /** Whether a user is currently authenticated (sync is a no-op when false). */
  isAuthed(): boolean;
  /**
   * Fetch records changed since the given ISO timestamp (or everything when
   * omitted). Returning a delta keeps pulls cheap.
   */
  pull(since?: string): Promise<DataSnapshot>;
  /** Upsert the given changed records to the backend. */
  push(changes: DataSnapshot): Promise<void>;
}

/**
 * In-memory adapter for tests and local development. Holds a single snapshot;
 * `push` merges incoming changes the same way the backend would, and `pull`
 * returns records with `updatedAt` strictly after `since`.
 */
export const createMemoryAdapter = (
  initial: DataSnapshot = { arcades: [], laps: [] },
  authed = true,
): SyncAdapter & { snapshot: () => DataSnapshot } => {
  let store: DataSnapshot = initial;

  const after = (since?: string) => {
    if (!since) return store;
    return {
      arcades: store.arcades.filter((a) => (a.updatedAt ?? "") > since),
      laps: store.laps.filter((l) => (l.updatedAt ?? "") > since),
    };
  };

  return {
    isAuthed: () => authed,
    pull: async (since) => after(since),
    push: async (changes) => {
      store = mergeState(store, changes);
    },
    snapshot: () => store,
  };
};
