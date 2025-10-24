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

const CanvasZoom: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scaleRef = useRef<number>(1);
  const offsetRef = useRef<Point>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const lastMousePosRef = useRef<Point>({ x: 0, y: 0 });
  
  // Генерация 5 случайных отрезков в формате [x1, y1, x2, y2]
  const generateRandomLines = (): Line[] => {
    const lines: Line[] = [];
    for (let i = 0; i < 5; i++) {
      const x1 = Math.random() * 400 - 200; // от -200 до 200
      const y1 = Math.random() * 400 - 200; // от -200 до 200
      const x2 = Math.random() * 400 - 200; // от -200 до 200
      const y2 = Math.random() * 400 - 200; // от -200 до 200
      lines.push({ x1, y1, x2, y2 });
    }
    return lines;
  };

  const linesRef = useRef<Line[]>(generateRandomLines());

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Очистка холста
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Сохранение состояния контекста
    ctx.save();
    
    // Применение трансформаций
    const scale = scaleRef.current;
    const offset = offsetRef.current;
    
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(scale, scale);
    ctx.translate(offset.x, offset.y);

    // Отрисовка осей координат (опционально)
    ctx.beginPath();
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1 / scale;

    ctx.moveTo(-1000, 0);
    ctx.lineTo(1000, 0);
    ctx.moveTo(0, -1000);
    ctx.lineTo(0, 1000);
    ctx.stroke();

    // Отрисовка линий
    ctx.beginPath();
    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 2 / scale;

    linesRef.current.forEach(line => {
      ctx.moveTo(line.x1, line.y1);
      ctx.lineTo(line.x2, line.y2);
    });

    ctx.stroke();
    
    // Отрисовка точек концов отрезков (опционально)
    ctx.fillStyle = 'red';
    linesRef.current.forEach(line => {
      ctx.beginPath();
      ctx.arc(line.x1, line.y1, 3 / scale, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(line.x2, line.y2, 3 / scale, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // Восстановление состояния
    ctx.restore();
  }, []);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Определяем направление зума
    const zoomFactor = 1.07;
    const zoom = e.deltaY < 0 ? zoomFactor : 1 / zoomFactor;

    // Текущие мировые координаты курсора
    const worldX = (mouseX - canvas.width / 2) / scaleRef.current - offsetRef.current.x;
    const worldY = (mouseY - canvas.height / 2) / scaleRef.current - offsetRef.current.y;

    // Применяем масштабирование
    scaleRef.current *= zoom;

    // Новые мировые координаты курсора после масштабирования
    const newWorldX = (mouseX - canvas.width / 2) / scaleRef.current - offsetRef.current.x;
    const newWorldY = (mouseY - canvas.height / 2) / scaleRef.current - offsetRef.current.y;

    // Корректируем смещение так, чтобы точка под курсором осталась на месте
    offsetRef.current.x += newWorldX - worldX;
    offsetRef.current.y += newWorldY - worldY;

    draw();
  }, [draw]);

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