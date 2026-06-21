/**
 * Sync metadata carried by every syncable record. `updatedAt` drives
 * last-write-wins merge; a non-null `deletedAt` is a tombstone (soft delete).
 * Both are optional so pre-sync (schema v1) data and existing tests stay valid;
 * the v2 migration stamps them.
 */
export interface SyncMeta {
  updatedAt?: string;
  deletedAt?: string;
}

export interface Machine extends SyncMeta {
  id: string;
  name: string;
}

export interface Arcade extends SyncMeta {
  id: string;
  name: string;
  machines: Machine[];
  pinballMapId?: number;
  pinballMapRegion?: string;
  address?: string;
}

export interface Score {
  machineId: string;
  machineName: string;
  score: number;
  goal?: number;
  personalBest?: boolean;
}

export interface Lap extends SyncMeta {
  // Laps are append-only and immutable; `deletedAt` is only ever set when an
  // arcade delete cascades to its laps.
  id: string;
  arcadeId: string;
  arcadeName: string;
  date: string;
  scores: Score[];
  completed: boolean;
}

export interface MachineStats {
  machineId: string;
  machineName: string;
  scores: number[];
  median: number;
  average: number;
  best: number;
  lapCount: number;
}
