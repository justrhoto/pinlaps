import { Lap, MachineStats } from "../types";
import { Button } from "./ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { ArrowLeft, Trophy, TrendingUp } from "lucide-react";

interface LapHistoryProps {
  arcadeName: string;
  laps: Lap[];
  stats: MachineStats[];
  onBack: () => void;
}

export function LapHistory({
  arcadeName,
  laps,
  stats,
  onBack,
}: LapHistoryProps) {
  const sortedLaps = [...laps].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getTotalScore = (lap: Lap) => {
    return lap.scores.reduce((sum, score) => sum + score.score, 0);
  };

  const sortedStats = [...stats].sort((a, b) => b.median - a.median);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      <div>
        <h1>{arcadeName}</h1>
        <p className="text-muted-foreground">
          {laps.length} {laps.length === 1 ? "lap" : "laps"} completed
        </p>
      </div>

      <Tabs defaultValue="laps" className="space-y-4">
        <TabsList>
          <TabsTrigger value="laps">Lap History</TabsTrigger>
          <TabsTrigger value="stats">Machine Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="laps" className="space-y-4">
          {sortedLaps.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No Laps Yet</CardTitle>
                <CardDescription>
                  Complete your first lap to see your history here
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            sortedLaps.map((lap, lapIndex) => {
              const totalScore = getTotalScore(lap);
              const goalsBeaten = lap.scores.filter((score) => {
                return score.goal && score.score >= score.goal;
              }).length;
              const machinesNotPlayed = lap.scores
                .filter((score) => score.score === 0)
                .map((score) => score.machineName);

              return (
                <Card key={lap.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>
                          Lap #{sortedLaps.length - lapIndex}
                        </CardTitle>
                        <CardDescription>
                          {formatDate(lap.date)}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="font-mono">
                          {totalScore.toLocaleString()}
                        </div>
                        {goalsBeaten > 0 && (
                          <Badge variant="secondary" className="mt-1">
                            <Trophy className="mr-1 h-3 w-3" />
                            {goalsBeaten} {goalsBeaten === 1 ? "goal" : "goals"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Machine</TableHead>
                          <TableHead className="text-right">Score</TableHead>
                          <TableHead className="text-right">Goal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lap.scores.map((score) => {
                          if (score.score == 0) return;

                          const goal = score.goal ? score.goal : 0;
                          const beatGoal = goal > 0 && score.score >= goal;

                          return (
                            <TableRow key={score.machineId}>
                              <TableCell>{score.machineName}</TableCell>
                              <TableCell className="text-right font-mono">
                                {score.score.toLocaleString()}
                                {beatGoal && (
                                  <Trophy className="ml-2 inline h-4 w-4 text-yellow-500" />
                                )}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-right">
                                {goal > 0 ? goal.toLocaleString() : "-"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                  {machinesNotPlayed.length > 0 && (
                    <CardFooter>
                      <CardAction>
                        Machines not played: {machinesNotPlayed.join(", ")}
                      </CardAction>
                    </CardFooter>
                  )}
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          {sortedStats.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No Stats Yet</CardTitle>
                <CardDescription>
                  Complete laps to see machine statistics
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {sortedStats.map((stat) => (
                <Card key={stat.machineId}>
                  <CardHeader>
                    <CardTitle>{stat.machineName}</CardTitle>
                    <CardDescription>
                      {stat.lapCount} {stat.lapCount === 1 ? "lap" : "laps"}{" "}
                      played
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        Goal (Median)
                      </span>
                      <span className="font-mono">
                        <TrendingUp className="mr-1 inline h-4 w-4" />
                        {stat.median.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Best</span>
                      <span className="font-mono">
                        <Trophy className="mr-1 inline h-4 w-4 text-yellow-500" />
                        {stat.best.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Average</span>
                      <span className="font-mono">
                        {Math.round(stat.average).toLocaleString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
