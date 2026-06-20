import { describe, it, expect } from "vitest";
import {
  buildLapScores,
  createLap,
  formatScoreInput,
  isPersonalBest,
  parseScore,
  scoreToInput,
} from "./lap";
import type { Arcade, Machine, MachineStats } from "../types";

const machine = (id: string, name: string): Machine => ({ id, name });

const stat = (machineId: string, over: Partial<MachineStats>): MachineStats => ({
  machineId,
  machineName: machineId,
  scores: [],
  median: 0,
  average: 0,
  best: 0,
  lapCount: 0,
  ...over,
});

describe("parseScore", () => {
  it("strips commas and parses", () => {
    expect(parseScore("1,234,567")).toBe(1234567);
  });

  it("defaults to 0 for empty or non-numeric input", () => {
    expect(parseScore("")).toBe(0);
    expect(parseScore("abc")).toBe(0);
  });
});

describe("formatScoreInput", () => {
  it("formats digits with thousands separators", () => {
    expect(formatScoreInput("1000")).toBe("1,000");
  });

  it("ignores non-digit characters", () => {
    expect(formatScoreInput("1a2b3c4")).toBe("1,234");
  });

  it("returns empty string for empty input", () => {
    expect(formatScoreInput("")).toBe("");
  });

  it("returns null past the 16-digit cap so callers keep the old value", () => {
    expect(formatScoreInput("1".repeat(16))).not.toBeNull();
    expect(formatScoreInput("1".repeat(17))).toBeNull();
  });
});

describe("scoreToInput", () => {
  it("returns an empty string for an unset score", () => {
    expect(scoreToInput(undefined)).toBe("");
  });

  it("formats a stored score with thousands separators", () => {
    expect(scoreToInput(1234567)).toBe("1,234,567");
    expect(scoreToInput(0)).toBe("0");
  });
});

describe("isPersonalBest", () => {
  it("is false for a zero score", () => {
    expect(isPersonalBest(0, stat("m", { best: 100 }))).toBe(false);
  });

  it("is true on first play (no prior stats)", () => {
    expect(isPersonalBest(50, undefined)).toBe(true);
  });

  it("is true when meeting or beating the previous best", () => {
    expect(isPersonalBest(100, stat("m", { best: 100 }))).toBe(true);
    expect(isPersonalBest(150, stat("m", { best: 100 }))).toBe(true);
  });

  it("is false when below the previous best", () => {
    expect(isPersonalBest(80, stat("m", { best: 100 }))).toBe(false);
  });
});

describe("buildLapScores", () => {
  it("computes personalBest per machine, not from a shared score", () => {
    const machines = [machine("a", "Alpha"), machine("b", "Beta")];
    const stats = [
      stat("a", { best: 100, median: 90 }),
      stat("b", { best: 50, median: 40 }),
    ];
    const scores = new Map([
      ["a", 120], // beats its own best
      ["b", 10], // below its own best
    ]);

    const result = buildLapScores(machines, scores, stats);

    expect(result).toEqual([
      {
        machineId: "a",
        machineName: "Alpha",
        score: 120,
        goal: 90,
        personalBest: true,
      },
      {
        machineId: "b",
        machineName: "Beta",
        score: 10,
        goal: 40,
        personalBest: false,
      },
    ]);
  });

  it("fills missing machines with a zero score and no goal", () => {
    const machines = [machine("a", "Alpha")];
    const result = buildLapScores(machines, new Map(), []);
    expect(result).toEqual([
      {
        machineId: "a",
        machineName: "Alpha",
        score: 0,
        goal: 0,
        personalBest: false,
      },
    ]);
  });
});

describe("createLap", () => {
  it("assembles a completed lap from entered scores", () => {
    const arcade: Arcade = {
      id: "arc1",
      name: "Test Arcade",
      machines: [machine("a", "Alpha"), machine("b", "Beta")],
    };
    const scores = new Map([["a", 500]]);

    const lap = createLap(arcade, scores, []);

    expect(lap.arcadeId).toBe("arc1");
    expect(lap.arcadeName).toBe("Test Arcade");
    expect(lap.completed).toBe(true);
    expect(lap.scores).toHaveLength(2);
    expect(typeof lap.id).toBe("string");
    expect(() => new Date(lap.date).toISOString()).not.toThrow();
  });
});
