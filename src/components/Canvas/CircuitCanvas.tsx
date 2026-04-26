import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import { Stage, Layer, Circle } from 'react-konva';
import Konva from 'konva';
import { useCircuitStore } from '../../store/circuitStore';
import { useThemeStore, themeColors } from '../../store/themeStore';
import GridLayer from './GridLayer';
import WireLayer from './WireLayer';
import SwitchSymbol from '../Components/SwitchSymbol';
import MCBSymbol from '../Components/MCBSymbol';
import BreakerSymbol from '../Components/BreakerSymbol';
import SocketSymbol from '../Components/SocketSymbol';
import LoadSymbol from '../Components/LoadSymbol';
import BusbarSymbol from '../Components/BusbarSymbol';
import PowerSourceSymbol from '../Components/PowerSourceSymbol';
import ThreePhaseSourceSymbol from '../Components/ThreePhaseSourceSymbol';
import ThreePhaseMotorSymbol from '../Components/ThreePhaseMotorSymbol';
import ThreePhaseMCBSymbol from '../Components/ThreePhaseMCBSymbol';
import AirCircuitBreakerSymbol from '../Components/AirCircuitBreakerSymbol';
import ThreePhaseContactorSymbol from '../Components/ThreePhaseContactorSymbol';
import JunctionSymbol from '../Components/JunctionSymbol';
import ControlSymbol from '../Components/ControlSymbol';
import type { CircuitComponent, ComponentType, WireColor } from '../../types';
import { snapToGrid, connectionPointWorld } from '../../utils/geometry';
import { inferWireColor } from '../../utils/inferWireColor';

const CircuitCanvas: React.FC = () => {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  /** Middle-button drag pan (any tool); null when not dragging. */
  const middlePanRef = useRef<{ lastX: number; lastY: number } | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredConnectionPoint, setHoveredConnectionPoint] = useState<{
    componentId: string;
    pointId: string;
    x: number;
    y: number;
  } | null>(null);

  const theme = useThemeStore((s) => s.theme);
  const tc = themeColors[theme];

  const {
    circuit,
    simulationResult,
    selectedId,
    tool,
    wireInProgress,
    wirePoints,
    setSelected,
    moveComponent,
    toggleComponent,
    resetTripped,
    removeComponent,
    removeWire,
    startWire,
    addWirePoint,
    finishWire,
    cancelWire,
    setPan,
    addComponent,
    setPushButtonPressed,
  } = useCircuitStore();

  const wireDraftColor = useMemo((): WireColor => {
    if (!wireInProgress?.fromComponentId || !wireInProgress.fromPointId) {
      return 'brown';
    }
    const fromComp = circuit.components.find(
      (c) => c.id === wireInProgress.fromComponentId
    );
    const fromPt = fromComp?.connectionPoints.find(
      (p) => p.id === wireInProgress.fromPointId
    );
    const fromLabel = fromPt?.label ?? '';
    if (hoveredConnectionPoint) {
      const hComp = circuit.components.find(
        (c) => c.id === hoveredConnectionPoint.componentId
      );
      const hPt = hComp?.connectionPoints.find(
        (p) => p.id === hoveredConnectionPoint.pointId
      );
      if (hPt) {
        return inferWireColor(fromLabel, hPt.label);
      }
    }
    return (
      (wireInProgress.color as WireColor | undefined) ||
      inferWireColor(fromLabel, '')
    );
  }, [wireInProgress, circuit.components, hoveredConnectionPoint]);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    const restoreCursor = () => {
      if (containerRef.current) {
        containerRef.current.style.cursor = '';
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      const drag = middlePanRef.current;
      if (!drag) return;
      if ((e.buttons & 4) === 0) {
        middlePanRef.current = null;
        restoreCursor();
        return;
      }
      const dx = e.clientX - drag.lastX;
      const dy = e.clientY - drag.lastY;
      middlePanRef.current = { lastX: e.clientX, lastY: e.clientY };
      const { circuit, setPan: pan } = useCircuitStore.getState();
      pan(circuit.panX + dx, circuit.panY + dy);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (e.button === 1 && middlePanRef.current) {
        middlePanRef.current = null;
        restoreCursor();
      }
    };
    const onPointerCancel = () => {
      if (middlePanRef.current) {
        middlePanRef.current = null;
        restoreCursor();
      }
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
    };
  }, []);

  const getStagePointerPosition = useCallback(() => {
    if (!stageRef.current) return null;
    const pos = stageRef.current.getPointerPosition();
    if (!pos) return null;
    return {
      x: (pos.x - circuit.panX) / circuit.zoom,
      y: (pos.y - circuit.panY) / circuit.zoom,
    };
  }, [circuit.panX, circuit.panY, circuit.zoom]);

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.target === stageRef.current) {
        if (tool === 'wire' && wireInProgress) {
          const pos = getStagePointerPosition();
          if (!pos) return;
          const gridSize = circuit.gridSize;
          addWirePoint(
            snapToGrid(pos.x, gridSize),
            snapToGrid(pos.y, gridSize)
          );
        } else if (tool === 'select') {
          setSelected(null);
        }
      }
    },
    [
      tool,
      wireInProgress,
      getStagePointerPosition,
      addWirePoint,
      setSelected,
      circuit.gridSize,
    ]
  );

  const handleMouseMove = useCallback(
    () => {
      if (tool === 'wire' && wireInProgress) {
        const pos = getStagePointerPosition();
        if (pos) {
          if (hoveredConnectionPoint) {
            setCursorPos({ x: hoveredConnectionPoint.x, y: hoveredConnectionPoint.y });
          } else {
            setCursorPos(pos);
          }
        }
      }
    },
    [tool, wireInProgress, getStagePointerPosition, hoveredConnectionPoint]
  );

  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const scaleBy = 1.08;
      const stage = stageRef.current;
      const pos = stage?.getPointerPosition();
      const { circuit: c, setZoomAroundStagePoint: zoomAt, setZoom } =
        useCircuitStore.getState();
      const prevZ = c.zoom;
      const raw =
        e.evt.deltaY < 0 ? prevZ * scaleBy : prevZ / scaleBy;
      const newZoom = Math.max(0.1, Math.min(5, raw));
      if (Math.abs(newZoom - prevZ) < 1e-9) return;
      if (pos) {
        zoomAt(newZoom, pos.x, pos.y);
      } else {
        setZoom(newZoom);
      }
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData(
        'componentType'
      ) as ComponentType;
      if (!type) return;

      const stage = stageRef.current;
      if (!stage) return;

      const rect = (
        e.target as HTMLElement
      ).closest('.circuit-canvas-container')?.getBoundingClientRect();
      if (!rect) return;

      const x = (e.clientX - rect.left - circuit.panX) / circuit.zoom;
      const y = (e.clientY - rect.top - circuit.panY) / circuit.zoom;

      const pbVariant = e.dataTransfer.getData('pushButtonVariant') as
        | 'NO'
        | 'NC'
        | '';
      const mcbPolesRaw = e.dataTransfer.getData('mcbInitialPoles');

      addComponent(
        type,
        snapToGrid(x, circuit.gridSize),
        snapToGrid(y, circuit.gridSize),
        type === 'push_button'
          ? {
              pushButtonVariant: pbVariant === 'NC' ? 'NC' : 'NO',
            }
          : type === 'mcb' && mcbPolesRaw === '2'
            ? { mcbInitialPoles: 2 }
            : undefined
      );
    },
    [addComponent, circuit.panX, circuit.panY, circuit.zoom, circuit.gridSize]
  );

  const handleConnectionPointClick = useCallback(
    (componentId: string, pointId: string) => {
      if (tool !== 'wire') return;
      if (!wireInProgress) {
        startWire(componentId, pointId);
      } else {
        finishWire(componentId, pointId);
      }
    },
    [tool, wireInProgress, startWire, finishWire]
  );

  const handleComponentSelect = useCallback(
    (id: string) => {
      if (tool === 'delete') {
        removeComponent(id);
      } else {
        setSelected(id);
      }
    },
    [tool, removeComponent, setSelected]
  );

  const renderComponent = (comp: CircuitComponent) => {
    const nodeResult = simulationResult?.nodes[comp.id];
    const isSelected = selectedId === comp.id;
    const showCP = tool === 'wire' || isSelected;

    const commonProps = {
      component: comp,
      nodeResult,
      selected: isSelected,
      showConnectionPoints: showCP,
      onSelect: () => handleComponentSelect(comp.id),
      onDragEnd: (x: number, y: number) => moveComponent(comp.id, x, y),
    };

    switch (comp.type) {
      case 'switch':
        return (
          <SwitchSymbol
            key={comp.id}
            {...commonProps}
            tool={tool}
            variant="switch"
            onToggle={() => toggleComponent(comp.id)}
          />
        );
      case 'push_button':
        return (
          <SwitchSymbol
            key={comp.id}
            {...commonProps}
            tool={tool}
            variant="push_button"
            onPushChange={(down) => setPushButtonPressed(comp.id, down)}
          />
        );
      case 'mcb':
        return (
          <MCBSymbol
            key={comp.id}
            {...commonProps}
            onToggle={() => toggleComponent(comp.id)}
          />
        );
      case 'three_phase_mcb':
      case 'four_phase_mcb':
        return (
          <ThreePhaseMCBSymbol
            key={comp.id}
            {...commonProps}
            onToggle={() => toggleComponent(comp.id)}
          />
        );
      case 'air_circuit_breaker':
        return (
          <AirCircuitBreakerSymbol
            key={comp.id}
            {...commonProps}
            onToggle={() => toggleComponent(comp.id)}
            onReset={() => resetTripped(comp.id)}
          />
        );
      case 'rcd':
        return (
          <BreakerSymbol
            key={comp.id}
            {...commonProps}
            onToggle={() => toggleComponent(comp.id)}
            onReset={() => resetTripped(comp.id)}
          />
        );
      case 'socket':
        return <SocketSymbol key={comp.id} {...commonProps} />;
      case 'lamp':
      case 'motor':
      case 'heater':
      case 'generic_load':
        return <LoadSymbol key={comp.id} {...commonProps} />;
      case 'busbar':
        return (
          <BusbarSymbol
            key={comp.id}
            {...commonProps}
            effectiveWireColor={(() => {
              const connected = circuit.wires.filter(
                (w) =>
                  w.fromComponentId === comp.id ||
                  w.toComponentId === comp.id
              );
              const energizedWire = connected.find((w) => w.energized);
              return (energizedWire?.color ||
                connected[0]?.color) as WireColor | undefined;
            })()}
          />
        );
      case 'power_source':
        return <PowerSourceSymbol key={comp.id} {...commonProps} />;
      case 'three_phase_source':
        return <ThreePhaseSourceSymbol key={comp.id} {...commonProps} />;
      case 'three_phase_motor':
        return <ThreePhaseMotorSymbol key={comp.id} {...commonProps} />;
      case 'three_phase_contactor':
      case 'four_phase_contactor':
        return (
          <ThreePhaseContactorSymbol
            key={comp.id}
            {...commonProps}
          />
        );
      case 'junction':
        return <JunctionSymbol key={comp.id} {...commonProps} />;
      case 'contactor':
      case 'relay':
      case 'timer':
      case 'overload_relay':
        return (
          <ControlSymbol
            key={comp.id}
            {...commonProps}
          />
        );
      default:
        return null;
    }
  };

  // Handle keyboard for escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelWire();
        setSelected(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cancelWire, setSelected]);

  return (
    <div
      ref={containerRef}
      className={`circuit-canvas-container flex-1 overflow-hidden`}
      style={{ backgroundColor: tc.canvasHex }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onPointerDownCapture={(e: React.PointerEvent) => {
        if (e.button !== 1) return;
        e.preventDefault();
        middlePanRef.current = {
          lastX: e.clientX,
          lastY: e.clientY,
        };
        if (containerRef.current) {
          containerRef.current.style.cursor = 'grabbing';
        }
      }}
    >
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        scaleX={circuit.zoom}
        scaleY={circuit.zoom}
        x={circuit.panX}
        y={circuit.panY}
        onClick={handleStageClick}
        onMouseMove={handleMouseMove}
        onWheel={handleWheel}
        draggable={tool === 'pan'}
        onDragEnd={() => {
          if (stageRef.current) {
            setPan(stageRef.current.x(), stageRef.current.y());
          }
        }}
      >
        <GridLayer
          gridSize={circuit.gridSize}
          width={dimensions.width}
          height={dimensions.height}
          panX={circuit.panX}
          panY={circuit.panY}
          zoom={circuit.zoom}
          dotColor={tc.gridDot}
        />

        <WireLayer
          wires={circuit.wires}
          selectedId={selectedId}
          onSelectWire={(id) => {
            if (tool === 'delete') {
              removeWire(id);
            } else {
              setSelected(id);
            }
          }}
          wireInProgress={!!wireInProgress}
          wirePoints={wirePoints}
          cursorPos={cursorPos}
          draftWireColor={wireDraftColor}
        />

        <Layer>
          {circuit.components.map(renderComponent)}
        </Layer>

        {tool === 'wire' && (
          <Layer>
            {circuit.components.flatMap((comp) =>
              comp.connectionPoints.map((cp) => {
                const { x: absX, y: absY } = connectionPointWorld(comp, cp);
                return (
                  <Circle
                    key={`${comp.id}-${cp.id}-hotspot`}
                    x={absX}
                    y={absY}
                    radius={8}
                    fill="#3B82F6"
                    opacity={0.01}
                    hitStrokeWidth={18}
                    onClick={(e) => {
                      e.cancelBubble = true;
                      handleConnectionPointClick(comp.id, cp.id);
                    }}
                    onMouseEnter={() =>
                      setHoveredConnectionPoint({
                        componentId: comp.id,
                        pointId: cp.id,
                        x: absX,
                        y: absY,
                      })
                    }
                    onMouseLeave={() => {
                      setHoveredConnectionPoint((current) =>
                        current &&
                        current.componentId === comp.id &&
                        current.pointId === cp.id
                          ? null
                          : current
                      );
                    }}
                  />
                );
              })
            )}
          </Layer>
        )}
      </Stage>
    </div>
  );
};

export default CircuitCanvas;
