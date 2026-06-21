import { describe, it, expect } from "vitest";
import { createMemoryAdapter } from "./adapter";
import type { Arcade } from "../types";

const arcade = (id: string, updatedAt: string): Arcade => ({
  id,
  name: `Arcade ${id}`,
  machines: [],
  updatedAt,
});

describe("createMemoryAdapter", () => {
  it("pulls everything when no since is given", async () => {
    const a = createMemoryAdapter({
      arcades: [arcade("a", "2026-01-01T00:00:00.000Z")],
      laps: [],
    });
    expect((await a.pull()).arcades.map((x) => x.id)).toEqual(["a"]);
  });

  it("pulls only records changed after since", async () => {
    const a = createMemoryAdapter({
      arcades: [
        arcade("old", "2026-01-01T00:00:00.000Z"),
        arcade("new", "2026-03-01T00:00:00.000Z"),
      ],
      laps: [],
    });
    const delta = await a.pull("2026-02-01T00:00:00.000Z");
    expect(delta.arcades.map((x) => x.id)).toEqual(["new"]);
  });

  it("merges pushed changes into the store (last-write-wins)", async () => {
    const a = createMemoryAdapter({
      arcades: [arcade("a", "2026-01-01T00:00:00.000Z")],
      laps: [],
    });
    await a.push({
      arcades: [{ ...arcade("a", "2026-05-01T00:00:00.000Z"), name: "Renamed" }],
      laps: [],
    });
    expect(a.snapshot().arcades[0].name).toBe("Renamed");
  });
});
