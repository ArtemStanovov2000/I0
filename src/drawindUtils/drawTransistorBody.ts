import { TRANSISTOR_CONFIG } from "../constants";
import { worldToScreen } from "../coordinatesUtils";
import { getConnectionPositions } from "../getConnectionPositions";
import type { PositionPoint, Transistor } from "../types";

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

export const drawTransistor = (ctx: CanvasRenderingContext2D, transistor: Transistor, canvasRef: any, offsetRef: any) => {
    const position = worldToScreen(transistor.position.xCenter, transistor.position.yCenter, canvasRef, offsetRef);

    drawTransistorBody(ctx, position, transistor.position.orientation);

    const connectionPositions = getConnectionPositions(position, transistor.position.orientation);

    drawConnection(ctx, connectionPositions.source.x, connectionPositions.source.y, transistor.source);
    drawConnection(ctx, connectionPositions.drain.x, connectionPositions.drain.y, transistor.drain);
    drawConnection(ctx, connectionPositions.gate.x, connectionPositions.gate.y, transistor.gate);
  }