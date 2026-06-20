import type { Lap, MachineStats } from "../types";

export const calculateMedian = (numbers: number[]): number => {
  if (numbers.length === 0) return 0;

  numbers = numbers.filter((score) => score > 0);
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
};

export const calculateMachineStats = (
  arcadeId: string,
  laps: Lap[],
): MachineStats[] => {
  const arcadeLaps = laps.filter((lap) => lap.arcadeId === arcadeId);

  if (arcadeLaps.length === 0) return [];

  const machineMap = new Map<string, number[]>();
  const machineNames = new Map<string, string>();

  arcadeLaps.forEach((lap) => {
    lap.scores.forEach((score) => {
      // A score of 0 means the machine was not played on this lap; never count it.
      if (score.score <= 0) return;

      if (!machineMap.has(score.machineId)) {
        machineMap.set(score.machineId, []);
        machineNames.set(score.machineId, score.machineName);
      }
      machineMap.get(score.machineId)!.push(score.score);
    });
  });

  const stats: MachineStats[] = [];

  machineMap.forEach((scores, machineId) => {
    const machineName = machineNames.get(machineId) || "Unknown";
    stats.push({
      machineId,
      machineName,
      scores,
      median: calculateMedian(scores),
      average: scores.reduce((a, b) => a + b, 0) / scores.length,
      best: Math.max(...scores),
      lapCount: scores.length,
    });
  });

  return stats;
};
