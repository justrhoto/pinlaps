import { describe, it, expect } from "vitest";
import { dataReducer } from "./dataReducer";
import type { DataState } from "./dataReducer";
import type { Arcade, Lap } from "../types";

const arcade = (id: string, over: Partial<Arcade> = {}): Arcade => ({
  id,
  name: `Arcade ${id}`,
  machines: [],
  ...over,
});

const lap = (id: string, arcadeId: string): Lap => ({
  id,
  arcadeId,
  arcadeName: `Arcade ${arcadeId}`,
  date: new Date(2024, 0, 1).toISOString(),
  scores: [],
  completed: true,
});

const state = (over: Partial<DataState> = {}): DataState => ({
  arcades: [],
  laps: [],
  ...over,
});

describe("dataReducer", () => {
  it("adds a new arcade on upsert", () => {
    const next = dataReducer(state(), { type: "upsertArcade", arcade: arcade("a") });
    expect(next.arcades.map((a) => a.id)).toEqual(["a"]);
  });

  it("updates an existing arcade in place on upsert", () => {
    const start = state({ arcades: [arcade("a", { name: "Old" }), arcade("b")] });
    const next = dataReducer(start, {
      type: "upsertArcade",
      arcade: arcade("a", { name: "New" }),
    });
    expect(next.arcades).toHaveLength(2);
    expect(next.arcades[0].name).toBe("New");
    expect(next.arcades[1].id).toBe("b");
  });

  it("cascades lap deletion when deleting an arcade", () => {
    const start = state({
      arcades: [arcade("a"), arcade("b")],
      laps: [lap("l1", "a"), lap("l2", "b"), lap("l3", "a")],
    });
    const next = dataReducer(start, { type: "deleteArcade", arcadeId: "a" });
    expect(next.arcades.map((a) => a.id)).toEqual(["b"]);
    expect(next.laps.map((l) => l.id)).toEqual(["l2"]);
  });

  it("appends a lap", () => {
    const start = state({ laps: [lap("l1", "a")] });
    const next = dataReducer(start, { type: "addLap", lap: lap("l2", "a") });
    expect(next.laps.map((l) => l.id)).toEqual(["l1", "l2"]);
  });

  it("merges arcades and laps by id", () => {
    const start = state({ arcades: [arcade("a")], laps: [lap("l1", "a")] });
    const next = dataReducer(start, {
      type: "merge",
      arcades: [arcade("a", { name: "Updated" }), arcade("b")],
      laps: [lap("l2", "b")],
    });
    expect(next.arcades.map((a) => a.id)).toEqual(["a", "b"]);
    expect(next.arcades[0].name).toBe("Updated");
    expect(next.laps.map((l) => l.id)).toEqual(["l1", "l2"]);
  });

  it("does not mutate the input state", () => {
    const start = state({ arcades: [arcade("a")] });
    const snapshot = JSON.stringify(start);
    dataReducer(start, { type: "upsertArcade", arcade: arcade("b") });
    expect(JSON.stringify(start)).toBe(snapshot);
  });
});
