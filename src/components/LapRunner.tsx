import { useState } from "react";
import { Arcade, Score, MachineStats, Machine } from "../types";
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
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { ArrowLeft, ArrowRight, Check, Trophy } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface LapRunnerProps {
  arcade: Arcade;
  stats: MachineStats[];
  onComplete: (scores: Score[]) => void;
  onBack: () => void;
}

export function LapRunner({
  arcade,
  stats,
  onComplete,
  onBack,
}: LapRunnerProps) {
  const [machineSelector, setMachineSelector] = useState<Machine | null>(null);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scores, setScores] = useState<Map<string, number>>(new Map());
  const [currentScore, setCurrentScore] = useState("");

  const scoredMachineIds = Array.from(scores.keys());
  const currentMachineId = scoredMachineIds[currentIndex];
  const currentMachine =
    selectedMachine ||
    arcade.machines.find((m) => m.id === currentMachineId) ||
    null;
  const progress = (scores.size / arcade.machines.length) * 100;
  const isLastMachine = currentIndex === arcade.machines.length - 1;

  const machineStats = currentMachine
    ? stats.find((s) => s.machineId === currentMachine.id)
    : null;
  const goalScore = machineStats?.median || 0;

  const handleNext = () => {
    const score = parseInt(currentScore) || 0;
    const newScores = new Map(scores);
    if (currentMachine) newScores.set(currentMachine.id, score);
    setScores(newScores);
    if (isLastMachine) {
      handleFinishLap();
    } else {
      setSelectedMachine(null);
      setCurrentScore(
        scores.get(scoredMachineIds[currentIndex + 1])?.toString() || "",
      );
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const prevMachine = arcade.machines.find(
        (machine) => machine.id === scoredMachineIds[currentIndex - 1],
      );
      if (prevMachine == null) return;

      setCurrentIndex(currentIndex - 1);
      setSelectedMachine(prevMachine);
      setCurrentScore(scores.get(prevMachine.id)?.toString() || "");
    }
  };

  const handleSelect = () => {
    if (machineSelector == null) return;

    setSelectedMachine(machineSelector);
    setMachineSelector(null);
    setCurrentScore(scores.get(machineSelector.id)?.toString() || "");
  };

  const handleFinishLap = () => {
    const score = parseInt(currentScore) || 0;
    const newScores = new Map(scores);
    if (currentMachine) newScores.set(currentMachine.id, score);

    const finalScores: Score[] = [];

    arcade.machines.forEach((machine) => {
      const machineStats = machine
        ? stats.find((s) => s.machineId === machine.id)
        : null;
      const goalScore = machineStats?.median || 0;
      const personalBest =
        machineStats || score > 0
          ? machineStats == undefined || score >= machineStats.best
          : false;

      finalScores.push({
        machineId: machine.id,
        machineName: machine.name,
        score: newScores.get(machine.id) || 0,
        goal: goalScore,
        personalBest,
      });
    });

    onComplete(finalScores);
  };

  const enteredScore = parseInt(currentScore) || 0;
  const beatGoal = goalScore > 0 && enteredScore >= goalScore;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Cancel Lap
        </Button>

        <div>
          <Button variant="outline" onClick={handleFinishLap}>
            <Check className="mr-2 h-4 w-4" />
            Finish Lap
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">
            Machine {currentIndex + 1} of {arcade.machines.length}
          </span>
          <span className="text-muted-foreground">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} />
      </div>

      {currentMachine && (
        <Card>
          <CardHeader>
            <CardTitle>{currentMachine.name}</CardTitle>
            <CardDescription>
              {machineStats ? (
                <div className="space-y-1">
                  <div>Goal Score: {goalScore.toLocaleString()} (median)</div>
                  <div className="text-xs">
                    Best: {machineStats.best.toLocaleString()} · Avg:{" "}
                    {Math.round(machineStats.average).toLocaleString()} ·
                    {machineStats.lapCount}{" "}
                    {machineStats.lapCount === 1 ? "lap" : "laps"}
                  </div>
                </div>
              ) : (
                "First time playing this machine!"
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="score">Your Score</Label>
              <div className="relative">
                <Input
                  id="score"
                  type="number"
                  value={currentScore}
                  onChange={(e) => setCurrentScore(e.target.value)}
                  placeholder="0"
                  className="pr-10"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleNext();
                    }
                  }}
                />
                {beatGoal && (
                  <Trophy className="absolute top-1/2 right-3 h-5 w-5 -translate-y-1/2 text-yellow-500" />
                )}
              </div>
              {beatGoal && goalScore > 0 && (
                <p className="text-green-600">
                  Beat the goal by {(enteredScore - goalScore).toLocaleString()}
                  !
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="flex-1"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>
              <Button onClick={handleNext} className="flex-1">
                {isLastMachine ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Complete Lap
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!currentMachine && (
        <Card>
          <CardHeader>
            <CardTitle>Select a Machine</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="machine">{arcade.name}</Label>
              <div className="relative">
                <Select
                  onValueChange={(value) =>
                    setMachineSelector(
                      arcade.machines.find((m) => m.id === value) || null,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a machine..." />
                  </SelectTrigger>
                  <SelectContent
                    className="bg-background"
                    position="item-aligned"
                  >
                    <SelectGroup>
                      {arcade.machines
                        .filter((machine) => !scores.has(machine.id))
                        .map((machine) => (
                          <SelectItem
                            className="px-2 py-1"
                            key={machine.id}
                            value={machine.id}
                          >
                            {machine.name}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="flex-1"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>
              <Button
                onClick={handleSelect}
                className="flex-1"
                disabled={!machineSelector}
              >
                {
                  <>
                    Select Machine
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                }
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Lap Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {scoredMachineIds.toReversed().map((machineId, idx) => {
              const machine = arcade.machines.find((m) => m.id === machineId);
              if (machine == null) return null;
              const score = scores.get(machine.id);
              const isCompleted = score !== undefined;
              const isCurrent = scores.size - 1 - idx === currentIndex;

              return (
                <div
                  key={machine.id}
                  className={`flex items-center justify-between rounded p-2 ${
                    isCurrent ? "bg-primary/10" : ""
                  }`}
                >
                  <span className={isCompleted ? "text-foreground" : ""}>
                    {machine.name}
                  </span>
                  {isCompleted && (
                    <Badge variant="secondary">{score.toLocaleString()}</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
