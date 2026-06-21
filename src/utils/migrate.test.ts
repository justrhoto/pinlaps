import { describe, it, expect } from "vitest";
import { migrateToV2 } from "./migrate";
import type { Arcade, Lap } from "../types";

const NOW = "2026-06-20T00:00:00.000Z";

describe("migrateToV2", () => {
  it("remaps imported arcade + machine ids and rewrites lap references", () => {
    const arcades: Arcade[] = [
      {
        id: "random-arcade-uuid",
        name: "Ground Kontrol",
        pinballMapId: 7,
        machines: [
          { id: "rand-m1", name: "Medieval Madness" },
          { id: "rand-m2", name: "Twilight Zone" },
        ],
      },
    ];
    const laps: Lap[] = [
      {
        id: "lap-1",
        arcadeId: "random-arcade-uuid",
        arcadeName: "Ground Kontrol",
        date: "2026-01-01T00:00:00.000Z",
        completed: true,
        scores: [
          { machineId: "rand-m1", machineName: "Medieval Madness", score: 100 },
          { machineId: "rand-m2", machineName: "Twilight Zone", score: 200 },
        ],
      },
    ];

    const result = migrateToV2({ arcades, laps }, NOW);

    expect(result.arcades[0].id).toBe("pm-7");
    expect(result.arcades[0].machines.map((m) => m.id)).toEqual([
      "pm-7-medieval-madness",
      "pm-7-twilight-zone",
    ]);
    // Lap reference rewritten so stats stay attached.
    expect(result.laps[0].arcadeId).toBe("pm-7");
    expect(result.laps[0].scores.map((s) => s.machineId)).toEqual([
      "pm-7-medieval-madness",
      "pm-7-twilight-zone",
    ]);
  });

  it("stamps updatedAt on every record", () => {
    const result = migrateToV2(
      {
        arcades: [
          { id: "pm-7", name: "A", pinballMapId: 7, machines: [{ id: "m", name: "M" }] },
        ],
        laps: [
          {
            id: "l",
            arcadeId: "pm-7",
            arcadeName: "A",
            date: NOW,
            completed: true,
            scores: [],
          },
        ],
      },
      NOW,
    );
    expect(result.arcades[0].updatedAt).toBe(NOW);
    expect(result.arcades[0].machines[0].updatedAt).toBe(NOW);
    expect(result.laps[0].updatedAt).toBe(NOW);
  });

  it("leaves hand-created arcades (no pinballMapId) ids untouched", () => {
    const arcades: Arcade[] = [
      { id: "manual-uuid", name: "Home", machines: [{ id: "mm", name: "TAF" }] },
    ];
    const result = migrateToV2({ arcades, laps: [] }, NOW);
    expect(result.arcades[0].id).toBe("manual-uuid");
    expect(result.arcades[0].machines[0].id).toBe("mm");
  });

  it("collapses duplicate-named machines but re-points their lap scores", () => {
    const arcades: Arcade[] = [
      {
        id: "a",
        name: "Dupes",
        pinballMapId: 9,
        machines: [
          { id: "x1", name: "Godzilla" },
          { id: "x2", name: "Godzilla" },
        ],
      },
    ];
    const laps: Lap[] = [
      {
        id: "l",
        arcadeId: "a",
        arcadeName: "Dupes",
        date: NOW,
        completed: true,
        scores: [
          { machineId: "x1", machineName: "Godzilla", score: 1 },
          { machineId: "x2", machineName: "Godzilla", score: 2 },
        ],
      },
    ];

    const result = migrateToV2({ arcades, laps }, NOW);

    expect(result.arcades[0].machines).toHaveLength(1);
    expect(result.arcades[0].machines[0].id).toBe("pm-9-godzilla");
    expect(result.laps[0].scores.map((s) => s.machineId)).toEqual([
      "pm-9-godzilla",
      "pm-9-godzilla",
    ]);
  });

  it("is idempotent on already-migrated data", () => {
    const once = migrateToV2(
      {
        arcades: [
          {
            id: "random",
            name: "A",
            pinballMapId: 7,
            machines: [{ id: "m", name: "Medieval Madness" }],
          },
        ],
        laps: [
          {
            id: "l",
            arcadeId: "random",
            arcadeName: "A",
            date: NOW,
            completed: true,
            scores: [{ machineId: "m", machineName: "Medieval Madness", score: 1 }],
          },
        ],
      },
      NOW,
    );
    const twice = migrateToV2(once, "2099-01-01T00:00:00.000Z");
    expect(twice).toEqual(once);
  });
});
