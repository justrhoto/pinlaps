import { useState, useEffect } from 'react';
import { Arcade, Lap, Score, Machine } from './types';
import { storage } from './utils/storage';
import { calculateMachineStats } from './utils/stats';
import { ArcadeList } from './components/ArcadeList';
import { ArcadeManager } from './components/ArcadeManager';
import { LapRunner } from './components/LapRunner';
import { LapHistory } from './components/LapHistory';
import { PinballMapSearch } from './components/PinballMapSearch';
import { PinballMapLocation } from './utils/pinballmap';
import { Button } from './components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { History } from 'lucide-react';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner@2.0.3';

type View = 'home' | 'manage' | 'lap' | 'history' | 'import';

interface AppState {
  view: View;
  selectedArcade: Arcade | null;
  editingArcade: Arcade | null;
}

export default function App() {
  const [arcades, setArcades] = useState<Arcade[]>([]);
  const [laps, setLaps] = useState<Lap[]>([]);
  const [state, setState] = useState<AppState>({
    view: 'home',
    selectedArcade: null,
    editingArcade: null,
  });

  useEffect(() => {
    setArcades(storage.getArcades());
    setLaps(storage.getLaps());
  }, []);

  const handleSaveArcade = (arcade: Arcade) => {
    const existingIndex = arcades.findIndex(a => a.id === arcade.id);
    let newArcades: Arcade[];

    if (existingIndex >= 0) {
      newArcades = [...arcades];
      newArcades[existingIndex] = arcade;
      toast.success('Arcade updated successfully');
    } else {
      newArcades = [...arcades, arcade];
      toast.success('Arcade created successfully');
    }

    setArcades(newArcades);
    storage.saveArcades(newArcades);
    setState({ view: 'home', selectedArcade: null, editingArcade: null });
  };

  const handleDeleteArcade = (arcadeId: string) => {
    const newArcades = arcades.filter(a => a.id !== arcadeId);
    const newLaps = laps.filter(l => l.arcadeId !== arcadeId);

    setArcades(newArcades);
    setLaps(newLaps);
    storage.saveArcades(newArcades);
    storage.saveLaps(newLaps);
    
    toast.success('Arcade deleted successfully');
    setState({ view: 'home', selectedArcade: null, editingArcade: null });
  };

  const handleCompleteLap = (scores: Score[]) => {
    if (!state.selectedArcade) return;

    const lap: Lap = {
      id: crypto.randomUUID(),
      arcadeId: state.selectedArcade.id,
      arcadeName: state.selectedArcade.name,
      date: new Date().toISOString(),
      scores,
    };

    const newLaps = [...laps, lap];
    setLaps(newLaps);
    storage.saveLaps(newLaps);

    const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
    toast.success(`Lap completed! Total score: ${totalScore.toLocaleString()}`);

    setState({
      view: 'history',
      selectedArcade: state.selectedArcade,
      editingArcade: null,
    });
  };

  const handleSelectArcade = (arcade: Arcade) => {
    setState({ view: 'lap', selectedArcade: arcade, editingArcade: null });
  };

  const handleManageArcade = (arcade: Arcade | null) => {
    setState({ view: 'manage', selectedArcade: null, editingArcade: arcade });
  };

  const handleViewHistory = (arcade: Arcade) => {
    setState({ view: 'history', selectedArcade: arcade, editingArcade: null });
  };

  const handleBackToHome = () => {
    setState({ view: 'home', selectedArcade: null, editingArcade: null });
  };

  const handleImportFromPinballMap = () => {
    setState({ view: 'import', selectedArcade: null, editingArcade: null });
  };

  const handleImportLocation = (location: PinballMapLocation, regionName: string) => {
    const machines: Machine[] = location.location_machine_xrefs?.map(xref => ({
      id: crypto.randomUUID(),
      name: xref.machine?.name || 'Unknown Machine',
    })).filter(machine => machine.name !== 'Unknown Machine') || [];

    // If no machines were imported, show a warning
    if (machines.length === 0) {
      toast.error('No machines found for this location. The arcade was not imported.');
      return;
    }

    const address = [location.street, location.city, location.state, location.zip]
      .filter(Boolean)
      .join(', ');

    const arcade: Arcade = {
      id: crypto.randomUUID(),
      name: location.name,
      machines,
      pinballMapId: location.id,
      pinballMapRegion: regionName,
      address,
    };

    const newArcades = [...arcades, arcade];
    setArcades(newArcades);
    storage.saveArcades(newArcades);

    toast.success(`Imported ${location.name} with ${machines.length} machines`);
    setState({ view: 'home', selectedArcade: null, editingArcade: null });
  };

  const getArcadeLaps = (arcadeId: string) => {
    return laps.filter(lap => lap.arcadeId === arcadeId);
  };

  const getArcadeStats = (arcadeId: string) => {
    return calculateMachineStats(arcadeId, laps);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-6xl">
        {state.view === 'home' && (
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
                    {arcades.map(arcade => (
                      <TabsTrigger key={arcade.id} value={arcade.id}>
                        {arcade.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  <TabsContent value="all" className="space-y-2">
                    {laps.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No laps completed yet
                      </div>
                    ) : (
                      [...laps]
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .slice(0, 5)
                        .map(lap => {
                          const arcade = arcades.find(a => a.id === lap.arcadeId);
                          if (!arcade) return null;

                          const totalScore = lap.scores.reduce((sum, s) => sum + s.score, 0);
                          const date = new Date(lap.date);

                          return (
                            <div
                              key={lap.id}
                              className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer"
                              onClick={() => handleViewHistory(arcade)}
                            >
                              <div>
                                <div>{arcade.name}</div>
                                <div className="text-muted-foreground">
                                  {date.toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                  })}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-mono">{totalScore.toLocaleString()}</div>
                                <div className="text-muted-foreground">
                                  {lap.scores.length} machines
                                </div>
                              </div>
                            </div>
                          );
                        })
                    )}
                  </TabsContent>

                  {arcades.map(arcade => {
                    const arcadeLaps = getArcadeLaps(arcade.id);
                    
                    return (
                      <TabsContent key={arcade.id} value={arcade.id} className="space-y-2">
                        {arcadeLaps.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            No laps completed for this arcade yet
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {[...arcadeLaps]
                              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                              .slice(0, 5)
                              .map(lap => {
                                const totalScore = lap.scores.reduce((sum, s) => sum + s.score, 0);
                                const date = new Date(lap.date);

                                return (
                                  <div
                                    key={lap.id}
                                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer"
                                    onClick={() => handleViewHistory(arcade)}
                                  >
                                    <div className="text-muted-foreground">
                                      {date.toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: 'numeric',
                                        minute: '2-digit',
                                      })}
                                    </div>
                                    <div className="text-right">
                                      <div className="font-mono">{totalScore.toLocaleString()}</div>
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
          </div>
        )}

        {state.view === 'manage' && (
          <ArcadeManager
            arcade={state.editingArcade}
            onSave={handleSaveArcade}
            onDelete={state.editingArcade ? handleDeleteArcade : undefined}
            onBack={handleBackToHome}
          />
        )}

        {state.view === 'lap' && state.selectedArcade && (
          <LapRunner
            arcade={state.selectedArcade}
            stats={getArcadeStats(state.selectedArcade.id)}
            onComplete={handleCompleteLap}
            onBack={handleBackToHome}
          />
        )}

        {state.view === 'history' && state.selectedArcade && (
          <LapHistory
            arcadeName={state.selectedArcade.name}
            laps={getArcadeLaps(state.selectedArcade.id)}
            stats={getArcadeStats(state.selectedArcade.id)}
            onBack={handleBackToHome}
          />
        )}

        {state.view === 'import' && (
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
