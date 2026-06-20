import { describe, it, expect } from "vitest";
import { calculateMachineStats, calculateMedian } from "./stats";
import type { Lap, Score } from "../types";

let lapCounter = 0;

const score = (machineId: string, value: number): Score => ({
  machineId,
  machineName: machineId,
  score: value,
});

const lap = (arcadeId: string, scores: Score[]): Lap => ({
  id: `lap-${++lapCounter}`,
  arcadeId,
  arcadeName: arcadeId,
  date: new Date(2024, 0, lapCounter).toISOString(),
  scores,
  completed: true,
});

describe("calculateMedian", () => {
  it("returns 0 for an empty list", () => {
    expect(calculateMedian([])).toBe(0);
  });

  it("returns the middle value for odd-length input", () => {
    expect(calculateMedian([3, 1, 2])).toBe(2);
  });

  it("averages the two middle values for even-length input", () => {
    expect(calculateMedian([1, 2, 3, 4])).toBe(2.5);
  });

  it("ignores zero (not-played) scores", () => {
    expect(calculateMedian([0, 0, 10])).toBe(10);
  });
});

describe("calculateMachineStats", () => {
  it("returns an empty array when there are no laps for the arcade", () => {
    expect(calculateMachineStats("arc1", [])).toEqual([]);
    expect(calculateMachineStats("arc1", [lap("other", [score("a", 5)])])).toEqual(
      [],
    );
  });

  it("aggregates median, average, best and lapCount across laps", () => {
    const laps = [
      lap("arc1", [score("a", 10)]),
      lap("arc1", [score("a", 20)]),
      lap("arc1", [score("a", 30)]),
    ];

    const [stat] = calculateMachineStats("arc1", laps);

    expect(stat.machineId).toBe("a");
    expect(stat.scores).toEqual([10, 20, 30]);
    expect(stat.median).toBe(20);
    expect(stat.average).toBe(20);
    expect(stat.best).toBe(30);
    expect(stat.lapCount).toBe(3);
  });

  it("excludes a not-played (0) score even on the machine's first appearance", () => {
    // Regression: previously the first occurrence of a machine pushed its 0,
    // inflating lapCount and dragging the average down.
    const laps = [
      lap("arc1", [score("a", 0)]), // imported but not played
      lap("arc1", [score("a", 100)]),
      lap("arc1", [score("a", 200)]),
    ];

    const [stat] = calculateMachineStats("arc1", laps);

    expect(stat.scores).toEqual([100, 200]);
    expect(stat.lapCount).toBe(2);
    expect(stat.average).toBe(150);
    expect(stat.best).toBe(200);
  });

  it("omits machines that were never played with a real score", () => {
    const laps = [lap("arc1", [score("a", 0), score("b", 50)])];

    const stats = calculateMachineStats("arc1", laps);

    expect(stats).toHaveLength(1);
    expect(stats[0].machineId).toBe("b");
  });
});
