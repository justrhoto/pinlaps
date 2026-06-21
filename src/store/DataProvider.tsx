import { useEffect, useReducer } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import type { Arcade, Lap } from "../types";
import { storage } from "../utils/storage";
import { calculateMachineStats } from "../utils/stats";
import { locationToArcade } from "../utils/pinballmap";
import type { PinballMapLocation } from "../utils/pinballmap";
import type { BackupData } from "../utils/backup";
import { dataReducer } from "./dataReducer";
import type { DataState } from "./dataReducer";
import { DataContext } from "./dataContext";

const init = (): DataState => ({
  arcades: storage.getArcades(),
  laps: storage.getLaps(),
});

/**
 * Owns all arcade/lap data: a single source of truth that persists every
 * change to localStorage and exposes mutations (with user notifications) plus
 * selectors via the useData() hook.
 */
export function DataProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(dataReducer, undefined, init);

  // Persist on change so callers never have to remember to save.
  useEffect(() => {
    storage.saveArcades(state.arcades);
  }, [state.arcades]);

  useEffect(() => {
    storage.saveLaps(state.laps);
  }, [state.laps]);

  const saveArcade = (arcade: Arcade) => {
    const exists = state.arcades.some((a) => a.id === arcade.id);
    dispatch({ type: "upsertArcade", arcade });
    toast.success(
      exists ? "Arcade updated successfully" : "Arcade created successfully",
    );
  };

  const deleteArcade = (arcadeId: string) => {
    dispatch({ type: "deleteArcade", arcadeId });
    toast.success("Arcade deleted successfully");
  };

  const addLap = (lap: Lap) => {
    dispatch({ type: "addLap", lap });
    const totalScore = lap.scores.reduce((sum, s) => sum + s.score, 0);
    toast.success(`Lap completed! Total score: ${totalScore.toLocaleString()}`);
  };

  const importLocation = (
    location: PinballMapLocation,
    regionName: string,
  ): Arcade | null => {
    if (state.arcades.some((a) => a.pinballMapId === location.id)) {
      toast.error(`${location.name} has already been imported`);
      return null;
    }

    const arcade = locationToArcade(location, regionName);
    if (!arcade) {
      toast.error(
        "No machines found for this location. The arcade was not imported.",
      );
      return null;
    }

    dispatch({ type: "upsertArcade", arcade });
    toast.success(
      `Imported ${location.name} with ${arcade.machines.length} machines`,
    );
    return arcade;
  };

  const importBackup = (data: BackupData) => {
    dispatch({ type: "merge", arcades: data.arcades, laps: data.laps });
    const arcadeWord = data.arcades.length === 1 ? "arcade" : "arcades";
    const lapWord = data.laps.length === 1 ? "lap" : "laps";
    toast.success(
      `Imported ${data.arcades.length} ${arcadeWord} and ${data.laps.length} ${lapWord}`,
    );
  };

  const getArcadeLaps = (arcadeId: string) =>
    state.laps.filter((lap) => lap.arcadeId === arcadeId);

  const getArcadeStats = (arcadeId: string) =>
    calculateMachineStats(arcadeId, state.laps);

  return (
    <DataContext.Provider
      value={{
        arcades: state.arcades,
        laps: state.laps,
        saveArcade,
        deleteArcade,
        addLap,
        importLocation,
        importBackup,
        getArcadeLaps,
        getArcadeStats,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}
