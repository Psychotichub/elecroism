import React, { useCallback, useRef, useState } from 'react';
import { cn } from '../ui/cn';

const DRAG_THRESHOLD_PX = 4;

export type PanelSplitterProps = {
  side: 'left' | 'right';
  ariaLabel: string;
  ariaControls: string;
  ariaExpanded: boolean;
  onResize: (deltaPx: number) => void;
  onDoubleClick: () => void;
  onToggleCollapse: () => void;
};

const PanelSplitter: React.FC<PanelSplitterProps> = ({
  side,
  ariaLabel,
  ariaControls,
  ariaExpanded,
  onResize,
  onDoubleClick,
  onToggleCollapse,
}) => {
  const dragging = useRef(false);
  const moved = useRef(false);
  const lastX = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragging.current = true;
    moved.current = false;
    lastX.current = e.clientX;
    setIsDragging(true);
    if (typeof e.currentTarget.setPointerCapture === 'function') {
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging.current) return;
      const delta = e.clientX - lastX.current;
      if (Math.abs(delta) >= DRAG_THRESHOLD_PX) {
        moved.current = true;
      }
      lastX.current = e.clientX;
      const signedDelta = side === 'left' ? delta : -delta;
      if (signedDelta !== 0) {
        onResize(signedDelta);
      }
    },
    [onResize, side]
  );

  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    setIsDragging(false);
    if (
      typeof e.currentTarget.hasPointerCapture === 'function' &&
      e.currentTarget.hasPointerCapture(e.pointerId)
    ) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (!moved.current) {
      onToggleCollapse();
    }
  }, [onToggleCollapse]);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={ariaLabel}
      aria-controls={ariaControls}
      aria-expanded={ariaExpanded}
      tabIndex={0}
      data-testid={`panel-splitter-${side}`}
      data-dragging={isDragging ? 'true' : undefined}
      className={cn('es-panel-splitter', isDragging && 'es-panel-splitter-active')}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={(e) => {
        e.preventDefault();
        onDoubleClick();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggleCollapse();
        }
      }}
    />
  );
};

export default PanelSplitter;
