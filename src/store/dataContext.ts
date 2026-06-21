import { createContext, useContext } from "react";
import type { Arcade, Lap, MachineStats } from "../types";
import type { BackupData } from "../utils/backup";
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
}

export const DataContext = createContext<DataContextValue | null>(null);

export const useData = (): DataContextValue => {
  const context = useContext(DataContext);
  if (context === null) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};
