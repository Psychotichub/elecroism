import React from 'react';
import { Group } from 'react-konva';
import type { CircuitComponent } from '../../types';
import { clampComponentScale } from '../../utils/geometry';

type Props = {
  component: CircuitComponent;
  children: React.ReactNode;
};

/** Uniform scale for local graphics and connection-point circles. */
const ScaledSymbolInner: React.FC<Props> = ({ component, children }) => {
  const s = clampComponentScale(component.scale);
  return (
    <Group scaleX={s} scaleY={s}>
      {children}
    </Group>
  );
};

export default ScaledSymbolInner;
