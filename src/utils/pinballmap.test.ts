import { describe, it, expect } from "vitest";
import { locationToArcade, stableArcadeId, stableMachineId } from "./pinballmap";
import type { PinballMapLocation } from "./pinballmap";

const location = (over: Partial<PinballMapLocation> = {}): PinballMapLocation => ({
  id: 1,
  name: "Ground Kontrol",
  street: "115 NW 5th Ave",
  city: "Portland",
  state: "OR",
  zip: "97209",
  country: "US",
  lat: "45.5",
  lon: "-122.6",
  num_machines: 0,
  ...over,
});

let nextXrefId = 1;
const xref = (name: string) => ({
  id: nextXrefId++,
  name,
  manufacturer: "",
  year: 0,
});

describe("locationToArcade", () => {
  it("returns null when there are no machines", () => {
    expect(locationToArcade(location(), "portland")).toBeNull();
  });

  it("returns null when all machine names are unknown", () => {
    const loc = location({ location_machine_xrefs: [xref("")] });
    expect(locationToArcade(loc, "portland")).toBeNull();
  });

  it("maps named machines and carries over pinball map metadata", () => {
    const loc = location({
      location_machine_xrefs: [xref("Medieval Madness"), xref("Twilight Zone")],
    });

    const arcade = locationToArcade(loc, "portland");

    expect(arcade).not.toBeNull();
    expect(arcade!.name).toBe("Ground Kontrol");
    expect(arcade!.machines.map((m) => m.name)).toEqual([
      "Medieval Madness",
      "Twilight Zone",
    ]);
    expect(arcade!.pinballMapId).toBe(1);
    expect(arcade!.pinballMapRegion).toBe("portland");
    expect(arcade!.address).toBe("115 NW 5th Ave, Portland, OR, 97209");
  });

  it("drops only the unnamed machines", () => {
    const loc = location({
      location_machine_xrefs: [xref("Attack from Mars"), xref("")],
    });
    const arcade = locationToArcade(loc, "portland");
    expect(arcade!.machines.map((m) => m.name)).toEqual(["Attack from Mars"]);
  });

  it("derives stable, deterministic ids from Pinball Map ids", () => {
    const xrefs = [
      { id: 10, name: "Medieval Madness", manufacturer: "", year: 0 },
      { id: 20, name: "Twilight Zone", manufacturer: "", year: 0 },
    ];
    const loc = location({ id: 7, location_machine_xrefs: xrefs });

    const a = locationToArcade(loc, "portland")!;
    const b = locationToArcade(loc, "portland")!;

    // Same source → identical ids on both imports (no duplicates on merge).
    expect(a.id).toBe("pm-7");
    expect(a).toEqual(b);
    expect(a.machines.map((m) => m.id)).toEqual([
      "pm-7-medieval-madness",
      "pm-7-twilight-zone",
    ]);
  });
});

describe("stable id helpers", () => {
  it("derives arcade id from the location id", () => {
    expect(stableArcadeId(42)).toBe("pm-42");
  });

  it("derives machine id from the location id and a name slug", () => {
    expect(stableMachineId(42, "Godzilla")).toBe("pm-42-godzilla");
  });

  it("normalizes punctuation and case in the slug", () => {
    expect(stableMachineId(42, "Attack From Mars!")).toBe(
      "pm-42-attack-from-mars",
    );
  });
});
