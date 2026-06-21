import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { useData } from "../store/dataContext";
import { createSupabaseAdapter } from "./supabaseAdapter";
import { isSyncConfigured, supabase } from "./supabaseClient";
import { mergeState } from "./merge";
import { SyncContext } from "./syncContext";
import type { SyncContextValue, SyncState } from "./syncContext";

const LAST_SYNC_KEY = "pinball_last_sync";
const POLL_MS = 30_000;
const PUSH_DEBOUNCE_MS = 1500;

/**
 * Background sync against Supabase, layered on top of DataProvider without
 * replacing it: localStorage stays the working source of truth, and each cycle
 * pulls remote changes, merges them locally (pure {@link mergeState}), then
 * pushes the merged result back. Runs on sign-in, on reconnect, on an interval,
 * and (debounced) after local edits. A no-op when sync isn't configured or the
 * user is signed out, so the app always works offline.
 */
export function SyncProvider({ children }: { children: ReactNode }) {
  const data = useData();

  // Refs keep the latest values without re-creating the sync cycle each render.
  const snapshotRef = useRef(data.snapshot);
  snapshotRef.current = data.snapshot;
  const applyRemoteRef = useRef(data.applyRemote);
  applyRemoteRef.current = data.applyRemote;

  const userIdRef = useRef<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [phase, setPhase] = useState<"idle" | "syncing" | "error">("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() =>
    localStorage.getItem(LAST_SYNC_KEY),
  );

  const adapter = useMemo(
    () =>
      supabase
        ? createSupabaseAdapter(supabase, () => userIdRef.current)
        : null,
    [],
  );

  // Track the auth session (restored from storage on load, then live updates).
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      userIdRef.current = session?.user.id ?? null;
      setAuthed(Boolean(session));
      setEmail(session?.user.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      userIdRef.current = session?.user.id ?? null;
      setAuthed(Boolean(session));
      setEmail(session?.user.email ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const syncingRef = useRef(false);
  const sync = useCallback(async () => {
    if (!adapter || !adapter.isAuthed() || !navigator.onLine) return;
    if (syncingRef.current) return;
    syncingRef.current = true;
    setPhase("syncing");
    // Capture the cutoff before pulling so changes made mid-cycle aren't missed.
    const startedAt = new Date().toISOString();
    const since = localStorage.getItem(LAST_SYNC_KEY) ?? undefined;
    try {
      const remote = await adapter.pull(since);
      const merged = mergeState(snapshotRef.current, remote);
      applyRemoteRef.current(remote);
      await adapter.push(merged);
      localStorage.setItem(LAST_SYNC_KEY, startedAt);
      setLastSyncedAt(startedAt);
      setPhase("idle");
    } catch (err) {
      console.error("Sync failed:", err);
      setPhase("error");
    } finally {
      syncingRef.current = false;
    }
  }, [adapter]);

  const syncRef = useRef(sync);
  syncRef.current = sync;

  // Sync on sign-in and whenever the device comes back online.
  useEffect(() => {
    if (authed && online) void syncRef.current();
  }, [authed, online]);

  // Periodic background sync while signed in.
  useEffect(() => {
    if (!authed) return;
    const id = setInterval(() => void syncRef.current(), POLL_MS);
    return () => clearInterval(id);
  }, [authed]);

  // Push (debounced) after a user-driven local change.
  useEffect(() => {
    if (!authed || data.localRevision === 0) return;
    const id = setTimeout(() => void syncRef.current(), PUSH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [data.localRevision, authed]);

  const signInWithEmail = useCallback(async (addr: string) => {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOtp({
      email: addr,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Check your email for a sign-in link");
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) toast.error(error.message);
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    localStorage.removeItem(LAST_SYNC_KEY);
    setLastSyncedAt(null);
    setPhase("idle");
  }, []);

  const state: SyncState = !isSyncConfigured
    ? "disabled"
    : !authed
      ? "signedOut"
      : !online
        ? "offline"
        : phase === "syncing"
          ? "syncing"
          : phase === "error"
            ? "error"
            : "idle";

  const value: SyncContextValue = {
    state,
    email,
    lastSyncedAt,
    signInWithEmail,
    signInWithGoogle,
    signOut,
    syncNow: () => void syncRef.current(),
  };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}
