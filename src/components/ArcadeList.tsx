import type { Arcade } from "../types";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Plus, Play, Settings, Download } from "lucide-react";

interface ArcadeListProps {
  arcades: Arcade[];
  onSelectArcade: (arcade: Arcade) => void;
  onManageArcade: (arcade: Arcade | null) => void;
  onImportFromPinballMap: () => void;
}

export function ArcadeList({
  arcades,
  onSelectArcade,
  onManageArcade,
  onImportFromPinballMap,
}: ArcadeListProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Pinball Lap Tracker</h1>
          <p className="text-muted-foreground">
            Select an arcade to start a lap
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onImportFromPinballMap}>
            <Download className="mr-2 h-4 w-4" />
            Import from Pinball Map
          </Button>
          <Button onClick={() => onManageArcade(null)}>
            <Plus className="mr-2 h-4 w-4" />
            New Arcade
          </Button>
        </div>
      </div>

      {arcades.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Arcades Yet</CardTitle>
            <CardDescription>
              Create your first arcade to start tracking your pinball laps
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button onClick={onImportFromPinballMap}>
              <Download className="mr-2 h-4 w-4" />
              Import from Pinball Map
            </Button>
            <Button variant="outline" onClick={() => onManageArcade(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Custom
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {arcades.map((arcade) => (
            <Card key={arcade.id} className="flex flex-col">
              <CardHeader>
                <CardTitle>{arcade.name}</CardTitle>
                <CardDescription>
                  {arcade.address && (
                    <>
                      {arcade.address}
                      <br />
                    </>
                  )}
                  {arcade.machines.length}{" "}
                  {arcade.machines.length === 1 ? "machine" : "machines"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2 mt-auto">
                <Button
                  className="flex-1"
                  onClick={() => onSelectArcade(arcade)}
                  disabled={arcade.machines.length === 0}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Start Lap
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onManageArcade(arcade)}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
