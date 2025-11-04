import type { Point, Wire, ControlPoint } from './types';
import { generateWireSegments } from './canvasUtils';

export const createWiresFromPoints = (points: Point[]): Wire[] => {
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

export const updateWireAndControlledPoints = (
  points: Point[],
  controlPointId: string,
  newState: boolean
): { updatedPoints: Point[]; updatedWires: Wire[] } => {
  // Сначала обновляем саму control точку
  const pointsWithUpdatedControl = points.map(point => 
    point.id === controlPointId && point.type === 'control' 
      ? { ...point, state: newState }
      : point
  );

  // Затем обновляем controlled точки на основе ВСЕХ control точек
  const updatedPoints = pointsWithUpdatedControl.map(point => {
    if (point.type === 'controlled' && point.controlledBy.includes(controlPointId)) {
      const allControlPointsState = point.controlledBy.some(controlId => {
        const controlPoint = pointsWithUpdatedControl.find(p => p.id === controlId);
        return controlPoint?.type === 'control' && controlPoint.state;
      });
      return { ...point, state: allControlPointsState };
    }
    return point;
  });

  // Создаем провода из обновленных точек
  const updatedWires = createWiresFromPoints(updatedPoints);

  return { updatedPoints, updatedWires };
};