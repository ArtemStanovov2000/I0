import type { PositionPoint, Transistor } from './types';
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { getConnectionPositions } from './getConnectionPositions';
import { drawTransistor } from './drawindUtils/drawTransistorBody';
import { transistors } from './data/transistors';
import { drawWires } from './drawindUtils/drawWires';
import { Wires } from './data/wires';
import { worldToScreen, screenToWorld } from './coordinatesUtils';
import { drawGrid } from './drawGrid';

// Константы
const GRID_STEP = 10; // Шаг сетки в пикселях

const CanvasDrag: React.FC = () => {
  // Рефы для хранения состояния, которое не требует перерисовки
  const canvasRef = useRef<HTMLCanvasElement>(null); // Ссылка на canvas элемент
  const offsetRef = useRef<PositionPoint>({ x: 0, y: 0 }); // Смещение холста для перетаскивания
  const lastMousePosRef = useRef<PositionPoint>({ x: 0, y: 0 }); // Последняя позиция мыши для расчета дельты перетаскивания

  // Состояния компонента
  const [isDragging, setIsDragging] = useState(false); // Режим перетаскивания холста
  const [isDrawingMode, setIsDrawingMode] = useState(true); // Режим рисования проводов
  const [currentWire, setCurrentWire] = useState<any>(null); // Текущий рисуемый провод
  const [tempEndPoint, setTempEndPoint] = useState<PositionPoint | null>(null); // Временная конечная точка для предпросмотра

  // Функция для привязки точки к сетке
  const snapToGrid = useCallback((point: PositionPoint): PositionPoint => {
    return {
      x: Math.round(point.x / GRID_STEP) * GRID_STEP,
      y: Math.round(point.y / GRID_STEP) * GRID_STEP
    };
  }, []);

  // Функция для определения ориентации сегмента (горизонтальный/вертикальный)
  const calculateSegmentEnd = useCallback((start: PositionPoint, end: PositionPoint): PositionPoint => {
    const deltaX = Math.abs(end.x - start.x);
    const deltaY = Math.abs(end.y - start.y);

    // Определяем, будет ли сегмент горизонтальным или вертикальным
    // на основе большего смещения
    if (deltaX > deltaY) {
      // Горизонтальный сегмент - сохраняем Y, привязываем X к сетке
      return {
        x: Math.round(end.x / GRID_STEP) * GRID_STEP,
        y: start.y
      };
    } else {
      // Вертикальный сегмент - сохраняем X, привязываем Y к сетке
      return {
        x: start.x,
        y: Math.round(end.y / GRID_STEP) * GRID_STEP
      };
    }
  }, []);

  // Поиск соединения транзистора под курсором мыши
  const findConnectionUnderCursor = useCallback((mouseX: number, mouseY: number): { transistor: Transistor; connection: 'source' | 'drain' | 'gate' } | null => {
    for (const transistor of transistors) {
      const screenPos = worldToScreen(transistor.position.xCenter, transistor.position.yCenter, canvasRef, offsetRef);
      const connections = getConnectionPositions(screenPos, transistor.position.orientation);
      const hitRadius = 9; // Радиус попадания для соединений
      const connectionTypes = ['source', 'drain', 'gate'] as const;

      // Проверяем каждое соединение транзистора на попадание курсора
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
  }, []);

  // Функция для получения мировых координат соединения транзистора
  const getConnectionWorldPosition = (transistor: Transistor, connectionType: 'source' | 'drain' | 'gate'): PositionPoint => {
    const screenCenter = worldToScreen(transistor.position.xCenter, transistor.position.yCenter, canvasRef, offsetRef);
    const screenConnections = getConnectionPositions(screenCenter, transistor.position.orientation);
    const screenConnection = screenConnections[connectionType];

    // Преобразуем обратно в мировые координаты
    return screenToWorld(screenConnection.x, screenConnection.y, canvasRef, offsetRef);
  }

  // Основная функция отрисовки
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Очистка холста
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Отрисовка элементов
    drawGrid(ctx, canvasRef, offsetRef); // Сетка
    transistors.forEach(transistor => drawTransistor(ctx, transistor, canvasRef, offsetRef)); // Транзисторы
    drawWires(ctx, canvasRef, offsetRef); // Завершенные провода

    // Рисуем текущий провод в процессе рисования
    if (currentWire && currentWire.segments.length > 0) {
      // Рисуем уже завершенные сегменты
      currentWire.segments.forEach((segment: any) => {
        const startScreen = worldToScreen(segment.xStart, segment.yStart, canvasRef, offsetRef);
        const endScreen = worldToScreen(segment.xEnd, segment.yEnd, canvasRef, offsetRef);

        ctx.strokeStyle = 'gray';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(startScreen.x, startScreen.y);
        ctx.lineTo(endScreen.x, endScreen.y);
        ctx.stroke();
      });

      // Рисуем временный сегмент (предпросмотр) пунктиром
      if (tempEndPoint) {
        const lastSegment = currentWire.segments[currentWire.segments.length - 1];
        const startScreen = worldToScreen(lastSegment.xEnd, lastSegment.yEnd, canvasRef, offsetRef);
        const endScreen = worldToScreen(tempEndPoint.x, tempEndPoint.y, canvasRef, offsetRef);

        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]); // Пунктирная линия для предпросмотра
        ctx.beginPath();
        ctx.moveTo(startScreen.x, startScreen.y);
        ctx.lineTo(endScreen.x, endScreen.y);
        ctx.stroke();
        ctx.setLineDash([]); // Сбрасываем пунктир
      }
    }
  }, [currentWire, tempEndPoint]);

  // Получение позиции мыши относительно canvas
  const getMousePosition = (e: React.MouseEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    return {
      screenX: e.clientX - rect.left,
      screenY: e.clientY - rect.top
    };
  };

  // Установка курсора для canvas
  const setCanvasCursor = (cursor: string) => {
    if (canvasRef.current) {
      canvasRef.current.style.cursor = cursor;
    }
  };

  // Создание нового провода
  const createNewWire = (transistor: Transistor) => ({
    segments: [],
    startTransistorId: transistor.id,
    startPoint: 'drain' as const,
    id: `wire-${Date.now()}` // Уникальный ID на основе времени
  });

  // Получение конечной точки последнего сегмента
  const getLastSegmentEnd = (): PositionPoint => {
    if (currentWire && currentWire.segments.length > 0) {
      const lastSegment = currentWire.segments[currentWire.segments.length - 1];
      return { x: lastSegment.xEnd, y: lastSegment.yEnd };
    }

    // Если сегментов нет, берем позицию drain стартового транзистора
    const startTransistor = transistors.find(t => t.id === currentWire!.startTransistorId);
    return getConnectionWorldPosition(startTransistor!, 'drain');
  };

  // Обработка начала нового провода
  const handleStartNewWire = (
    connectionUnderCursor: { transistor: Transistor; connection: 'source' | 'drain' | 'gate' } | null,
    mouseWorldPos: PositionPoint
  ) => {
    // Начинаем провод только если кликнули на drain
    if (connectionUnderCursor?.connection === "drain") {
      const newWire = createNewWire(connectionUnderCursor.transistor);
      setCurrentWire(newWire);
      setCanvasCursor('crosshair');
      console.log("Начало нового провода от drain");
    }
  };

  // Обновление курсора при наведении на соединения
  const updateCursorForConnections = (mousePosition: { screenX: number; screenY: number }) => {
    const connectionUnderCursor = findConnectionUnderCursor(mousePosition.screenX, mousePosition.screenY);
    // Меняем курсор на crosshair только при наведении на drain
    setCanvasCursor(connectionUnderCursor?.connection === "drain" ? 'crosshair' : 'default');
  };

  // Обновление временной конечной точки для предпросмотра
  const updateTempWireEnd = (mouseWorldPos: PositionPoint) => {
    const lastSegmentEnd = getLastSegmentEnd();
    const snappedEndPoint = calculateSegmentEnd(lastSegmentEnd, mouseWorldPos);
    setTempEndPoint(snappedEndPoint);
  };

  // Обработка движения мыши в режиме рисования
  const handleDrawingModeMouseMove = (mousePosition: { screenX: number; screenY: number }) => {
    const mouseWorldPos = screenToWorld(mousePosition.screenX, mousePosition.screenY, canvasRef, offsetRef);

    if (currentWire) {
      // Если рисуем провод - обновляем предпросмотр
      updateTempWireEnd(mouseWorldPos);
    } else {
      // Если не рисуем - обновляем курсор при наведении на соединения
      updateCursorForConnections(mousePosition);
    }

    requestAnimationFrame(draw);
  };

  // Обработка движения мыши в режиме перетаскивания
  const handleDragModeMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;

    // Расчет смещения для перетаскивания холста
    const deltaX = e.clientX - lastMousePosRef.current.x;
    const deltaY = e.clientY - lastMousePosRef.current.y;

    // Обновление смещения холста
    offsetRef.current.x += deltaX;
    offsetRef.current.y += deltaY;

    // Сохранение текущей позиции мыши для следующего расчета
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    requestAnimationFrame(draw);
  };

  // Завершение рисования провода
  const finishWireDrawing = () => {
    setCurrentWire(null);
    setTempEndPoint(null);
    setCanvasCursor('default');
  };

  // Создание завершенного провода
  const createCompletedWire = (
    connectionUnderCursor: { transistor: Transistor; connection: 'source' | 'drain' | 'gate' },
    connectionWorldPos: PositionPoint,
    lastSegmentEnd: PositionPoint
  ) => ({
    ...currentWire!,
    segments: [
      ...currentWire!.segments,
      {
        xStart: lastSegmentEnd.x,
        yStart: lastSegmentEnd.y,
        xEnd: connectionWorldPos.x, // Точные координаты соединения
        yEnd: connectionWorldPos.y
      }
    ],
    endTransistorId: connectionUnderCursor.transistor.id,
    endPoint: connectionUnderCursor.connection
  });

  // Завершение провода при подключении к транзистору
  const completeWire = (connectionUnderCursor: { transistor: Transistor; connection: 'source' | 'drain' | 'gate' }) => {
    const connectionWorldPos = getConnectionWorldPosition(connectionUnderCursor.transistor, connectionUnderCursor.connection);
    const lastSegmentEnd = getLastSegmentEnd();

    const completedWire = createCompletedWire(connectionUnderCursor, connectionWorldPos, lastSegmentEnd);
    Wires.push(completedWire); // Добавляем провод в глобальный массив

    finishWireDrawing();
    console.log("Завершение провода:", completedWire);
  };

  // Создание провода с новым сегментом
  const createWireWithNewSegment = (snappedEndPoint: PositionPoint) => {
    const lastSegmentEnd = getLastSegmentEnd();

    return {
      ...currentWire!,
      segments: [
        ...currentWire!.segments,
        {
          xStart: lastSegmentEnd.x,
          yStart: lastSegmentEnd.y,
          xEnd: snappedEndPoint.x, // Координаты с привязкой к сетке
          yEnd: snappedEndPoint.y
        }
      ]
    };
  };

  // Добавление нового сегмента к проводу
  const addNewSegment = (mouseWorldPos: PositionPoint) => {
    const lastSegmentEnd = getLastSegmentEnd();
    const snappedEndPoint = calculateSegmentEnd(lastSegmentEnd, mouseWorldPos);

    const updatedWire = createWireWithNewSegment(snappedEndPoint);
    setCurrentWire(updatedWire);
    setTempEndPoint(snappedEndPoint);
    console.log("Добавлен новый сегмент:", updatedWire);
  };

  // Продолжение рисования существующего провода
  const handleContinueWire = (
    connectionUnderCursor: { transistor: Transistor; connection: 'source' | 'drain' | 'gate' } | null,
    mouseWorldPos: PositionPoint
  ) => {
    // Если кликнули на source или gate - завершаем провод
    if (connectionUnderCursor && (connectionUnderCursor.connection === "source" || connectionUnderCursor.connection === "gate")) {
      completeWire(connectionUnderCursor);
    } else {
      // Иначе добавляем новый сегмент
      addNewSegment(mouseWorldPos);
    }
  };

  // Обработка клика мыши в режиме рисования
  const handleDrawingModeMouseDown = (mousePosition: { screenX: number; screenY: number }) => {
    const connectionUnderCursor = findConnectionUnderCursor(mousePosition.screenX, mousePosition.screenY);
    const mouseWorldPos = screenToWorld(mousePosition.screenX, mousePosition.screenY, canvasRef, offsetRef);

    if (!currentWire) {
      // Начало нового провода
      handleStartNewWire(connectionUnderCursor, mouseWorldPos);
    } else {
      // Продолжение существующего провода
      handleContinueWire(connectionUnderCursor, mouseWorldPos);
    }
  };

  // Обработка клика мыши в режиме перетаскивания
  const handleDragModeMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    setCanvasCursor('grabbing');
  };

  // === ОСНОВНЫЕ ОБРАБОТЧИКИ СОБЫТИЙ ===

  // Обработчик нажатия кнопки мыши
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return; // Только левая кнопка мыши

    const canvas = canvasRef.current;
    if (!canvas) return;

    const mousePosition = getMousePosition(e, canvas);

    if (isDrawingMode) {
      handleDrawingModeMouseDown(mousePosition);
    } else {
      handleDragModeMouseDown(e);
    }
  }, [isDrawingMode, currentWire, calculateSegmentEnd]);

  // Обработчик движения мыши
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const mousePosition = getMousePosition(e, canvas);

    if (isDrawingMode) {
      handleDrawingModeMouseMove(mousePosition);
    } else {
      handleDragModeMouseMove(e);
    }
  }, [isDrawingMode, isDragging, currentWire, calculateSegmentEnd]);

  // Обработчик отпускания кнопки мыши
  const handleMouseUp = useCallback(() => {
    if (!isDrawingMode) {
      setIsDragging(false);
      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'default';
      }
    }
  }, [isDrawingMode]);

  // Обработчик Escape для отмены рисования
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && currentWire) {
        setCurrentWire(null);
        setTempEndPoint(null);
        if (canvasRef.current) {
          canvasRef.current.style.cursor = 'default';
        }
        console.log("Отмена рисования провода");
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentWire]);

  // Эффект для отрисовки при изменении состояния
  useEffect(() => {
    draw();
  }, [draw]);

  // Эффект для обработки изменения размера окна
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      draw();
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Инициализация размера

    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  return (
    <div style={{ position: 'relative' }}>
      {/* Кнопка переключения режима */}
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
      
      {/* Информация о процессе рисования */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '250px',
        background: '#2196F3',
        color: 'white',
        padding: '10px',
        borderRadius: '4px',
        display: currentWire ? 'block' : 'none'
      }}>
        Рисуется провод. ESC для отмены
      </div>
      
      {/* Основной canvas элемент */}
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