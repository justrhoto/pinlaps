import { describe, it, expect } from "vitest";
import { dataReducer, reconcileArcade } from "./dataReducer";
import type { DataState } from "./dataReducer";
import type { Arcade, Lap } from "../types";

const NOW = "2026-06-20T00:00:00.000Z";

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
    const next = dataReducer(state(), {
      type: "upsertArcade",
      arcade: arcade("a"),
      now: NOW,
    });
    expect(next.arcades.map((a) => a.id)).toEqual(["a"]);
    expect(next.arcades[0].updatedAt).toBe(NOW);
  });

  it("updates an existing arcade in place on upsert", () => {
    const start = state({ arcades: [arcade("a", { name: "Old" }), arcade("b")] });
    const next = dataReducer(start, {
      type: "upsertArcade",
      arcade: arcade("a", { name: "New" }),
      now: NOW,
    });
    expect(next.arcades).toHaveLength(2);
    expect(next.arcades[0].name).toBe("New");
    expect(next.arcades[1].id).toBe("b");
  });

  it("soft-deletes (tombstones) the arcade and cascades to its laps", () => {
    const start = state({
      arcades: [arcade("a"), arcade("b")],
      laps: [lap("l1", "a"), lap("l2", "b"), lap("l3", "a")],
    });
    const next = dataReducer(start, {
      type: "deleteArcade",
      arcadeId: "a",
      now: NOW,
    });
    // Records are retained as tombstones, not removed.
    expect(next.arcades.map((a) => a.id)).toEqual(["a", "b"]);
    expect(next.arcades.find((a) => a.id === "a")!.deletedAt).toBe(NOW);
    expect(next.arcades.find((a) => a.id === "b")!.deletedAt).toBeUndefined();
    expect(
      next.laps.filter((l) => l.deletedAt).map((l) => l.id),
    ).toEqual(["l1", "l3"]);
    expect(next.laps.find((l) => l.id === "l2")!.deletedAt).toBeUndefined();
  });

  it("appends a lap", () => {
    const start = state({ laps: [lap("l1", "a")] });
    const next = dataReducer(start, { type: "addLap", lap: lap("l2", "a") });
    expect(next.laps.map((l) => l.id)).toEqual(["l1", "l2"]);
  });

  it("merges by id with last-write-wins on conflicting arcades", () => {
    const start = state({
      arcades: [arcade("a", { name: "Local", updatedAt: "2026-01-01T00:00:00.000Z" })],
      laps: [lap("l1", "a")],
    });
    const next = dataReducer(start, {
      type: "merge",
      arcades: [
        arcade("a", { name: "Updated", updatedAt: "2026-02-01T00:00:00.000Z" }),
        arcade("b"),
      ],
      laps: [lap("l2", "b")],
    });
    expect(next.arcades.map((a) => a.id)).toEqual(["a", "b"]);
    // Incoming arcade is newer, so it wins.
    expect(next.arcades[0].name).toBe("Updated");
    expect(next.laps.map((l) => l.id)).toEqual(["l1", "l2"]);
  });

  it("does not mutate the input state", () => {
    const start = state({ arcades: [arcade("a")] });
    const snapshot = JSON.stringify(start);
    dataReducer(start, { type: "upsertArcade", arcade: arcade("b"), now: NOW });
    expect(JSON.stringify(start)).toBe(snapshot);
  });
});

describe("reconcileArcade", () => {
  const m = (id: string, name: string, over = {}) => ({ id, name, ...over });

  it("stamps updatedAt on a brand-new arcade and its machines", () => {
    const result = reconcileArcade(undefined, arcade("a", {
      machines: [m("m1", "Godzilla")],
    }), NOW);
    expect(result.updatedAt).toBe(NOW);
    expect(result.machines[0].updatedAt).toBe(NOW);
  });

  it("preserves the timestamp of an untouched machine", () => {
    const prev = arcade("a", {
      machines: [m("m1", "Godzilla", { updatedAt: "2020-01-01T00:00:00.000Z" })],
    });
    const next = arcade("a", { machines: [m("m1", "Godzilla")] });
    const result = reconcileArcade(prev, next, NOW);
    expect(result.machines[0].updatedAt).toBe("2020-01-01T00:00:00.000Z");
  });

  it("bumps the timestamp of a renamed machine", () => {
    const prev = arcade("a", {
      machines: [m("m1", "Godzilla", { updatedAt: "2020-01-01T00:00:00.000Z" })],
    });
    const next = arcade("a", { machines: [m("m1", "Godzilla Remake")] });
    const result = reconcileArcade(prev, next, NOW);
    expect(result.machines[0].updatedAt).toBe(NOW);
  });

  it("tombstones a removed machine instead of dropping it", () => {
    const prev = arcade("a", { machines: [m("m1", "A"), m("m2", "B")] });
    const next = arcade("a", { machines: [m("m1", "A")] });
    const result = reconcileArcade(prev, next, NOW);
    const removed = result.machines.find((x) => x.id === "m2")!;
    expect(removed.deletedAt).toBe(NOW);
  });

  it("preserves an existing machine tombstone across an unrelated edit", () => {
    const prev = arcade("a", {
      machines: [
        m("m1", "A"),
        m("m2", "B", { deletedAt: "2020-01-01T00:00:00.000Z" }),
      ],
    });
    // Editor only ever sees live machines, so next omits the tombstoned one.
    const next = arcade("a", { machines: [m("m1", "A renamed")] });
    const result = reconcileArcade(prev, next, NOW);
    const tomb = result.machines.find((x) => x.id === "m2")!;
    expect(tomb.deletedAt).toBe("2020-01-01T00:00:00.000Z");
  });

  it("revives a re-added machine by clearing its tombstone", () => {
    const prev = arcade("a", {
      machines: [m("m1", "A", { deletedAt: "2020-01-01T00:00:00.000Z" })],
    });
    const next = arcade("a", { machines: [m("m1", "A")] });
    const result = reconcileArcade(prev, next, NOW);
    expect(result.machines[0].deletedAt).toBeUndefined();
    expect(result.machines[0].updatedAt).toBe(NOW);
  });
});
