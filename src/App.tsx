import { useState } from "react";
import type { Arcade, Lap } from "./types";
import { useData } from "./store/dataContext";
import { ArcadeList } from "./components/ArcadeList";
import { ArcadeManager } from "./components/ArcadeManager";
import { LapRunner } from "./components/LapRunner";
import { LapHistory } from "./components/LapHistory";
import { PinballMapSearch } from "./components/PinballMapSearch";
import { DataBackup } from "./components/DataBackup";
import { SyncStatus } from "./components/SyncStatus";
import type { PinballMapLocation } from "./utils/pinballmap";
import { Button } from "./components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { History } from "lucide-react";
import { Toaster } from "./components/ui/sonner";

type View = "home" | "manage" | "lap" | "history" | "import";

interface AppState {
  view: View;
  selectedArcade: Arcade | null;
  editingArcade: Arcade | null;
}

export default function App() {
  const {
    arcades,
    laps,
    saveArcade,
    deleteArcade,
    addLap,
    importLocation,
    getArcadeLaps,
    getArcadeStats,
  } = useData();
  const [state, setState] = useState<AppState>({
    view: "home",
    selectedArcade: null,
    editingArcade: null,
  });

  const handleSaveArcade = (arcade: Arcade) => {
    saveArcade(arcade);
    setState({ view: "home", selectedArcade: null, editingArcade: null });
  };

  const handleDeleteArcade = (arcadeId: string) => {
    deleteArcade(arcadeId);
    setState({ view: "home", selectedArcade: null, editingArcade: null });
  };

  const handleCompleteLap = (lap: Lap) => {
    if (!state.selectedArcade) return;

    addLap(lap);
    setState({
      view: "history",
      selectedArcade: state.selectedArcade,
      editingArcade: null,
    });
  };

  const handleSelectArcade = (arcade: Arcade) => {
    setState({ view: "lap", selectedArcade: arcade, editingArcade: null });
  };

  const handleManageArcade = (arcade: Arcade | null) => {
    setState({ view: "manage", selectedArcade: null, editingArcade: arcade });
  };

  const handleViewHistory = (arcade: Arcade) => {
    setState({ view: "history", selectedArcade: arcade, editingArcade: null });
  };

  const handleBackToHome = () => {
    setState({ view: "home", selectedArcade: null, editingArcade: null });
  };

  const handleImportFromPinballMap = () => {
    setState({ view: "import", selectedArcade: null, editingArcade: null });
  };

  const handleImportLocation = (
    location: PinballMapLocation,
    regionName: string,
  ) => {
    const arcade = importLocation(location, regionName);
    if (arcade) {
      setState({ view: "home", selectedArcade: null, editingArcade: null });
    }
  };

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto max-w-6xl space-y-6 p-6">
        <SyncStatus />
        {state.view === "home" && (
          <div className="space-y-6">
            <ArcadeList
              arcades={arcades}
              onSelectArcade={handleSelectArcade}
              onManageArcade={handleManageArcade}
              onImportFromPinballMap={handleImportFromPinballMap}
            />

            {arcades.length > 0 && (
              <div className="space-y-4">
                <h2>Recent Activity</h2>
                <Tabs defaultValue="all" className="w-full">
                  <TabsList>
                    <TabsTrigger value="all">All Laps</TabsTrigger>
                    {arcades.map((arcade) => (
                      <TabsTrigger key={arcade.id} value={arcade.id}>
                        {arcade.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  <TabsContent value="all" className="space-y-2">
                    {laps.length === 0 ? (
                      <div className="text-muted-foreground py-8 text-center">
                        No laps completed yet
                      </div>
                    ) : (
                      [...laps]
                        .sort(
                          (a, b) =>
                            new Date(b.date).getTime() -
                            new Date(a.date).getTime(),
                        )
                        .slice(0, 5)
                        .map((lap) => {
                          const arcade = arcades.find(
                            (a) => a.id === lap.arcadeId,
                          );
                          if (!arcade) return null;

                          const totalScore = lap.scores.reduce(
                            (sum, s) => sum + s.score,
                            0,
                          );
                          const date = new Date(lap.date);

                          return (
                            <div
                              key={lap.id}
                              className="hover:bg-accent flex cursor-pointer items-center justify-between rounded-lg border p-4"
                              onClick={() => handleViewHistory(arcade)}
                            >
                              <div>
                                <div>{arcade.name}</div>
                                <div className="text-muted-foreground">
                                  {date.toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "numeric",
                                    minute: "2-digit",
                                  })}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-mono">
                                  {totalScore.toLocaleString()}
                                </div>
                                <div className="text-muted-foreground">
                                  {lap.scores.length} machines
                                </div>
                              </div>
                            </div>
                          );
                        })
                    )}
                  </TabsContent>

                  {arcades.map((arcade) => {
                    const arcadeLaps = getArcadeLaps(arcade.id);

                    return (
                      <TabsContent
                        key={arcade.id}
                        value={arcade.id}
                        className="space-y-2"
                      >
                        {arcadeLaps.length === 0 ? (
                          <div className="text-muted-foreground py-8 text-center">
                            No laps completed for this arcade yet
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {[...arcadeLaps]
                              .sort(
                                (a, b) =>
                                  new Date(b.date).getTime() -
                                  new Date(a.date).getTime(),
                              )
                              .slice(0, 5)
                              .map((lap) => {
                                const totalScore = lap.scores.reduce(
                                  (sum, s) => sum + s.score,
                                  0,
                                );
                                const date = new Date(lap.date);

                                return (
                                  <div
                                    key={lap.id}
                                    className="hover:bg-accent flex cursor-pointer items-center justify-between rounded-lg border p-4"
                                    onClick={() => handleViewHistory(arcade)}
                                  >
                                    <div className="text-muted-foreground">
                                      {date.toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        hour: "numeric",
                                        minute: "2-digit",
                                      })}
                                    </div>
                                    <div className="text-right">
                                      <div className="font-mono">
                                        {totalScore.toLocaleString()}
                                      </div>
                                      <div className="text-muted-foreground">
                                        {lap.scores.length} machines
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            <Button
                              variant="outline"
                              className="w-full"
                              onClick={() => handleViewHistory(arcade)}
                            >
                              <History className="mr-2 h-4 w-4" />
                              View Full History
                            </Button>
                          </div>
                        )}
                      </TabsContent>
                    );
                  })}
                </Tabs>
              </div>
            )}

            <DataBackup />
          </div>
        )}

        {state.view === "manage" && (
          <ArcadeManager
            arcade={state.editingArcade}
            onSave={handleSaveArcade}
            onDelete={state.editingArcade ? handleDeleteArcade : undefined}
            onBack={handleBackToHome}
          />
        )}

        {state.view === "lap" && state.selectedArcade && (
          <LapRunner
            arcade={state.selectedArcade}
            stats={getArcadeStats(state.selectedArcade.id)}
            onComplete={handleCompleteLap}
            onBack={handleBackToHome}
          />
        )}

        {state.view === "history" && state.selectedArcade && (
          <LapHistory
            arcadeName={state.selectedArcade.name}
            laps={getArcadeLaps(state.selectedArcade.id)}
            stats={getArcadeStats(state.selectedArcade.id)}
            onBack={handleBackToHome}
          />
        )}

        {state.view === "import" && (
          <PinballMapSearch
            onImport={handleImportLocation}
            onBack={handleBackToHome}
          />
        )}
      </div>
      <Toaster />
    </div>
  );
}
