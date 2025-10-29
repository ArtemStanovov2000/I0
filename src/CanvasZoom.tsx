import React, { useRef, useEffect, useState, useCallback } from 'react';
import { handleCanvasZoom } from './logic/spaceParameters/handleCanvasZoom';

// Базовые интерфейсы
interface Position {
  x: number;
  y: number;
}

// Точки теперь имеют тип - управляющая или управляемая
interface ControlPoint {
  id: string;
  position: Position;
  state: boolean;
  type: 'control'; // управляющая точка
}

interface ControlledPoint {
  id: string;
  position: Position;
  state: boolean;
  type: 'controlled'; // управляемая точка
  controlledBy: string; // ID управляющей точки
}

type Point = ControlPoint | ControlledPoint;

interface WireSegment {
  start: Position;
  end: Position;
}

interface Wire {
  id: string;
  startPointId: string; // ID управляющей точки
  endPointId: string;   // ID управляемой точки
  segments: WireSegment[];
  state: boolean;
}

// Тестовые данные
const initialPoints: Point[] = [
  {
    id: 'control1',
    position: { x: 530, y: 120 },
    state: false,
    type: 'control'
  },
  {
    id: 'controlled1',
    position: { x: -127, y: 364 },
    state: false,
    type: 'controlled',
    controlledBy: 'control1'
  },
  {
    id: 'control2',
    position: { x: 200, y: 300 },
    state: false,
    type: 'control'
  },
  {
    id: 'controlled2',
    position: { x: 400, y: 200 },
    state: false,
    type: 'controlled',
    controlledBy: 'control2'
  },
];

const initialWires: Wire[] = [
  {
    id: 'wire1',
    startPointId: 'control1',
    endPointId: 'controlled1',
    segments: [
      { start: { x: 530, y: 120 }, end: { x: 200, y: 120 } },
      { start: { x: 200, y: 120 }, end: { x: 200, y: 364 } },
      { start: { x: 200, y: 364 }, end: { x: -127, y: 364 } },
    ],
    state: false,
  },
  {
    id: 'wire2',
    startPointId: 'control2',
    endPointId: 'controlled2',
    segments: [
      { start: { x: 200, y: 300 }, end: { x: 300, y: 300 } },
      { start: { x: 300, y: 300 }, end: { x: 300, y: 200 } },
      { start: { x: 300, y: 200 }, end: { x: 400, y: 200 } },
    ],
    state: false,
  },
];

const CanvasZoom: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scaleRef = useRef<number>(1);
  const offsetRef = useRef<Position>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const lastMousePosRef = useRef<Position>({ x: 0, y: 0 });

  // Состояния для точек и проводов
  const [points, setPoints] = useState<Point[]>(initialPoints);
  const [wires, setWires] = useState<Wire[]>(initialWires);

  // Преобразование координат
  const worldToScreen = useCallback((worldX: number, worldY: number): Position => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    return {
      x: (worldX - offsetRef.current.x) * scaleRef.current + canvas.width / 2,
      y: (worldY - offsetRef.current.y) * scaleRef.current + canvas.height / 2,
    };
  }, []);

  const screenToWorld = useCallback((screenX: number, screenY: number): Position => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    return {
      x: (screenX - canvas.width / 2) / scaleRef.current + offsetRef.current.x,
      y: (screenY - canvas.height / 2) / scaleRef.current + offsetRef.current.y,
    };
  }, []);

  // Функция для обновления состояния управляющей точки
  const updateControlPointState = useCallback((pointId: string, newState: boolean) => {
    setPoints(prevPoints => {
      const updatedPoints = prevPoints.map(point => {
        if (point.id === pointId && point.type === 'control') {
          return { ...point, state: newState };
        }
        return point;
      });

      // Обновляем все управляемые точки, связанные с этой управляющей
      const controlledPoints = updatedPoints.filter(
        (p): p is ControlledPoint => p.type === 'controlled' && p.controlledBy === pointId
      );

      controlledPoints.forEach(controlledPoint => {
        const wire = wires.find(w =>
          w.startPointId === pointId && w.endPointId === controlledPoint.id
        );

        if (wire) {
          // Обновляем состояние провода
          setWires(prevWires =>
            prevWires.map(w =>
              w.id === wire.id ? { ...w, state: newState } : w
            )
          );

          // Обновляем управляемую точку
          const pointIndex = updatedPoints.findIndex(p => p.id === controlledPoint.id);
          if (pointIndex !== -1) {
            (updatedPoints[pointIndex] as ControlledPoint).state = newState;
          }
        }
      });

      return updatedPoints;
    });
  }, [wires]);

  // Функция для получения цвета точки в зависимости от типа и состояния
  const getPointColor = (point: Point): string => {
    if (point.type === 'control') {
      return point.state ? '#22c55e' : '#ef4444'; // зеленый/красный для управляющих
    } else {
      return point.state ? '#3b82f6' : '#6b7280'; // синий/серый для управляемых
    }
  };

  // Функция для получения размера точки в зависимости от типа
  const getPointSize = (point: Point): number => {
    return point.type === 'control' ? 12 : 10; // управляющие точки немного больше
  };

  // Отрисовка точек
  const drawPoints = useCallback((ctx: CanvasRenderingContext2D) => {
    points.forEach(point => {
      const screenPos = worldToScreen(point.position.x, point.position.y);
      const pointSize = getPointSize(point) * scaleRef.current;

      // Рисуем точку
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, pointSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = getPointColor(point);
      ctx.fill();

      // Обводка
      ctx.strokeStyle = point.state ? '#000000' : '#666666';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Подпись точки
      ctx.fillStyle = point.state ? '#000000' : '#666666';
      ctx.font = `${10 * scaleRef.current}px Arial`;
      ctx.fillText(
        point.id,
        screenPos.x + pointSize / 2 + 2,
        screenPos.y - pointSize / 2
      );

      // Специальная метка для управляющих точек
      if (point.type === 'control') {
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, (pointSize / 2) * 0.7, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    });
  }, [points, worldToScreen]);

  // Отрисовка проводов
  const drawWires = useCallback((ctx: CanvasRenderingContext2D) => {
    wires.forEach(wire => {
      const startPoint = points.find(p => p.id === wire.startPointId);
      const endPoint = points.find(p => p.id === wire.endPointId);

      if (!startPoint || !endPoint) return;

      // Цвет провода зависит от состояния
      ctx.strokeStyle = wire.state ? '#3b82f6' : '#9ca3af';
      ctx.lineWidth = 3 * scaleRef.current;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Рисуем все сегменты провода
      wire.segments.forEach(segment => {
        const startScreen = worldToScreen(segment.start.x, segment.start.y);
        const endScreen = worldToScreen(segment.end.x, segment.end.y);

        ctx.beginPath();
        ctx.moveTo(startScreen.x, startScreen.y);
        ctx.lineTo(endScreen.x, endScreen.y);
        ctx.stroke();
      });
      
    });
  }, [wires, points, worldToScreen]);

  // Отрисовка сетки
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;

    // Оси координат
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 2;

    const originX = worldToScreen(0, 0).x;
    const originY = worldToScreen(0, 0).y;

    ctx.beginPath();
    ctx.moveTo(originX, 0);
    ctx.lineTo(originX, canvas.height);
    ctx.moveTo(0, originY);
    ctx.lineTo(canvas.width, originY);
    ctx.stroke();
  }, [worldToScreen]);

  // Основная функция отрисовки
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid(ctx);
    drawWires(ctx);
    drawPoints(ctx);
  }, [drawGrid, drawWires, drawPoints]);

  // Обработчик клика по точке (только для управляющих точек)
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Ищем кликнутую управляющую точку
    const clickedPoint = points.find(point => {
      if (point.type !== 'control') return false; // Только управляющие точки

      const screenPos = worldToScreen(point.position.x, point.position.y);
      const pointSize = getPointSize(point) * scaleRef.current;
      const distance = Math.sqrt(
        Math.pow(mouseX - screenPos.x, 2) + Math.pow(mouseY - screenPos.y, 2)
      );
      return distance <= pointSize / 2;
    }) as ControlPoint | undefined;

    if (clickedPoint) {
      // Переключаем состояние только управляющей точки
      updateControlPointState(clickedPoint.id, !clickedPoint.state);
    }
  }, [points, worldToScreen, updateControlPointState]);

  // Обработчики масштабирования и панорамирования (остаются прежними)
  const handleWheel = useCallback((e: WheelEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    handleCanvasZoom(e, canvas, scaleRef, offsetRef, screenToWorld, draw);
  }, [screenToWorld, draw]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'grabbing';
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;

    const deltaX = e.clientX - lastMousePosRef.current.x;
    const deltaY = e.clientY - lastMousePosRef.current.y;

    offsetRef.current.x -= deltaX / scaleRef.current;
    offsetRef.current.y -= deltaY / scaleRef.current;

    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    draw();
  }, [isDragging, draw]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'crosshair';
    }
  }, []);

  // useEffect для подписки на события
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      draw();
    };

    window.addEventListener('resize', resize);
    canvas.addEventListener('wheel', handleWheel);

    resize();

    return () => {
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel, draw]);

  // Перерисовываем при изменении точек или проводов
  useEffect(() => {
    draw();
  }, [points, wires, draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        background: '#f8fafc',
        cursor: 'crosshair'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleCanvasClick}
    />
  );
};

export default CanvasZoom;