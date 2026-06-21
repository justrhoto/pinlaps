import { createContext, useContext } from "react";
import type { Arcade, Lap, MachineStats } from "../types";
import type { BackupData } from "../utils/backup";
import type { DataSnapshot } from "../utils/migrate";
import type { PinballMapLocation } from "../utils/pinballmap";

export interface DataContextValue {
  arcades: Arcade[];
  laps: Lap[];
  saveArcade: (arcade: Arcade) => void;
  deleteArcade: (arcadeId: string) => void;
  addLap: (lap: Lap) => void;
  importLocation: (
    location: PinballMapLocation,
    regionName: string,
  ) => Arcade | null;
  importBackup: (data: BackupData) => void;
  getArcadeLaps: (arcadeId: string) => Lap[];
  getArcadeStats: (arcadeId: string) => MachineStats[];
  /** Raw state including tombstones — what sync pushes (not the live view). */
  snapshot: DataSnapshot;
  /** Increments only on user-driven mutations, so sync can push without looping. */
  localRevision: number;
  /** Merge a remote snapshot into local state (used by sync pull). */
  applyRemote: (remote: DataSnapshot) => void;
}

export const DataContext = createContext<DataContextValue | null>(null);

export const useData = (): DataContextValue => {
  const context = useContext(DataContext);
  if (context === null) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};
