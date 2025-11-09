import type { PositionPoint } from "./types";

export const worldToScreen = (worldX: number, worldY: number, canvasRef: any, offsetRef: any): PositionPoint => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    return {
        x: offsetRef.current.x + canvas.width / 2 - worldX,
        y: offsetRef.current.y + canvas.height / 2 - worldY,
    };
};

export const screenToWorld = (screenX: number, screenY: number, canvasRef: any, offsetRef: any): PositionPoint => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    return {
        x: offsetRef.current.x + canvas.width / 2 - screenX,
        y: offsetRef.current.y + canvas.height / 2 - screenY,
    };
};