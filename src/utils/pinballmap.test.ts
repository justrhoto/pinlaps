import { describe, it, expect } from "vitest";
import { locationToArcade } from "./pinballmap";
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

const xref = (name: string) => ({ id: 1, name, manufacturer: "", year: 0 });

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
});
