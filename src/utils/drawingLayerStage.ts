import type Konva from 'konva';
import type { DrawingLayerId } from '../types';
import { useDrawingLayerStore } from '../store/drawingLayerStore';

function visitNodes(
  node: Konva.Node,
  hidden: Konva.Node[],
  store: ReturnType<typeof useDrawingLayerStore.getState>
): void {
  const layerId = node.getAttr('drawingLayer') as DrawingLayerId | undefined;
  if (layerId && !store.shouldExportLayer(layerId) && node.visible()) {
    hidden.push(node);
    node.visible(false);
  }
  const children = (node as Konva.Container).getChildren?.() ?? [];
  for (const child of children) {
    visitNodes(child, hidden, store);
  }
}

/** Hide schematic nodes excluded from PDF export; returns a restore function. */
export function applyExportLayerVisibility(stage: Konva.Stage): () => void {
  const store = useDrawingLayerStore.getState();
  const hidden: Konva.Node[] = [];

  for (const layer of stage.getLayers()) {
    visitNodes(layer, hidden, store);
  }

  stage.batchDraw();

  return () => {
    for (const node of hidden) {
      node.visible(true);
    }
    stage.batchDraw();
  };
}
