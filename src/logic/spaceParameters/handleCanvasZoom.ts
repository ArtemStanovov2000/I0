export const handleCanvasZoom = (
  e: WheelEvent,
  canvas: HTMLCanvasElement,
  scaleRef: { current: number },
  offsetRef: { current: { x: number; y: number } },
  screenToWorld: (x: number, y: number) => { x: number; y: number },
  draw: () => void,
  zoomFactor: number = 1.07
) => {
  e.preventDefault();

  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  const worldBeforeZoom = screenToWorld(mouseX, mouseY);
  const zoom = e.deltaY < 0 ? zoomFactor : 1 / zoomFactor;

  scaleRef.current *= zoom;

  const worldAfterZoom = screenToWorld(mouseX, mouseY);
  offsetRef.current.x += worldBeforeZoom.x - worldAfterZoom.x;
  offsetRef.current.y += worldBeforeZoom.y - worldAfterZoom.y;

  draw();
};