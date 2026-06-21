import type { SupabaseClient } from "@supabase/supabase-js";
import type { Arcade, Lap } from "../types";
import type { DataSnapshot } from "../utils/migrate";
import type { SyncAdapter } from "./adapter";

interface Row<T> {
  user_id: string;
  id: string;
  data: T;
  updated_at: string;
  deleted_at: string | null;
}

const toArcadeRow = (userId: string, a: Arcade): Row<Arcade> => ({
  user_id: userId,
  id: a.id,
  data: a,
  updated_at: a.updatedAt ?? new Date().toISOString(),
  deleted_at: a.deletedAt ?? null,
});

const toLapRow = (userId: string, l: Lap): Row<Lap> & { arcade_id: string } => ({
  user_id: userId,
  id: l.id,
  arcade_id: l.arcadeId,
  data: l,
  updated_at: l.updatedAt ?? new Date().toISOString(),
  deleted_at: l.deletedAt ?? null,
});

/**
 * Supabase-backed {@link SyncAdapter}. Each record is stored as a JSONB `data`
 * column plus `updated_at` for cheap delta pulls; the merge semantics live
 * entirely in the (pure) client merge engine, so this file is just transport.
 *
 * `getUserId` returns the current auth user id (or null when signed out); when
 * null, sync is a no-op so the app keeps working offline.
 */
export const createSupabaseAdapter = (
  client: SupabaseClient,
  getUserId: () => string | null,
): SyncAdapter => ({
  isAuthed: () => getUserId() !== null,

  async pull(since) {
    const userId = getUserId();
    if (!userId) return { arcades: [], laps: [] };

    const arcadeQuery = client
      .from("arcades")
      .select("data")
      .eq("user_id", userId);
    const lapQuery = client.from("laps").select("data").eq("user_id", userId);
    if (since) {
      arcadeQuery.gt("updated_at", since);
      lapQuery.gt("updated_at", since);
    }

    const [arcades, laps] = await Promise.all([arcadeQuery, lapQuery]);
    if (arcades.error) throw arcades.error;
    if (laps.error) throw laps.error;

    return {
      arcades: (arcades.data ?? []).map((r) => r.data as Arcade),
      laps: (laps.data ?? []).map((r) => r.data as Lap),
    };
  },

  async push(changes: DataSnapshot) {
    const userId = getUserId();
    if (!userId) return;

    if (changes.arcades.length) {
      const { error } = await client
        .from("arcades")
        .upsert(changes.arcades.map((a) => toArcadeRow(userId, a)));
      if (error) throw error;
    }
    if (changes.laps.length) {
      const { error } = await client
        .from("laps")
        .upsert(changes.laps.map((l) => toLapRow(userId, l)));
      if (error) throw error;
    }
  },
});
