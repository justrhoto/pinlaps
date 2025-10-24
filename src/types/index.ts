export interface Machine {
  id: string;
  name: string;
}

export interface Arcade {
  id: string;
  name: string;
  machines: Machine[];
  pinballMapId?: number;
  pinballMapRegion?: string;
  address?: string;
}

export interface Score {
  machineId: string;
  machineName: string;
  score: number;
}

export interface Lap {
  id: string;
  arcadeId: string;
  arcadeName: string;
  date: string;
  scores: Score[];
}

export interface MachineStats {
  machineId: string;
  machineName: string;
  scores: number[];
  median: number;
  average: number;
  best: number;
  lapCount: number;
}
