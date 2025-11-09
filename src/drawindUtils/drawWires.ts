import { worldToScreen } from "../coordinatesUtils";
import { Wires } from "../data/wires";
import type { Wire, WireSegment } from "../types";

export const drawWires = (ctx: CanvasRenderingContext2D, canvasRef: any, offsetRef: any) => {
    Wires.forEach((wire: Wire) => {
        wire.segments.forEach((segment: WireSegment) => {
            const startScreen = worldToScreen(segment.xStart, segment.yStart, canvasRef, offsetRef);
            const endScreen = worldToScreen(segment.xEnd, segment.yEnd, canvasRef, offsetRef);

            ctx.strokeStyle = 'gray';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(startScreen.x, startScreen.y);
            ctx.lineTo(endScreen.x, endScreen.y);
            ctx.stroke();
        });
    })
}