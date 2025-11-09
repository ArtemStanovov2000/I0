import { TRANSISTOR_CONFIG } from "./constants";
import type { PositionPoint } from './types';

export const getConnectionPositions = (
  position: PositionPoint, 
  orientation: string
) => {
  const { WIDTH, HEIGHT } = TRANSISTOR_CONFIG.DIMENSIONS;

  const positions = {
    down: {
      source: { x: position.x - WIDTH / 2, y: position.y },
      drain: { x: position.x + WIDTH / 2, y: position.y },
      gate: { x: position.x, y: position.y + HEIGHT / 2 }
    },
    up: {
      source: { x: position.x + WIDTH / 2, y: position.y },
      drain: { x: position.x - WIDTH / 2, y: position.y },
      gate: { x: position.x, y: position.y - HEIGHT / 2 }
    },
    left: {
      source: { x: position.x, y: position.y + WIDTH / 2 },
      drain: { x: position.x, y: position.y - WIDTH / 2 },
      gate: { x: position.x - HEIGHT / 2, y: position.y }
    },
    right: {
      source: { x: position.x, y: position.y - WIDTH / 2 },
      drain: { x: position.x, y: position.y + WIDTH / 2 },
      gate: { x: position.x + HEIGHT / 2, y: position.y }
    }
  };

  return positions[orientation as keyof typeof positions];
};