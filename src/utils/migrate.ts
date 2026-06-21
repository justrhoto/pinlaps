import type { Arcade, Lap } from "../types";
import { stableArcadeId, stableMachineId } from "./pinballmap";

/** The shape persisted to storage and carried in backups. */
export interface DataSnapshot {
  arcades: Arcade[];
  laps: Lap[];
}

/** localStorage key holding the integer schema version of the stored data. */
export const SCHEMA_VERSION = 2;

/**
 * Migrate schema v1 data to v2.
 *
 * v1 gave every imported arcade and machine a random `crypto.randomUUID()`, so
 * two devices importing the same Pinball Map location produced different ids —
 * which would duplicate arcades/machines and orphan stats once we start merging
 * across devices. v2 re-derives those ids deterministically from the stable
 * Pinball Map id + machine name (see {@link stableArcadeId}/{@link stableMachineId}),
 * and rewrites every lap's `arcadeId` and each `score.machineId` to match so
 * stats stay attached.
 *
 * Arcades without a `pinballMapId` (hand-created) have no stable source, so
 * their ids are left as-is. Every record is stamped with `updatedAt` (preserving
 * any existing value) to seed last-write-wins merge.
 *
 * Pure and idempotent: running it on already-v2 data returns an equal snapshot.
 */
export const migrateToV2 = (
  state: DataSnapshot,
  now: string = new Date().toISOString(),
): DataSnapshot => {
  // old id -> new id, used to rewrite the lap references after remapping.
  const arcadeIdMap = new Map<string, string>();
  const machineIdMap = new Map<string, string>();

  const arcades = state.arcades.map((arcade) => {
    const hasStableSource = arcade.pinballMapId != null;

    const newArcadeId = hasStableSource
      ? stableArcadeId(arcade.pinballMapId!)
      : arcade.id;
    if (newArcadeId !== arcade.id) arcadeIdMap.set(arcade.id, newArcadeId);

    const seen = new Set<string>();
    const machines = arcade.machines.flatMap((machine) => {
      const newMachineId = hasStableSource
        ? stableMachineId(arcade.pinballMapId!, machine.name)
        : machine.id;
      if (newMachineId !== machine.id) machineIdMap.set(machine.id, newMachineId);

      // Two machines with the same name collapse to one stable id; drop the
      // duplicate but keep its id mapping so its lap scores re-point correctly.
      if (seen.has(newMachineId)) return [];
      seen.add(newMachineId);

      return [{ ...machine, id: newMachineId, updatedAt: machine.updatedAt ?? now }];
    });

    return {
      ...arcade,
      id: newArcadeId,
      machines,
      updatedAt: arcade.updatedAt ?? now,
    };
  });

  const laps = state.laps.map((lap) => ({
    ...lap,
    arcadeId: arcadeIdMap.get(lap.arcadeId) ?? lap.arcadeId,
    scores: lap.scores.map((score) => ({
      ...score,
      machineId: machineIdMap.get(score.machineId) ?? score.machineId,
    })),
    updatedAt: lap.updatedAt ?? now,
  }));

  return { arcades, laps };
};
