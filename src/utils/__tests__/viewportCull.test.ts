import { describe, expect, it } from 'vitest';
import { buildCanvasStressCircuit } from '../canvasStressCircuit';
import {
  CANVAS_CULL_MIN_COMPONENTS,
  pickVisibleCanvasElements,
  segmentIntersectsBounds,
  shouldCullCanvas,
  wireIntersectsViewport,
  worldViewportBounds,
} from '../viewportCull';

describe('viewportCull', () => {
  it('computes world viewport from stage transform', () => {
    const v = worldViewportBounds(800, 600, 100, 50, 2, 0);
    expect(v.minX).toBeCloseTo(-50);
    expect(v.minY).toBeCloseTo(-25);
    expect(v.maxX).toBeCloseTo(350);
    expect(v.maxY).toBeCloseTo(275);
  });

  it('detects segment crossing viewport edge', () => {
    const viewport = { minX: 0, minY: 0, maxX: 100, maxY: 100 };
    expect(segmentIntersectsBounds(-10, 50, 110, 50, viewport)).toBe(true);
    expect(segmentIntersectsBounds(-10, -10, -5, -5, viewport)).toBe(false);
  });

  it('culls a 500-component stress sheet to a small viewport fraction', () => {
    const circuit = buildCanvasStressCircuit(500);
    const viewport = worldViewportBounds(800, 600, 0, 0, 1, 40);
    const { components, wires } = pickVisibleCanvasElements(
      circuit.components,
      circuit.wires,
      viewport
    );
    expect(components.length).toBeLessThan(500);
    expect(components.length).toBeGreaterThan(10);
    expect(wires.length).toBeLessThan(circuit.wires.length);
  });

  it('keeps pinned selection and its wires', () => {
    const circuit = buildCanvasStressCircuit(120);
    const far = circuit.components[circuit.components.length - 1];
    if (!far) throw new Error('expected stress circuit component');
    const viewport = { minX: 0, minY: 0, maxX: 80, maxY: 80 };
    const { components } = pickVisibleCanvasElements(
      circuit.components,
      circuit.wires,
      viewport,
      { pinComponentIds: new Set([far.id]) }
    );
    expect(components.some((c) => c.id === far.id)).toBe(true);
  });

  it('disables culling while wiring or marquee-selecting', () => {
    expect(
      shouldCullCanvas(CANVAS_CULL_MIN_COMPONENTS + 1, {
        tool: 'wire',
        wireInProgress: false,
        selectionActive: false,
        integrityOverlay: false,
      })
    ).toBe(false);
    expect(
      shouldCullCanvas(CANVAS_CULL_MIN_COMPONENTS + 1, {
        tool: 'select',
        wireInProgress: true,
        selectionActive: false,
        integrityOverlay: false,
      })
    ).toBe(false);
    expect(
      shouldCullCanvas(CANVAS_CULL_MIN_COMPONENTS + 1, {
        tool: 'select',
        wireInProgress: false,
        selectionActive: true,
        integrityOverlay: false,
      })
    ).toBe(false);
    expect(
      shouldCullCanvas(CANVAS_CULL_MIN_COMPONENTS + 1, {
        tool: 'select',
        wireInProgress: false,
        selectionActive: false,
        integrityOverlay: false,
      })
    ).toBe(true);
  });

  it('benchmarks culling 500 components under 100ms for 60 frames', () => {
    const circuit = buildCanvasStressCircuit(500);
    const viewport = worldViewportBounds(1280, 720, -200, -100, 1.25, 120);
    const t0 = performance.now();
    for (let i = 0; i < 60; i++) {
      pickVisibleCanvasElements(circuit.components, circuit.wires, viewport);
    }
    const elapsed = performance.now() - t0;
    expect(elapsed).toBeLessThan(100);
    const sampleWire = circuit.wires[0];
    if (!sampleWire) throw new Error('expected stress circuit wire');
    expect(wireIntersectsViewport(sampleWire, viewport)).toBeDefined();
  });
});
