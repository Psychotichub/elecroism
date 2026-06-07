import React from 'react';
import { describe, expect, it } from 'vitest';
import { Line, Rect, Text } from 'react-konva';
import { applySymbolStrokeScale } from '../applySymbolStrokeScale';

describe('applySymbolStrokeScale', () => {
  it('patches strokeWidth and fontSize on Konva primitives', () => {
    const tree = applySymbolStrokeScale(
      <>
        <Rect strokeWidth={2} />
        <Line strokeWidth={1.5} />
        <Text fontSize={8} text="Q1" />
      </>,
      { componentScale: 2, canvasZoom: 2 }
    );

    const nodes = React.Children.toArray(tree).flat() as React.ReactElement[];
    expect(nodes[0].props.strokeWidth).toBe(4);
    expect(nodes[0].props.strokeScaleEnabled).toBe(false);
    expect(nodes[1].props.strokeWidth).toBe(3);
    expect(nodes[1].props.strokeScaleEnabled).toBe(false);
    expect(nodes[2].props.fontSize).toBe(8);
  });
});
