import { useEffect, useReducer, useState } from "react";
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

const init = (): DataState => storage.loadData();

/**
 * Owns all arcade/lap data: a single source of truth that persists every
 * change to localStorage and exposes mutations (with user notifications) plus
 * selectors via the useData() hook.
 */
export function DataProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(dataReducer, undefined, init);
  // Bumped only by user-driven mutations (not by remote merges) so the sync
  // layer can push local changes without a merge -> push -> merge feedback loop.
  const [localRevision, setLocalRevision] = useState(0);
  const markLocalChange = () => setLocalRevision((n) => n + 1);

  // Persist on change so callers never have to remember to save.
  useEffect(() => {
    storage.saveArcades(state.arcades);
  }, [state.arcades]);

  useEffect(() => {
    storage.saveLaps(state.laps);
  }, [state.laps]);

  const saveArcade = (arcade: Arcade) => {
    const exists = state.arcades.some((a) => a.id === arcade.id && !a.deletedAt);
    dispatch({ type: "upsertArcade", arcade, now: new Date().toISOString() });
    markLocalChange();
    toast.success(
      exists ? "Arcade updated successfully" : "Arcade created successfully",
    );
  };

  const deleteArcade = (arcadeId: string) => {
    dispatch({ type: "deleteArcade", arcadeId, now: new Date().toISOString() });
    markLocalChange();
    toast.success("Arcade deleted successfully");
  };

  const addLap = (lap: Lap) => {
    dispatch({ type: "addLap", lap: { ...lap, updatedAt: new Date().toISOString() } });
    markLocalChange();
    const totalScore = lap.scores.reduce((sum, s) => sum + s.score, 0);
    toast.success(`Lap completed! Total score: ${totalScore.toLocaleString()}`);
  };

  const importLocation = (
    location: PinballMapLocation,
    regionName: string,
  ): Arcade | null => {
    if (
      state.arcades.some((a) => a.pinballMapId === location.id && !a.deletedAt)
    ) {
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

    dispatch({ type: "upsertArcade", arcade, now: new Date().toISOString() });
    markLocalChange();
    toast.success(
      `Imported ${location.name} with ${arcade.machines.length} machines`,
    );
    return arcade;
  };

  const importBackup = (data: BackupData) => {
    dispatch({ type: "merge", arcades: data.arcades, laps: data.laps });
    markLocalChange();
    const arcadeWord = data.arcades.length === 1 ? "arcade" : "arcades";
    const lapWord = data.laps.length === 1 ? "lap" : "laps";
    toast.success(
      `Imported ${data.arcades.length} ${arcadeWord} and ${data.laps.length} ${lapWord}`,
    );
  };

  // The UI sees only live records; tombstones stay in state so they persist and
  // sync (preventing cross-device resurrection). Deleted machines are stripped
  // from otherwise-live arcades too.
  const liveArcades = state.arcades
    .filter((a) => !a.deletedAt)
    .map((a) => ({ ...a, machines: a.machines.filter((m) => !m.deletedAt) }));
  const liveLaps = state.laps.filter((lap) => !lap.deletedAt);

  const getArcadeLaps = (arcadeId: string) =>
    liveLaps.filter((lap) => lap.arcadeId === arcadeId);

  const getArcadeStats = (arcadeId: string) =>
    calculateMachineStats(arcadeId, liveLaps);

  return (
    <DataContext.Provider
      value={{
        arcades: liveArcades,
        laps: liveLaps,
        saveArcade,
        deleteArcade,
        addLap,
        importLocation,
        importBackup,
        getArcadeLaps,
        getArcadeStats,
        snapshot: { arcades: state.arcades, laps: state.laps },
        localRevision,
        applyRemote: (remote) =>
          dispatch({
            type: "merge",
            arcades: remote.arcades,
            laps: remote.laps,
          }),
      }}
    >
      {children}
    </DataContext.Provider>
  );
}
