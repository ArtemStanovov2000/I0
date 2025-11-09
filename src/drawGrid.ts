import { TRANSISTOR_CONFIG } from "./constants";
import { worldToScreen } from "./coordinatesUtils";

export const drawGrid = (ctx: CanvasRenderingContext2D, canvasRef: any, offsetRef: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    ctx.strokeStyle = TRANSISTOR_CONFIG.COLORS.GRID;
    ctx.lineWidth = 1;

    const origin = worldToScreen(0, 0, canvasRef, offsetRef);

    ctx.beginPath();
    ctx.moveTo(origin.x, 0);
    ctx.lineTo(origin.x, canvas.height);
    ctx.moveTo(0, origin.y);
    ctx.lineTo(canvas.width, origin.y);
    ctx.stroke();
  }