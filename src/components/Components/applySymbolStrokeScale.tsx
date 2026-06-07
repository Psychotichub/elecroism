import React from 'react';
import {
  scaledSymbolFontSize,
  symbolStrokeProps,
  type SymbolRenderMetrics,
} from '../../design/symbolStrokeScale';

const KONVA_SHAPE_NAMES = new Set([
  'Line',
  'Circle',
  'Rect',
  'Text',
  'Arc',
  'Ellipse',
  'Ring',
  'RegularPolygon',
  'Star',
  'Arrow',
  'Path',
  'Label',
  'Tag',
  'Wedge',
]);

function konvaShapeName(type: unknown): string | null {
  if (typeof type === 'string') return type;
  if (typeof type === 'function' || typeof type === 'object') {
    const t = type as { displayName?: string; name?: string };
    return t.displayName ?? t.name ?? null;
  }
  return null;
}

function isKonvaShape(type: unknown): boolean {
  const name = konvaShapeName(type);
  return name != null && KONVA_SHAPE_NAMES.has(name);
}

function isFragment(type: unknown): boolean {
  return type === React.Fragment;
}

function scaleChildTree(
  node: React.ReactNode,
  metrics: SymbolRenderMetrics
): React.ReactNode {
  if (!React.isValidElement(node)) return node;

  const props = node.props as Record<string, unknown>;

  if (isFragment(node.type)) {
    return React.Children.map(
      props.children as React.ReactNode,
      (child) => scaleChildTree(child, metrics)
    );
  }

  const patch: Record<string, unknown> = {};

  if (isKonvaShape(node.type)) {
    if (typeof props.strokeWidth === 'number') {
      Object.assign(patch, symbolStrokeProps(props.strokeWidth, metrics));
    }
    if (typeof props.fontSize === 'number') {
      patch.fontSize = scaledSymbolFontSize(
        props.fontSize,
        metrics.componentScale,
        metrics.canvasZoom
      );
    }
  }

  if (props.children != null) {
    patch.children = React.Children.map(
      props.children as React.ReactNode,
      (child) => scaleChildTree(child, metrics)
    );
  }

  if (Object.keys(patch).length === 0) return node;
  return React.cloneElement(node, patch);
}

/** Applies zoom-stable strokes and label sizes to inline Konva primitives. */
export function applySymbolStrokeScale(
  children: React.ReactNode,
  metrics: SymbolRenderMetrics
): React.ReactNode {
  return React.Children.map(children, (child) => scaleChildTree(child, metrics));
}
