import React, { useRef, useEffect, useState } from 'react';

interface Position {
  x: number;
  y: number;
}

interface WireSegment {
  xStart: number;
  yStart: number;
  xEnd: number;
  yEnd: number;
}

interface Wire {
  id: string;
  segments: WireSegment[];
  state: boolean;
  startPointId: string;
  endPointId: string;
}

interface ControlPoint {
  id: string;
  position: Position;
  state: boolean;
  type: 'control';
}

interface ControlledPoint {
  id: string;
  position: Position;
  state: boolean;
  type: 'controlled';
  controlledBy: string[];
}

type Point = ControlPoint | ControlledPoint;

const initialPoints: Point[] = [
  {
    id: 'control1',
    position: { x: 100, y: 100 },
    state: false,
    type: 'control',
  },
  {
    id: 'controlled1',
    position: { x: 300, y: 100 },
    state: false,
    type: 'controlled',
    controlledBy: ['control1']
  },

  // Одна управляющая -> две управляемые
  {
    id: 'control2',
    position: { x: 100, y: 300 },
    state: false,
    type: 'control',
  },
  {
    id: 'controlled2',
    position: { x: 300, y: 250 },
    state: false,
    type: 'controlled',
    controlledBy: ['control2']
  },
  {
    id: 'controlled3',
    position: { x: 300, y: 350 },
    state: false,
    type: 'controlled',
    controlledBy: ['control2']
  },

  // Две управляющие -> одна управляемая (логическое ИЛИ)
  {
    id: 'control3',
    position: { x: 100, y: 500 },
    state: false,
    type: 'control',
  },
  {
    id: 'control4',
    position: { x: 100, y: 600 },
    state: false,
    type: 'control',
  },
  {
    id: 'controlled4',
    position: { x: 300, y: 550 },
    state: false,
    type: 'controlled',
    controlledBy: ['control3', 'control4']
  },
];

// Функция для генерации сегментов провода (L-образная трассировка)
const generateWireSegments = (start: Position, end: Position): WireSegment[] => {
  // Создаем промежуточную точку для излома провода
  const midX = start.x + (end.x - start.x) / 2;

  return [
    { xStart: start.x, yStart: start.y, xEnd: midX, yEnd: start.y },
    { xStart: midX, yStart: start.y, xEnd: midX, yEnd: end.y },
    { xStart: midX, yStart: end.y, xEnd: end.x, yEnd: end.y }
  ];
};

// Функция для создания проводов на основе точек
const createWiresFromPoints = (points: Point[]): Wire[] => {
  const wires: Wire[] = [];

  points.forEach(point => {
    if (point.type === 'controlled') {
      point.controlledBy.forEach(controlId => {
        const controlPoint = points.find(p => p.id === controlId) as ControlPoint;
        if (controlPoint) {
          const wireId = `wire-${controlId}-to-${point.id}`;
          const segments = generateWireSegments(controlPoint.position, point.position);

          wires.push({
            id: wireId,
            segments,
            state: controlPoint.state,
            startPointId: controlId,
            endPointId: point.id
          });
        }
      });
    }
  });

  return wires;
};

const CanvasZoom: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scaleRef = useRef<number>(1);
  const offsetRef = useRef<Position>({ x: 0, y: 0 });
  const [points, setPoints] = useState<Point[]>(initialPoints);
  const [wires, setWires] = useState<Wire[]>([]);
  const pointsRef = useRef<Point[]>(initialPoints);
  const wiresRef = useRef<Wire[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const lastMousePosRef = useRef<Position>({ x: 0, y: 0 });

  // Инициализация проводов
  useEffect(() => {
    const initialWires = createWiresFromPoints(initialPoints);
    setWires(initialWires);
    wiresRef.current = initialWires;
  }, []);

  // Обновляем ref при изменении points
  useEffect(() => {
    pointsRef.current = points;
  }, [points]);

  // Обновляем ref при изменении wires
  useEffect(() => {
    wiresRef.current = wires;
  }, [wires]);

  // Функции преобразования координат
  const worldToScreen = (worldX: number, worldY: number): Position => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    return {
      x: (worldX - offsetRef.current.x) * scaleRef.current + canvas.width / 2,
      y: (worldY - offsetRef.current.y) * scaleRef.current + canvas.height / 2,
    };
  };

  const screenToWorld = (screenX: number, screenY: number): Position => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    return {
      x: (screenX - canvas.width / 2) / scaleRef.current + offsetRef.current.x,
      y: (screenY - canvas.height / 2) / scaleRef.current + offsetRef.current.y,
    };
  };

  // Функция для обновления состояния проводов и управляемых точек
  const updateWireAndControlledPoints = (controlPointId: string, newState: boolean) => {
    // Обновляем провода, исходящие из этой control точки
    setWires(prevWires =>
      prevWires.map(wire =>
        wire.startPointId === controlPointId
          ? { ...wire, state: newState }
          : wire
      )
    );

    // Обновляем controlled points по логике ИЛИ
    setPoints(prevPoints =>
      prevPoints.map(point => {
        if (point.type === 'controlled' && point.controlledBy.includes(controlPointId)) {
          // Для каждой управляемой точки проверяем ВСЕ её control точки
          const allControlPointsState = point.controlledBy.some(controlId => {
            const controlPoint = prevPoints.find(p => p.id === controlId) as ControlPoint;
            return controlPoint?.state || false;
          });

          return { ...point, state: allControlPointsState };
        }
        return point;
      })
    );
  };

  // Функции отрисовки
  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;

    // Оси координат
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 2;

    const originX = worldToScreen(0, 0).x;
    const originY = worldToScreen(0, 0).y;

    ctx.beginPath();
    ctx.moveTo(originX, 0);
    ctx.lineTo(originX, canvas.height);
    ctx.moveTo(0, originY);
    ctx.lineTo(canvas.width, originY);
    ctx.stroke();
  };

  const drawWires = (ctx: CanvasRenderingContext2D) => {
    wiresRef.current.forEach(wire => {
      ctx.strokeStyle = wire.state ? '#22c55e' : '#ef4444';
      ctx.lineWidth = 3 * scaleRef.current;
      ctx.lineCap = 'round';

      wire.segments.forEach(segment => {
        const start = worldToScreen(segment.xStart, segment.yStart);
        const end = worldToScreen(segment.xEnd, segment.yEnd);

        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      });
    });
  };

  const drawPoints = (ctx: CanvasRenderingContext2D) => {
    pointsRef.current.forEach(point => {
      const screenPos = worldToScreen(point.position.x, point.position.y);
      const pointSize = point.type === 'control' ? 12 : 10;
      const scaledSize = pointSize * scaleRef.current;

      // Основной круг точки
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, scaledSize / 2, 0, Math.PI * 2);

      if (point.type === 'control') {
        ctx.fillStyle = point.state ? '#22c55e' : '#ef4444';
      } else {
        ctx.fillStyle = point.state ? '#3b82f6' : '#6b7280';
      }

      ctx.fill();

      // Обводка точки
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 1 * scaleRef.current;
      ctx.stroke();

      // ID точки (для отладки)
      ctx.fillStyle = '#1f2937';
      ctx.font = `${10 * scaleRef.current}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText(point.id, screenPos.x, screenPos.y - scaledSize - 5);
    });
  };

  const draw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid(ctx);
    drawWires(ctx);
    drawPoints(ctx);
  };

  // Обработчики событий
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldBeforeZoom = screenToWorld(mouseX, mouseY);
    const zoomFactor = 1.07;
    const zoom = e.deltaY < 0 ? zoomFactor : 1 / zoomFactor;

    scaleRef.current *= zoom;

    const worldAfterZoom = screenToWorld(mouseX, mouseY);
    offsetRef.current.x += worldBeforeZoom.x - worldAfterZoom.x;
    offsetRef.current.y += worldBeforeZoom.y - worldAfterZoom.y;

    draw();
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsDragging(true);
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    canvas.style.cursor = 'grabbing';

    // Обработка клика по точкам
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const worldPos = screenToWorld(mouseX, mouseY);

    const searchRadius = 15 / scaleRef.current;

    const clickedPoint = pointsRef.current.find(point => {
      const distance = Math.sqrt(
        Math.pow(point.position.x - worldPos.x, 2) +
        Math.pow(point.position.y - worldPos.y, 2)
      );
      return distance <= searchRadius;
    });

    if (clickedPoint && clickedPoint.type === 'control') {
      const newState = !clickedPoint.state;

      setPoints(prevPoints =>
        prevPoints.map(point =>
          point.id === clickedPoint.id
            ? { ...point, state: newState }
            : point
        )
      );

      // Обновляем провода и управляемые точки
      updateWireAndControlledPoints(clickedPoint.id, newState);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isDragging) {
      const deltaX = e.clientX - lastMousePosRef.current.x;
      const deltaY = e.clientY - lastMousePosRef.current.y;

      offsetRef.current.x -= deltaX / scaleRef.current;
      offsetRef.current.y -= deltaY / scaleRef.current;

      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      draw();
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'default';
    }
  };

  // Эффекты
  useEffect(() => {
    draw();
  }, [points, wires]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      draw();
    };

    window.addEventListener('resize', handleResize);
    canvas.addEventListener('wheel', handleWheel);

    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Пересоздание проводов при изменении позиций точек
  useEffect(() => {
    const updatedWires = createWiresFromPoints(pointsRef.current);
    setWires(updatedWires);
  }, [points]);

  return (
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
  );
};

export default CanvasZoom;