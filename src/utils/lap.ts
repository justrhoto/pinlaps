import type { Arcade, Lap, Machine, MachineStats, Score } from "../types";

/** Maximum number of digits a score may contain (parseInt precision guard). */
const MAX_SCORE_DIGITS = 16;

/** Parse a (possibly comma-formatted) score string into a number, defaulting to 0. */
export const parseScore = (value: string): number => {
  return parseInt(value.replace(/,/g, ""), 10) || 0;
};

/**
 * Format raw user input into a thousands-separated score string.
 * Returns `null` when the input exceeds the digit cap, signalling the caller
 * to keep the previous value.
 */
export const formatScoreInput = (value: string): string | null => {
  const digits = value.replace(/[^0-9]/g, "");
  if (digits.length > MAX_SCORE_DIGITS) return null;
  if (digits === "") return "";
  return parseInt(digits, 10).toLocaleString("en-US");
};

/** Render a stored score as a thousands-separated input value (empty if unset). */
export const scoreToInput = (value: number | undefined): string => {
  return value === undefined ? "" : value.toLocaleString("en-US");
};

/**
 * A score is a personal best when it is a real (non-zero) score that meets or
 * beats the best of all previous laps. With no prior stats, any real score is a
 * personal best (first time the machine is played).
 */
export const isPersonalBest = (
  playerScore: number,
  stats?: MachineStats,
): boolean => {
  if (playerScore <= 0) return false;
  return stats == null || playerScore >= stats.best;
};

/**
 * Build the finalized per-machine scores for a lap. Each machine's
 * `personalBest` and `goal` are computed against that machine's own stats.
 */
export const buildLapScores = (
  machines: Machine[],
  scores: Map<string, number>,
  stats: MachineStats[],
): Score[] => {
  return machines.map((machine) => {
    const machineStats = stats.find((s) => s.machineId === machine.id);
    const playerScore = scores.get(machine.id) ?? 0;
    return {
      machineId: machine.id,
      machineName: machine.name,
      score: playerScore,
      goal: machineStats?.median ?? 0,
      personalBest: isPersonalBest(playerScore, machineStats),
    };
  });
};

/** Assemble a completed Lap from the entered scores. */
export const createLap = (
  arcade: Arcade,
  scores: Map<string, number>,
  stats: MachineStats[],
): Lap => {
  return {
    id: crypto.randomUUID(),
    arcadeId: arcade.id,
    arcadeName: arcade.name,
    date: new Date().toISOString(),
    scores: buildLapScores(arcade.machines, scores, stats),
    completed: true,
  };
};
