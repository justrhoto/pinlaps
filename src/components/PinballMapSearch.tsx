import { useState, useEffect } from "react";
import { pinballMapAPI } from "../utils/pinballmap";
import type {
  PinballMapLocation,
  PinballMapRegion,
} from "../utils/pinballmap";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";
import {
  ArrowLeft,
  Search,
  MapPin,
  Gamepad2,
  ChevronRight,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ScrollArea } from "./ui/scroll-area";

interface PinballMapSearchProps {
  onImport: (location: PinballMapLocation, regionName: string) => void;
  onBack: () => void;
}

export function PinballMapSearch({ onImport, onBack }: PinballMapSearchProps) {
  const [searchMode, setSearchMode] = useState<"region" | "location">("region");
  const [regionQuery, setRegionQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [regions, setRegions] = useState<PinballMapRegion[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<PinballMapRegion | null>(
    null
  );
  const [locations, setLocations] = useState<PinballMapLocation[]>([]);
  const [loadingRegions, setLoadingRegions] = useState(true);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [importingLocation, setImportingLocation] = useState<number | null>(
    null
  );

  useEffect(() => {
    loadRegions();
  }, []);

  const loadRegions = async () => {
    setLoadingRegions(true);
    const data = await pinballMapAPI.searchRegions("");
    setRegions(data);
    setLoadingRegions(false);
  };

  const handleRegionSearch = async () => {
    setLoadingRegions(true);
    const data = await pinballMapAPI.searchRegions(regionQuery);
    setRegions(data);
    setLoadingRegions(false);
  };

  const handleSelectRegion = async (region: PinballMapRegion) => {
    setSelectedRegion(region);
    setSearchMode("location");
    setLoadingLocations(true);
    const data = await pinballMapAPI.searchLocations(region.name);
    data.sort((a, b) => {
      return b.num_machines - a.num_machines;
    });
    setLocations(data);
    setLoadingLocations(false);
  };

  const handleLocationSearch = async () => {
    if (!selectedRegion) return;
    setLoadingLocations(true);
    const data = await pinballMapAPI.searchLocations(
      selectedRegion.name,
      locationQuery
    );
    setLocations(data);
    setLoadingLocations(false);
  };

  const handleImportLocation = async (location: PinballMapLocation) => {
    if (!selectedRegion) return;

    setImportingLocation(location.id);
    const detailedLocation = await pinballMapAPI.getLocationWithMachines(
      selectedRegion.name,
      location.id
    );
    setImportingLocation(null);

    if (detailedLocation) {
      onImport(detailedLocation, selectedRegion.name);
    }
  };

  const filteredRegions = regionQuery.trim()
    ? regions.filter(
        (r) =>
          r.name.toLowerCase().includes(regionQuery.toLowerCase()) ||
          r.full_name.toLowerCase().includes(regionQuery.toLowerCase())
      )
    : regions;

  const filteredLocations = locationQuery.trim()
    ? locations.filter((l) =>
        l.name.toLowerCase().includes(locationQuery.toLowerCase())
      )
    : locations;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      <div>
        <h1>Import from Pinball Map</h1>
        <p className="text-muted-foreground">
          Search for arcades and import their pinball machines
        </p>
      </div>

      <Tabs
        value={searchMode}
        onValueChange={(v: string) => setSearchMode(v as "region" | "location")}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="region">
            1. Select Region
            {selectedRegion && (
              <Badge className="ml-2" variant="secondary">
                ✓
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="location" disabled={!selectedRegion}>
            2. Select Location
          </TabsTrigger>
        </TabsList>

        <TabsContent value="region" className="space-y-4">
          {selectedRegion && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{selectedRegion.full_name}</span>
                    </div>
                    <p className="text-muted-foreground mt-1">
                      Selected region
                    </p>
                  </div>
                  <Button onClick={() => setSearchMode("location")}>
                    Continue
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            <Label htmlFor="region-search">Search Regions</Label>
            <div className="flex gap-2">
              <Input
                id="region-search"
                value={regionQuery}
                onChange={(e) => setRegionQuery(e.target.value)}
                placeholder="Search by city, state, or country..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleRegionSearch();
                  }
                }}
              />
              <Button onClick={handleRegionSearch} disabled={loadingRegions}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[500px] border rounded-lg">
            <div className="p-4 space-y-2">
              {loadingRegions ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))
              ) : filteredRegions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No regions found
                </div>
              ) : (
                filteredRegions.map((region) => (
                  <Card
                    key={region.id}
                    className={`cursor-pointer hover:bg-accent transition-colors ${
                      selectedRegion?.id === region.id
                        ? "border-primary bg-primary/5"
                        : ""
                    }`}
                    onClick={() => handleSelectRegion(region)}
                  >
                    <CardHeader className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">
                            {region.full_name}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            <MapPin className="inline h-3 w-3 mr-1" />
                            {region.name}
                          </CardDescription>
                        </div>
                        {selectedRegion?.id === region.id && (
                          <Badge variant="default">Selected</Badge>
                        )}
                      </div>
                    </CardHeader>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="location" className="space-y-4">
          {selectedRegion && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{selectedRegion.full_name}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchMode("region");
                      setSelectedRegion(null);
                      setLocations([]);
                    }}
                  >
                    Change Region
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            <Label htmlFor="location-search">Search Locations</Label>
            <div className="flex gap-2">
              <Input
                id="location-search"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                placeholder="Search arcade name..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleLocationSearch();
                  }
                }}
              />
              <Button
                onClick={handleLocationSearch}
                disabled={loadingLocations}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[500px] border rounded-lg">
            <div className="p-4 space-y-2">
              {loadingLocations ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))
              ) : filteredLocations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {locationQuery.trim()
                    ? "No locations found"
                    : "Search for locations"}
                </div>
              ) : (
                filteredLocations.map((location) => (
                  <Card
                    key={location.id}
                    className="hover:bg-accent transition-colors"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base">
                            {location.name}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {location.street && (
                              <>
                                {location.street}
                                <br />
                              </>
                            )}
                            {location.city}, {location.state} {location.zip}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">
                          <Gamepad2 className="mr-1 h-3 w-3" />
                          {location.num_machines || 0}{" "}
                          {location.num_machines === 1 ? "machine" : "machines"}
                        </Badge>
                        <Button
                          onClick={() => handleImportLocation(location)}
                          disabled={
                            importingLocation === location.id ||
                            location.num_machines === 0
                          }
                        >
                          {importingLocation === location.id
                            ? "Importing..."
                            : "Import"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
