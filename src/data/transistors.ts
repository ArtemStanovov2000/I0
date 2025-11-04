import type { Transistor } from "../types";

export const transistors: Transistor[] = [
  {
    source: false,
    drain: true,
    gate: false,
    id: "1",
    drainDependencies: [],
    sourceDependencies: [],
    position: {
      xCenter: 200,
      yCenter: 200,
      orientation: "up"
    }
  },
  {
    source: false,
    drain: true,
    gate: false,
    id: "2",
    drainDependencies: [],
    sourceDependencies: [],
    position: {
      xCenter: 400,
      yCenter: 200,
      orientation: "up"
    }
  }
];
