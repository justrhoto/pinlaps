import { useState } from "react";
import { Arcade, Machine } from "../types";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";

interface ArcadeManagerProps {
  arcade: Arcade | null;
  onSave: (arcade: Arcade) => void;
  onDelete?: (arcadeId: string) => void;
  onBack: () => void;
}

export function ArcadeManager({
  arcade,
  onSave,
  onDelete,
  onBack,
}: ArcadeManagerProps) {
  const [name, setName] = useState(arcade?.name || "");
  const [machines, setMachines] = useState<Machine[]>(arcade?.machines || []);
  const [newMachineName, setNewMachineName] = useState("");

  const handleAddMachine = () => {
    if (!newMachineName.trim()) return;

    const machine: Machine = {
      id: crypto.randomUUID(),
      name: newMachineName.trim(),
    };

    setMachines([...machines, machine]);
    setNewMachineName("");
  };

  const handleRemoveMachine = (machineId: string) => {
    setMachines(machines.filter((m) => m.id !== machineId));
  };

  const handleSave = () => {
    if (!name.trim() || machines.length === 0) return;

    const arcadeData: Arcade = {
      id: arcade?.id || crypto.randomUUID(),
      name: name.trim(),
      machines,
    };

    onSave(arcadeData);
  };

  const handleDelete = () => {
    if (arcade && onDelete) {
      onDelete(arcade.id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        {arcade && onDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Arcade
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Arcade</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this arcade? This will also
                  delete all lap history for this arcade. This action cannot be
                  undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{arcade ? "Edit Arcade" : "Create Arcade"}</CardTitle>
          <CardDescription>
            Add or edit arcade details and machines
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="arcade-name">Arcade Name</Label>
            <Input
              id="arcade-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter arcade name"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Machines ({machines.length})</Label>
            </div>

            <div className="flex gap-2">
              <Input
                value={newMachineName}
                onChange={(e) => setNewMachineName(e.target.value)}
                placeholder="Machine name"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAddMachine();
                  }
                }}
              />
              <Button
                onClick={handleAddMachine}
                disabled={!newMachineName.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {machines.length > 0 && (
              <div className="space-y-2">
                {machines.map((machine) => (
                  <div
                    key={machine.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <span>{machine.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMachine(machine.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button
            className="w-full"
            onClick={handleSave}
            disabled={!name.trim() || machines.length === 0}
          >
            Save Arcade
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
