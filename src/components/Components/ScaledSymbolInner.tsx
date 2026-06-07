import React from 'react';
import { Group } from 'react-konva';
import type { CircuitComponent } from '../../types';
import { useCircuitStore } from '../../store/circuitStore';
import { clampComponentScale } from '../../utils/geometry';
import { applySymbolStrokeScale } from './applySymbolStrokeScale';
import { SymbolRenderProvider } from './SymbolRenderContext';

type Props = {
  component: CircuitComponent;
  children: React.ReactNode;
};

/** Uniform scale for local graphics and connection-point circles. */
const ScaledSymbolInner: React.FC<Props> = ({ component, children }) => {
  const canvasZoom = useCircuitStore((s) => s.circuit.zoom);
  const componentScale = clampComponentScale(component.scale);
  const metrics = { componentScale, canvasZoom };

  return (
    <SymbolRenderProvider value={metrics}>
      <Group
        scaleX={componentScale}
        scaleY={componentScale}
        shadowColor="#0B1220"
        shadowBlur={4}
        shadowOpacity={0.14}
        shadowOffsetX={0}
        shadowOffsetY={1}
      >
        {applySymbolStrokeScale(children, metrics)}
      </Group>
    </SymbolRenderProvider>
  );
};

export default ScaledSymbolInner;
