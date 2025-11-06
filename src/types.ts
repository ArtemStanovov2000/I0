export interface PositionPoint {
    x: number;
    y: number;
}

export interface TransistorPosition {
    xCenter: number;
    yCenter: number;
    orientation: "down" | "left" | "right" | "up";
}

export interface Transistor {
    source: boolean;
    drain: boolean;
    gate: boolean;
    id: string;
    drainDependencies: string[];
    sourceDependencies: string[];
    position: TransistorPosition;
}

export interface WireSegment {
    xStart: number;
    yStart: number;
    xEnd: number;
    yEnd: number;
}

export interface Wire {
    segments: WireSegment[];
    startTransistorId: string;
    endTransistorId?: string;
    startPoint: 'drain';
    endPoint?: 'source' | 'gate';
    id: string;
}