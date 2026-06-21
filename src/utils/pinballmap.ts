import type { Arcade, Machine } from "../types";

const PINBALL_MAP_API = "https://pinballmap.com/api/v1";

export interface PinballMapLocation {
  id: number;
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  lat: string;
  lon: string;
  num_machines: number;
  location_machine_xrefs?: Array<{
    id: number;
    name: string;
    manufacturer: string;
    year: number;
  }>;
}

export interface PinballMapRegion {
  id: number;
  name: string;
  full_name: string;
  motd: string;
  lat: string;
  lon: string;
}

/**
 * Convert a Pinball Map location into an Arcade. Machines without a known name
 * are dropped; returns null when no usable machines remain.
 */
export const locationToArcade = (
  location: PinballMapLocation,
  regionName: string,
): Arcade | null => {
  const machines: Machine[] = (location.location_machine_xrefs ?? [])
    .map((xref) => ({
      id: crypto.randomUUID(),
      name: xref.name || "Unknown Machine",
    }))
    .filter((machine) => machine.name !== "Unknown Machine");

  if (machines.length === 0) return null;

  const address = [location.street, location.city, location.state, location.zip]
    .filter(Boolean)
    .join(", ");

  return {
    id: crypto.randomUUID(),
    name: location.name,
    machines,
    pinballMapId: location.id,
    pinballMapRegion: regionName,
    address,
  };
};

export const pinballMapAPI = {
  async searchRegions(query: string): Promise<PinballMapRegion[]> {
    try {
      const response = await fetch(`${PINBALL_MAP_API}/regions.json`);
      if (!response.ok) throw new Error("Failed to fetch regions");

      const data = await response.json();
      const regions: PinballMapRegion[] = data.regions || [];

      if (!query.trim()) return regions;

      const lowerQuery = query.toLowerCase();
      return regions.filter(
        (region) =>
          region.name.toLowerCase().includes(lowerQuery) ||
          region.full_name.toLowerCase().includes(lowerQuery)
      );
    } catch (error) {
      console.error("Error fetching regions:", error);
      return [];
    }
  },

  async searchLocations(
    regionName: string,
    query?: string
  ): Promise<PinballMapLocation[]> {
    try {
      let url = `${PINBALL_MAP_API}/region/${encodeURIComponent(
        regionName
      )}/locations.json`;

      if (query?.trim()) {
        url += `?by_location_name=${encodeURIComponent(query)}`;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch locations");

      const data = await response.json();
      return data.locations || [];
    } catch (error) {
      console.error("Error fetching locations:", error);
      return [];
    }
  },

  async getLocationDetails(
    regionName: string,
    locationId: number
  ): Promise<PinballMapLocation | null> {
    try {
      const response = await fetch(
        `${PINBALL_MAP_API}/region/${encodeURIComponent(
          regionName
        )}/locations/${locationId}.json`
      );

      if (!response.ok) throw new Error("Failed to fetch location details");

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching location details:", error);
      return null;
    }
  },

  async getLocationWithMachines(
    _regionName: string,
    locationId: number
  ): Promise<PinballMapLocation | null> {
    try {
      // First get the location details
      const locationResponse = await fetch(
        `${PINBALL_MAP_API}/locations/${locationId}.json`
      );

      if (!locationResponse.ok)
        throw new Error("Failed to fetch location details");

      const locationData = await locationResponse.json();

      // Then get the machine details separately
      try {
        const machinesResponse = await fetch(
          `${PINBALL_MAP_API}/locations/${locationId}/machine_details.json`
        );

        if (machinesResponse.ok) {
          const machinesData = await machinesResponse.json();
          // Merge machine details into location data
          return {
            ...locationData,
            location_machine_xrefs: machinesData.machines || [],
          };
        }
      } catch (machineError) {
        console.warn(
          "Machine details not available, using basic location data:",
          machineError
        );
      }

      // Return location data with location_machine_xrefs from basic data if available
      // Otherwise return empty array to prevent undefined errors
      return {
        ...locationData,
        location_machine_xrefs: locationData.location_machine_xrefs,
      };
    } catch (error) {
      console.error("Error fetching location:", error);
      return null;
    }
  },
};
