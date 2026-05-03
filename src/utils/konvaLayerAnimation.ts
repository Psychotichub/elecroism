import Konva from 'konva';

/**
 * Start a Konva.Animation only when `node` is attached to a layer (`getLayer()` non-null).
 * Avoids throws when effects run before the Stage has attached the subtree.
 */
export function startKonvaLayerAnimation(
  node: Konva.Node | null,
  update: (frame?: { time: number }) => void
): Konva.Animation | null {
  if (!node) return null;
  const layer = node.getLayer();
  if (!layer) return null;
  const anim = new Konva.Animation(update, layer);
  anim.start();
  return anim;
}
