import { TRANSISTOR_CONFIG } from "./constants";
import type { PositionPoint } from './types';

export const drawConnection = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  isActive: boolean
) => {
  ctx.beginPath();
  ctx.arc(x, y, TRANSISTOR_CONFIG.DIMENSIONS.CONNECTION_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = isActive ? TRANSISTOR_CONFIG.COLORS.TRUE : TRANSISTOR_CONFIG.COLORS.FALSE;
  ctx.fill();
};

export const drawTransistorBody = (
  ctx: CanvasRenderingContext2D,
  position: PositionPoint,
  orientation: string
) => {
  const { WIDTH, HEIGHT } = TRANSISTOR_CONFIG.DIMENSIONS;

  ctx.lineWidth = 1;
  ctx.fillStyle = TRANSISTOR_CONFIG.COLORS.BODY;

  if (orientation === "down" || orientation === "up") {
    ctx.fillRect(position.x - WIDTH / 2, position.y - HEIGHT / 2, WIDTH, HEIGHT);
  } else {
    ctx.fillRect(position.x - HEIGHT / 2, position.y - WIDTH / 2, HEIGHT, WIDTH);
  }
};

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