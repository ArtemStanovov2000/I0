import React, { useRef, useEffect, useState, useCallback } from 'react';
import { drawConnection, drawTransistorBody, getConnectionPositions } from './drawingUtils';
import { TRANSISTOR_CONFIG } from './constants';
import { transistors } from './data/transistors';
import type { PositionPoint, Transistor } from './types';

const CanvasDrag: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offsetRef = useRef<PositionPoint>({ x: 0, y: 0 });
  const lastMousePosRef = useRef<PositionPoint>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);

  const worldToScreen = useCallback((worldX: number, worldY: number): PositionPoint => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    return {
      x: offsetRef.current.x + canvas.width / 2 - worldX,
      y: offsetRef.current.y + canvas.height / 2 - worldY,
    };
  }, []);

  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    ctx.strokeStyle = TRANSISTOR_CONFIG.COLORS.GRID;
    ctx.lineWidth = 1;

    const origin = worldToScreen(0, 0);

    ctx.beginPath();
    ctx.moveTo(origin.x, 0);
    ctx.lineTo(origin.x, canvas.height);
    ctx.moveTo(0, origin.y);
    ctx.lineTo(canvas.width, origin.y);
    ctx.stroke();
  }, [worldToScreen]);

  const findConnectionUnderCursor = useCallback((mouseX: number, mouseY: number): { transistor: Transistor; connection: 'source' | 'drain' | 'gate' } | null => {
    for (const transistor of transistors) {
      const screenPos = worldToScreen(transistor.position.xCenter, transistor.position.yCenter);
      const connections = getConnectionPositions(screenPos, transistor.position.orientation);
      const hitRadius = 9;
      const connectionTypes = ['source', 'drain', 'gate'] as const;

      for (const connectionType of connectionTypes) {
        const connection = connections[connectionType];
        const distance = Math.sqrt(
          Math.pow(mouseX - connection.x, 2) +
          Math.pow(mouseY - connection.y, 2)
        );

        if (distance <= hitRadius) {
          return { transistor, connection: connectionType };
        }
      }
    }

    return null;
  }, [worldToScreen]);

  const drawTransistor = useCallback((ctx: CanvasRenderingContext2D, transistor: Transistor) => {
    const position = worldToScreen(transistor.position.xCenter, transistor.position.yCenter);

    drawTransistorBody(ctx, position, transistor.position.orientation);

    const connectionPositions = getConnectionPositions(position, transistor.position.orientation);

    drawConnection(ctx, connectionPositions.source.x, connectionPositions.source.y, transistor.source);
    drawConnection(ctx, connectionPositions.drain.x, connectionPositions.drain.y, transistor.drain);
    drawConnection(ctx, connectionPositions.gate.x, connectionPositions.gate.y, transistor.gate);
  }, [worldToScreen]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid(ctx);
    transistors.forEach(transistor => drawTransistor(ctx, transistor));
  }, [drawGrid, drawTransistor]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isDrawingMode) {
      const connectionUnderCursor = findConnectionUnderCursor(mouseX, mouseY);

      if (connectionUnderCursor) {
        console.log(`Найден вывод: ${connectionUnderCursor.connection} транзистора ${connectionUnderCursor.transistor.id}`);
        // Начинаем рисовать линию от этого вывода
      }
    } else {
      setIsDragging(true);
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      canvas.style.cursor = 'grabbing';
    }
  }, [isDrawingMode, findConnectionUnderCursor]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isDrawingMode) {
      const connectionUnderCursor = findConnectionUnderCursor(mouseX, mouseY);

      if (connectionUnderCursor) {
        canvas.style.cursor = 'crosshair';
      } else {
        canvas.style.cursor = 'default';
      }
    } else {
      if (!isDragging) return;
      const deltaX = e.clientX - lastMousePosRef.current.x;
      const deltaY = e.clientY - lastMousePosRef.current.y;

      offsetRef.current.x += deltaX;
      offsetRef.current.y += deltaY;

      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      requestAnimationFrame(draw);
    }
  }, [isDrawingMode, isDragging, findConnectionUnderCursor, draw]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'default';
    }
  }, []);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      draw();
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  return (
    <div style={{position: 'relative'}}>
      <button
        onClick={() => setIsDrawingMode(!isDrawingMode)}
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          background: isDrawingMode ? '#4CAF50' : '#f44336',
          color: 'white',
          padding: '10px',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        {isDrawingMode ? 'Режим рисования (активен)' : 'Начать рисование'}
      </button>
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          background: '#f8fafc',
          cursor: isDragging ? 'grabbing' : 'default'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
};

export default CanvasDrag;