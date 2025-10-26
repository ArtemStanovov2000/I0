import React, { useRef, useEffect, useCallback, useState } from 'react';

interface Point {
  x: number;
  y: number;
}

interface Line {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// Мировые координаты элементов
const worldElements = [
  { type: 'circle', x: 530, y: 120, diameter: 10, color: 'red' },
  { type: 'circle', x: -127, y: 764, diameter: 10, color: 'red' }
];

const CanvasZoom: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scaleRef = useRef<number>(1);
  const offsetRef = useRef<Point>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const lastMousePosRef = useRef<Point>({ x: 0, y: 0 });

  // Преобразование мировых координат в экранные
  const worldToScreen = useCallback((worldX: number, worldY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const scale = scaleRef.current;
    const offset = offsetRef.current;

    return {
      x: (offset.x - worldX) * scale + canvas.width / 2,
      y: (offset.y - worldY) * scale + canvas.height / 2
    };
  }, []);

  // Преобразование экранных координат в мировые
  const screenToWorld = useCallback((screenX: number, screenY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const scale = scaleRef.current;
    const offset = offsetRef.current;

    return {
      x: (screenX - canvas.width / 2) / scale + offset.x,
      y: (screenY - canvas.height / 2) / scale + offset.y
    };
  }, []);

  // Отрисовка элементов в мировых координатах
  const drawWorldElements = useCallback((ctx: CanvasRenderingContext2D) => {
    const scale = scaleRef.current;

    worldElements.forEach(element => {
      if (element.type === 'circle') {
        const screenPos = worldToScreen(element.x, element.y);
        const screenDiameter = element.diameter * scale;

        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, screenDiameter / 2, 0, Math.PI * 2);
        ctx.fillStyle = element.color;
        ctx.fill();
      }
    });
  }, [worldToScreen]);

  // Отрисовка сетки/осей в мировых координатах
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    const scale = scaleRef.current;
    const offset = offsetRef.current;

    ctx.save();
    ctx.translate(canvasRef.current!.width / 2, canvasRef.current!.height / 2);
    ctx.scale(scale, scale);
    ctx.translate(offset.x, offset.y);

    // Отрисовка осей координат
    ctx.beginPath();
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1 / scale;

    // Горизонтальная ось
    ctx.moveTo(-1000, 0);
    ctx.lineTo(1000, 0);

    // Вертикальная ось
    ctx.moveTo(0, -1000);
    ctx.lineTo(0, 1000);

    ctx.stroke();
    ctx.restore();
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Очистка холста
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Отрисовка сетки
    drawGrid(ctx);

    // Отрисовка мировых элементов
    drawWorldElements(ctx);
  }, [drawGrid, drawWorldElements]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Получаем мировые координаты курсора до масштабирования
    const worldBeforeZoom = screenToWorld(mouseX, mouseY);

    // Определяем направление зума
    const zoomFactor = 1.07;
    const zoom = e.deltaY < 0 ? zoomFactor : 1 / zoomFactor;

    // Применяем масштабирование
    scaleRef.current *= zoom;

    // Получаем мировые координаты курсора после масштабирования
    const worldAfterZoom = screenToWorld(mouseX, mouseY);

    // Корректируем смещение так, чтобы точка под курсором осталась на месте
    offsetRef.current.x += worldAfterZoom.x - worldBeforeZoom.x;
    offsetRef.current.y += worldAfterZoom.y - worldBeforeZoom.y;

    draw();
  }, [draw, screenToWorld]);

  // Добавляем обработчики для панинга
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return; // Только левая кнопка мыши

    setIsDragging(true);
    lastMousePosRef.current = {
      x: e.clientX,
      y: e.clientY
    };

    // Меняем курсор на "grabbing"
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'grabbing';
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;

    const currentMousePos = {
      x: e.clientX,
      y: e.clientY
    };

    // Вычисляем разницу в перемещении
    const deltaX = currentMousePos.x - lastMousePosRef.current.x;
    const deltaY = currentMousePos.y - lastMousePosRef.current.y;

    // Обновляем смещение с учетом масштаба
    offsetRef.current.x += deltaX / scaleRef.current;
    offsetRef.current.y += deltaY / scaleRef.current;

    // Обновляем последнюю позицию мыши
    lastMousePosRef.current = currentMousePos;

    draw();
  }, [isDragging, draw]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);

    // Возвращаем обычный курсор
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'crosshair';
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);

    // Возвращаем обычный курсор
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'crosshair';
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      draw();
    };

    // Обработчики событий
    window.addEventListener('resize', resize);
    canvas.addEventListener('wheel', handleWheel);

    resize();

    return () => {
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [draw, handleWheel]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        background: '#f5f5f5',
        cursor: 'crosshair'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    />
  );
};

export default CanvasZoom;