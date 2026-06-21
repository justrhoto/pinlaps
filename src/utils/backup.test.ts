import { describe, it, expect } from "vitest";
import {
  BACKUP_VERSION,
  mergeById,
  parseBackup,
  serializeBackup,
} from "./backup";
import type { Arcade, Lap } from "../types";

const arcade = (id: string, over: Partial<Arcade> = {}): Arcade => ({
  id,
  name: `Arcade ${id}`,
  machines: [{ id: `${id}-m1`, name: "Machine 1" }],
  ...over,
});

const lap = (id: string, arcadeId: string): Lap => ({
  id,
  arcadeId,
  arcadeName: `Arcade ${arcadeId}`,
  date: new Date(2024, 0, 1).toISOString(),
  scores: [{ machineId: `${arcadeId}-m1`, machineName: "Machine 1", score: 10 }],
  completed: true,
});

describe("serializeBackup", () => {
  it("includes app id and version metadata", () => {
    const json = JSON.parse(serializeBackup([arcade("a")], [lap("l", "a")]));
    expect(json.app).toBe("pinlaps");
    expect(json.version).toBe(BACKUP_VERSION);
    expect(typeof json.exportedAt).toBe("string");
  });
});

describe("parseBackup", () => {
  it("round-trips serialized data (hand-created ids are preserved)", () => {
    const arcades = [arcade("a"), arcade("b")];
    const laps = [lap("l1", "a")];
    const result = parseBackup(serializeBackup(arcades, laps));
    // Migration stamps updatedAt but leaves non-imported ids/content intact.
    expect(result.arcades.map((a) => a.id)).toEqual(["a", "b"]);
    expect(result.laps.map((l) => l.id)).toEqual(["l1"]);
    expect(result.laps[0].scores[0].machineId).toBe("a-m1");
  });

  it("upgrades v1 backups: imported ids become stable on import", () => {
    const arcades = [
      arcade("legacy-uuid", {
        address: "1 Main St",
        pinballMapId: 42,
        pinballMapRegion: "portland",
        machines: [{ id: "rand", name: "Godzilla" }],
      }),
    ];
    const result = parseBackup(serializeBackup(arcades, []));
    expect(result.arcades[0].id).toBe("pm-42");
    expect(result.arcades[0].machines[0].id).toBe("pm-42-godzilla");
    expect(result.arcades[0].pinballMapId).toBe(42);
    expect(result.arcades[0].address).toBe("1 Main St");
  });

  it("rejects non-JSON input", () => {
    expect(() => parseBackup("not json")).toThrow(/valid JSON/);
  });

  it("rejects JSON missing arcades or laps", () => {
    expect(() => parseBackup(JSON.stringify({ arcades: [] }))).toThrow(
      /missing arcades or laps/,
    );
  });

  it("rejects structurally invalid arcade data", () => {
    const bad = JSON.stringify({ arcades: [{ id: "a" }], laps: [] });
    expect(() => parseBackup(bad)).toThrow(/invalid arcade data/);
  });

  it("rejects structurally invalid lap data", () => {
    const bad = JSON.stringify({ arcades: [], laps: [{ id: "l" }] });
    expect(() => parseBackup(bad)).toThrow(/invalid lap data/);
  });
});

describe("mergeById", () => {
  it("appends new items and keeps existing order", () => {
    const existing = [arcade("a"), arcade("b")];
    const incoming = [arcade("c")];
    expect(mergeById(existing, incoming).map((a) => a.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("overwrites existing items with the same id (incoming wins)", () => {
    const existing = [arcade("a", { name: "Old" })];
    const incoming = [arcade("a", { name: "New" })];
    const merged = mergeById(existing, incoming);
    expect(merged).toHaveLength(1);
    expect(merged[0].name).toBe("New");
  });

  it("is idempotent when re-importing the same data", () => {
    const data = [arcade("a"), arcade("b")];
    expect(mergeById(data, data)).toEqual(data);
  });
});
