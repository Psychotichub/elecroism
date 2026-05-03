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
    <Group
      scaleX={s}
      scaleY={s}
      shadowColor="#0B1220"
      shadowBlur={4}
      shadowOpacity={0.14}
      shadowOffsetX={0}
      shadowOffsetY={1}
    >
      {children}
    </Group>
  );
};

export default ScaledSymbolInner;
