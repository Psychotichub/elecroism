import Konva from 'konva';
import type { WorldBounds } from './drawingBounds';

export function exportToPNG(stage: Konva.Stage, filename: string): void {
  const uri = stage.toDataURL({ pixelRatio: 2 });
  const link = document.createElement('a');
  link.download = filename || 'circuit.png';
  link.href = uri;
  link.click();
}

/** Capture a world-space region from the Konva stage as a PNG data URL. */
export function captureStageRegion(
  stage: Konva.Stage,
  bounds: WorldBounds,
  zoom: number,
  panX: number,
  panY: number,
  pixelRatio = 2,
  pad = 24
): string {
  const minX = bounds.minX - pad;
  const minY = bounds.minY - pad;
  const maxX = bounds.maxX + pad;
  const maxY = bounds.maxY + pad;
  const worldW = Math.max(40, maxX - minX);
  const worldH = Math.max(40, maxY - minY);

  const stageX = minX * zoom + panX;
  const stageY = minY * zoom + panY;
  const stageW = worldW * zoom;
  const stageH = worldH * zoom;

  const stageWpx = stage.width();
  const stageHpx = stage.height();
  const clipX = Math.max(0, stageX);
  const clipY = Math.max(0, stageY);
  const clipW = Math.min(stageW, stageWpx - clipX);
  const clipH = Math.min(stageH, stageHpx - clipY);

  if (clipW <= 1 || clipH <= 1) {
    return stage.toDataURL({ pixelRatio });
  }

  return stage.toDataURL({
    x: clipX,
    y: clipY,
    width: clipW,
    height: clipH,
    pixelRatio,
  });
}
