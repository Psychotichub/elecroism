import React from 'react';
import { FiMaximize, FiZoomIn, FiZoomOut } from 'react-icons/fi';
import { IconButton, Tooltip } from '../ui';

type Props = {
  zoom: number;
  toolLabel: string;
  sldViewMode: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
};

const CanvasZoomControls: React.FC<Props> = ({
  zoom,
  toolLabel,
  sldViewMode,
  onZoomIn,
  onZoomOut,
  onResetView,
}) => (
  <div
    role="toolbar"
    aria-label="Canvas view controls"
    className="es-canvas-zoom-controls"
    data-testid="canvas-zoom-controls"
  >
    <Tooltip content="Zoom in" side="top">
      <IconButton label="Zoom in" onClick={onZoomIn}>
        <FiZoomIn aria-hidden />
      </IconButton>
    </Tooltip>
    <Tooltip content="Zoom out" side="top">
      <IconButton label="Zoom out" onClick={onZoomOut}>
        <FiZoomOut aria-hidden />
      </IconButton>
    </Tooltip>
    <Tooltip content="Reset zoom and pan" side="top">
      <IconButton label="Reset zoom and pan" onClick={onResetView}>
        <FiMaximize aria-hidden />
      </IconButton>
    </Tooltip>
    <span
      className="px-1.5 es-typo-caption es-tabular-nums text-es-secondary"
      aria-live="polite"
      aria-atomic="true"
    >
      {toolLabel}
      {sldViewMode ? ' · SLD' : ''} · {(zoom * 100).toFixed(0)}%
    </span>
  </div>
);

export default CanvasZoomControls;
