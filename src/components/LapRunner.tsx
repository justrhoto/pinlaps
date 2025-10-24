import { useState } from "react";
import { Arcade, Score, MachineStats } from "../types";
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scores, setScores] = useState<Map<string, number>>(new Map());
  const [currentScore, setCurrentScore] = useState("");

  const currentMachine = arcade.machines[currentIndex];
  const progress = ((currentIndex + 1) / arcade.machines.length) * 100;
  const isLastMachine = currentIndex === arcade.machines.length - 1;

  const machineStats = stats.find((s) => s.machineId === currentMachine.id);
  const goalScore = machineStats?.median || 0;

  const handleNext = () => {
    const score = parseInt(currentScore) || 0;
    setScores(new Map(scores.set(currentMachine.id, score)));

    if (isLastMachine) {
      const finalScores: Score[] = [];

      arcade.machines.forEach((machine) => {
        finalScores.push({
          machineId: machine.id,
          machineName: machine.name,
          score: scores.get(machine.id) || 0,
        });
      });

      onComplete(finalScores);
    } else {
      setCurrentIndex(currentIndex + 1);
      const nextMachine = arcade.machines[currentIndex + 1];
      setCurrentScore(scores.get(nextMachine.id)?.toString() || "");
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      const prevMachine = arcade.machines[currentIndex - 1];
      setCurrentScore(scores.get(prevMachine.id)?.toString() || "");
    }
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
        <Badge variant="outline">{arcade.name}</Badge>
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
                <Trophy className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-yellow-500" />
              )}
            </div>
            {beatGoal && goalScore > 0 && (
              <p className="text-green-600">
                Beat the goal by {(enteredScore - goalScore).toLocaleString()}!
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

      <Card>
        <CardHeader>
          <CardTitle>Lap Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {arcade.machines.map((machine, idx) => {
              const score = scores.get(machine.id);
              const isCompleted = score !== undefined;
              const isCurrent = idx === currentIndex;

              return (
                <div
                  key={machine.id}
                  className={`flex items-center justify-between p-2 rounded ${
                    isCurrent ? "bg-primary/10" : ""
                  }`}
                >
                  <span
                    className={
                      isCompleted ? "line-through text-muted-foreground" : ""
                    }
                  >
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
