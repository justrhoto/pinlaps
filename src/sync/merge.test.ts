import { describe, it, expect } from "vitest";
import { mergeState } from "./merge";
import type { DataSnapshot } from "../utils/migrate";
import type { Arcade, Lap } from "../types";

const T1 = "2026-01-01T00:00:00.000Z";
const T2 = "2026-02-01T00:00:00.000Z";
const T3 = "2026-03-01T00:00:00.000Z";

const arcade = (id: string, over: Partial<Arcade> = {}): Arcade => ({
  id,
  name: `Arcade ${id}`,
  machines: [],
  updatedAt: T1,
  ...over,
});

const machine = (id: string, name: string, over = {}) => ({
  id,
  name,
  updatedAt: T1,
  ...over,
});

const lap = (id: string, arcadeId: string, over: Partial<Lap> = {}): Lap => ({
  id,
  arcadeId,
  arcadeName: `Arcade ${arcadeId}`,
  date: T1,
  scores: [],
  completed: true,
  updatedAt: T1,
  ...over,
});

const snap = (over: Partial<DataSnapshot> = {}): DataSnapshot => ({
  arcades: [],
  laps: [],
  ...over,
});

describe("mergeState", () => {
  it("takes records present on only one side", () => {
    const local = snap({ arcades: [arcade("a")] });
    const remote = snap({ arcades: [arcade("b")], laps: [lap("l", "b")] });
    const merged = mergeState(local, remote);
    expect(merged.arcades.map((a) => a.id).sort()).toEqual(["a", "b"]);
    expect(merged.laps.map((l) => l.id)).toEqual(["l"]);
  });

  it("resolves conflicting arcade fields by last-write-wins", () => {
    const local = snap({ arcades: [arcade("a", { name: "Old", updatedAt: T1 })] });
    const remote = snap({ arcades: [arcade("a", { name: "New", updatedAt: T2 })] });
    expect(mergeState(local, remote).arcades[0].name).toBe("New");
    // ...regardless of which side is newer.
    expect(mergeState(remote, local).arcades[0].name).toBe("New");
  });

  it("unions machine lists so neither device's additions are lost", () => {
    const local = snap({
      arcades: [arcade("a", { machines: [machine("m1", "A")] })],
    });
    const remote = snap({
      arcades: [arcade("a", { machines: [machine("m2", "B")] })],
    });
    const merged = mergeState(local, remote);
    expect(merged.arcades[0].machines.map((m) => m.id).sort()).toEqual([
      "m1",
      "m2",
    ]);
  });

  it("does not resurrect a deleted arcade (newer tombstone wins)", () => {
    const local = snap({
      arcades: [arcade("a", { name: "Live", updatedAt: T1 })],
    });
    const remote = snap({
      arcades: [arcade("a", { name: "Live", updatedAt: T2, deletedAt: T2 })],
    });
    expect(mergeState(local, remote).arcades[0].deletedAt).toBe(T2);
  });

  it("revives a record when the live edit is newer than the tombstone", () => {
    const local = snap({
      arcades: [arcade("a", { updatedAt: T1, deletedAt: T1 })],
    });
    const remote = snap({
      arcades: [arcade("a", { name: "Edited back", updatedAt: T3 })],
    });
    const merged = mergeState(local, remote).arcades[0];
    expect(merged.deletedAt).toBeUndefined();
    expect(merged.name).toBe("Edited back");
  });

  it("removes a machine via tombstone without dropping it from the union", () => {
    const local = snap({
      arcades: [arcade("a", { machines: [machine("m1", "A", { updatedAt: T1 })] })],
    });
    const remote = snap({
      arcades: [
        arcade("a", {
          machines: [machine("m1", "A", { updatedAt: T2, deletedAt: T2 })],
        }),
      ],
    });
    const m1 = mergeState(local, remote).arcades[0].machines[0];
    expect(m1.deletedAt).toBe(T2);
  });

  it("takes the newer copy on a lap id collision", () => {
    const local = snap({ laps: [lap("l", "a", { date: T1, updatedAt: T1 })] });
    const remote = snap({ laps: [lap("l", "a", { date: T2, updatedAt: T2 })] });
    expect(mergeState(local, remote).laps[0].date).toBe(T2);
  });

  it("is idempotent: merge(a, a) deep-equals a", () => {
    const a = snap({
      arcades: [arcade("a", { machines: [machine("m1", "A")] })],
      laps: [lap("l", "a")],
    });
    expect(mergeState(a, a)).toEqual(a);
  });

  it("is order-independent for distinct timestamps", () => {
    const local = snap({
      arcades: [
        arcade("a", { name: "Old", updatedAt: T1, machines: [machine("m1", "A")] }),
      ],
      laps: [lap("l1", "a")],
    });
    const remote = snap({
      arcades: [
        arcade("a", { name: "New", updatedAt: T2, machines: [machine("m2", "B")] }),
        arcade("b"),
      ],
      laps: [lap("l2", "b")],
    });

    const ab = mergeState(local, remote);
    const ba = mergeState(remote, local);

    const norm = (s: DataSnapshot) => ({
      arcades: [...s.arcades]
        .map((a) => ({ ...a, machines: [...a.machines].sort((x, y) => x.id.localeCompare(y.id)) }))
        .sort((x, y) => x.id.localeCompare(y.id)),
      laps: [...s.laps].sort((x, y) => x.id.localeCompare(y.id)),
    });
    expect(norm(ab)).toEqual(norm(ba));
    expect(norm(ab).arcades.find((a) => a.id === "a")!.name).toBe("New");
  });
});
