import { createContext, useContext } from "react";

/**
 * Overall sync status shown in the UI:
 * - `disabled`  — sync not configured (no Supabase env vars)
 * - `signedOut` — configured, but no user signed in
 * - `offline`   — signed in, but the device is offline
 * - `idle`      — signed in, online, nothing in flight
 * - `syncing`   — a pull/push cycle is running
 * - `error`     — the last cycle failed
 */
export type SyncState =
  | "disabled"
  | "signedOut"
  | "offline"
  | "idle"
  | "syncing"
  | "error";

export interface SyncContextValue {
  state: SyncState;
  /** Email of the signed-in user, when known. */
  email: string | null;
  /** ISO timestamp of the last successful sync, if any. */
  lastSyncedAt: string | null;
  signInWithEmail: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Trigger a sync cycle now (no-op when not signed in / offline). */
  syncNow: () => void;
}

export const SyncContext = createContext<SyncContextValue | null>(null);

export const useSync = (): SyncContextValue => {
  const context = useContext(SyncContext);
  if (context === null) {
    throw new Error("useSync must be used within a SyncProvider");
  }
  return context;
};
