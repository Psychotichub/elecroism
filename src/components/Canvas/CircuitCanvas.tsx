import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import { Stage, Layer, Circle, Line, Rect, Text } from 'react-konva';
import Konva from 'konva';
import { useCircuitStore } from '../../store/circuitStore';
import { useThemeStore, themeColors } from '../../store/themeStore';
import GridLayer from './GridLayer';
import WireLayer from './WireLayer';
import SwitchSymbol from '../Components/SwitchSymbol';
import MCBSymbol from '../Components/MCBSymbol';
import HrcFuseSymbol from '../Components/HrcFuseSymbol';
import EarthLeakageRelayCbctSymbol from '../Components/EarthLeakageRelayCbctSymbol';
import BreakerSymbol from '../Components/BreakerSymbol';
import SocketSymbol from '../Components/SocketSymbol';
import LoadSymbol from '../Components/LoadSymbol';
import BusbarSymbol from '../Components/BusbarSymbol';
import PowerSourceSymbol from '../Components/PowerSourceSymbol';
import DCPowerSourceSymbol from '../Components/DCPowerSourceSymbol';
import ACDCConverterSymbol from '../Components/ACDCConverterSymbol';
import ControlTransformerSymbol from '../Components/ControlTransformerSymbol';
import ThreePhaseSourceSymbol from '../Components/ThreePhaseSourceSymbol';
import ThreePhaseMotorSymbol from '../Components/ThreePhaseMotorSymbol';
import ThreePhaseMCBSymbol from '../Components/ThreePhaseMCBSymbol';
import AirCircuitBreakerSymbol from '../Components/AirCircuitBreakerSymbol';
import MotorizedMCCBSymbol from '../Components/MotorizedMCCBSymbol';
import ThreePhaseContactorSymbol from '../Components/ThreePhaseContactorSymbol';
import JunctionSymbol from '../Components/JunctionSymbol';
import ControlSymbol from '../Components/ControlSymbol';
import EStopSymbol from '../Components/EStopSymbol';
import SelectorSwitchSymbol from '../Components/SelectorSwitchSymbol';
import IndicatorLampSymbol from '../Components/IndicatorLampSymbol';
import PhaseIndicatorBankSymbol from '../Components/PhaseIndicatorBankSymbol';
import SmpsSymbol from '../Components/SmpsSymbol';
import InterposingRelaySymbol from '../Components/InterposingRelaySymbol';
import AuxContactBlockSymbol from '../Components/AuxContactBlockSymbol';
import EnergyMeterSymbol from '../Components/EnergyMeterSymbol';
import MultimeterSymbol from '../Components/MultimeterSymbol';
import DoorInterlockSymbol from '../Components/DoorInterlockSymbol';
import ModbusTcpGatewaySymbol from '../Components/ModbusTcpGatewaySymbol';
import BacnetIpGatewaySymbol from '../Components/BacnetIpGatewaySymbol';
import BmsIOModuleSymbol from '../Components/BmsIOModuleSymbol';
import CommInfraSymbol from '../Components/CommInfraSymbol';
import SignalIsolationSymbol from '../Components/SignalIsolationSymbol';
import PowerAuxSymbol from '../Components/PowerAuxSymbol';
import TerminalBlockSymbol from '../Components/TerminalBlockSymbol';
import type { CircuitComponent, ComponentType, WireColor } from '../../types';
import {
  snapToGrid,
  connectionPointWorld,
  terminalOutwardOrientation,
} from '../../utils/geometry';
import { inferWireColor } from '../../utils/inferWireColor';
import {
  getCadCommandSuggestions,
  runCadCommand,
} from '../../utils/cadCommands';
import {
  clearDragComponentType,
  getDragComponentType,
} from '../../utils/dragState';

const CircuitCanvas: React.FC = () => {
  const resolveComponentCommand = useCallback((raw: string): ComponentType | null => {
    const trimmed = raw.trim().toLowerCase();
    if (!trimmed) return null;
    const direct = getCadCommandSuggestions(trimmed).find((s) => s === trimmed);
    const nonComponentCommands = new Set([
      'add',
      'clear',
      'copy',
      'help',
      'line',
      'pan',
      'select',
      'wire',
      'z',
      'ze',
      'zi',
      'zo',
    ]);
    if (direct && !nonComponentCommands.has(direct)) {
      return direct as ComponentType;
    }
    if (trimmed.startsWith('add ')) {
      const alias = trimmed.split(/\s+/)[1];
      if (!alias) return null;
      const exact = getCadCommandSuggestions(alias).find((s) => s === alias);
      if (exact && !nonComponentCommands.has(exact)) {
        return exact as ComponentType;
      }
    }
    return null;
  }, []);

  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const ctrlOrMetaPressedRef = useRef(false);
  const suppressStageClickRef = useRef(false);
  /** Middle-button drag pan (any tool); null when not dragging. */
  const middlePanRef = useRef<{ lastX: number; lastY: number } | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [selectionRect, setSelectionRect] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteText, setPaletteText] = useState('');
  const [paletteResult, setPaletteResult] = useState('');
  const [palettePos, setPalettePos] = useState({ x: 20, y: 20 });
  const [paletteSuggestionIndex, setPaletteSuggestionIndex] = useState(-1);
  const [isPointerInsideCanvas, setIsPointerInsideCanvas] = useState(false);
  const [pendingInsertType, setPendingInsertType] = useState<ComponentType | null>(null);
  const [insertCursor, setInsertCursor] = useState<{ x: number; y: number } | null>(null);
  const [dragPreviewType, setDragPreviewType] = useState<ComponentType | null>(null);
  const [dragPreviewCursor, setDragPreviewCursor] = useState<{ x: number; y: number } | null>(
    null
  );
  const paletteInputRef = useRef<HTMLInputElement>(null);
  const lastPointerCanvasRef = useRef<{ x: number; y: number }>({ x: 20, y: 20 });
  const paletteSuggestions = useMemo(() => {
    return getCadCommandSuggestions(paletteText);
  }, [paletteText]);
  const executePaletteCommand = (rawCommand: string) => {
    const insertType = resolveComponentCommand(rawCommand);
    if (insertType) {
      setPendingInsertType(insertType);
      setPaletteResult(`Move cursor and click to place ${insertType}`);
      setPaletteText('');
      setPaletteSuggestionIndex(-1);
      setPaletteOpen(false);
      return;
    }
    const {
      circuit: liveCircuit,
      selectedId: liveSelectedId,
      setTool: liveSetTool,
      addComponent: liveAddComponent,
      setSelected: liveSetSelected,
      setZoom: liveSetZoom,
      setPan: liveSetPan,
      duplicateComponent: liveDuplicateComponent,
    } = useCircuitStore.getState();
    setPaletteResult(
      runCadCommand({
        raw: rawCommand,
        circuit: liveCircuit,
        selectedId: liveSelectedId,
        setTool: liveSetTool,
        addComponent: liveAddComponent,
        setSelected: liveSetSelected,
        setZoom: liveSetZoom,
        setPan: liveSetPan,
        duplicateComponent: liveDuplicateComponent,
      })
    );
    setPaletteText('');
    setPaletteSuggestionIndex(-1);
    setPaletteOpen(false);
  };
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
    wireOrientation,
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
    updateComponent,
    runSimulation,
  } = useCircuitStore();

  /**
   * AutoCAD-style perpendicular hint while drawing a wire. When the cursor is
   * over a connection point, return that point plus a flag that indicates
   * whether the running wire path can dock into the terminal with a single
   * straight perpendicular segment (`aligned: true`) or whether finishing
   * here will need an automatic L bend (`aligned: false`). Both cases still
   * produce a perpendicular landing, but the marker colour differs so the
   * user knows when their path lines up cleanly.
   */
  const wireDockHint = useMemo(() => {
    if (tool !== 'wire' || !wireInProgress || !hoveredConnectionPoint) {
      return null;
    }
    const hComp = circuit.components.find(
      (c) => c.id === hoveredConnectionPoint.componentId
    );
    const hPt = hComp?.connectionPoints.find(
      (p) => p.id === hoveredConnectionPoint.pointId
    );
    if (!hComp || !hPt) return null;
    const tAxis = terminalOutwardOrientation(hComp, hPt);
    if (wirePoints.length < 2) {
      return {
        x: hoveredConnectionPoint.x,
        y: hoveredConnectionPoint.y,
        axis: tAxis,
        aligned: true,
      };
    }
    const lastX = wirePoints[wirePoints.length - 2];
    const lastY = wirePoints[wirePoints.length - 1];
    const sameAxis = wireOrientation === tAxis;
    const aligned = sameAxis
      ? tAxis === 'h'
        ? lastY === hoveredConnectionPoint.y
        : lastX === hoveredConnectionPoint.x
      : true;
    return {
      x: hoveredConnectionPoint.x,
      y: hoveredConnectionPoint.y,
      axis: tAxis,
      aligned,
    };
  }, [
    tool,
    wireInProgress,
    hoveredConnectionPoint,
    circuit.components,
    wirePoints,
    wireOrientation,
  ]);

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

  const pendingPreviewComponent = useMemo<CircuitComponent | null>(() => {
    const previewType = pendingInsertType ?? dragPreviewType;
    const previewCursor = pendingInsertType ? insertCursor : dragPreviewCursor;
    if (!previewType || !previewCursor) return null;
    return {
      id: '__cad_insert_preview__',
      type: previewType,
      label: '',
      x: snapToGrid(previewCursor.x, circuit.gridSize),
      y: snapToGrid(previewCursor.y, circuit.gridSize),
      scale: 1,
      rotation: 0,
      state: 'off',
      selected: false,
      connectionPoints: [],
      properties: {},
    };
  }, [pendingInsertType, insertCursor, dragPreviewType, dragPreviewCursor, circuit.gridSize]);

  useEffect(() => {
    const syncModifier = (e: KeyboardEvent) => {
      ctrlOrMetaPressedRef.current = e.ctrlKey || e.metaKey;
    };
    const clearModifier = () => {
      ctrlOrMetaPressedRef.current = false;
    };
    window.addEventListener('keydown', syncModifier);
    window.addEventListener('keyup', syncModifier);
    window.addEventListener('blur', clearModifier);
    return () => {
      window.removeEventListener('keydown', syncModifier);
      window.removeEventListener('keyup', syncModifier);
      window.removeEventListener('blur', clearModifier);
    };
  }, []);

  useEffect(() => {
    if (paletteOpen) {
      paletteInputRef.current?.focus();
    }
  }, [paletteOpen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isPointerInsideCanvas) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      const printable = e.key.length === 1;
      const openKey = printable || e.key === ':' || e.key === '/';
      if (!openKey) return;
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setPalettePos({
          x: Math.max(8, Math.min(lastPointerCanvasRef.current.x + 10, rect.width - 280)),
          y: Math.max(8, Math.min(lastPointerCanvasRef.current.y + 10, rect.height - 70)),
        });
      }
      setPaletteOpen(true);
      setPaletteSuggestionIndex(-1);
      const seed = e.key === ':' || e.key === '/' ? '' : e.key;
      setPaletteText(seed);
      setTimeout(() => paletteInputRef.current?.focus(), 0);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isPointerInsideCanvas]);

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
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      ro = new ResizeObserver(() => updateSize());
      ro.observe(containerRef.current);
    }
    return () => {
      window.removeEventListener('resize', updateSize);
      ro?.disconnect();
    };
  }, []);

  useEffect(() => {
    const restoreCursor = () => {
      if (containerRef.current) {
        containerRef.current.style.cursor = '';
      }
    };
    const onMouseMove = (e: MouseEvent) => {
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
    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 1 && middlePanRef.current) {
        middlePanRef.current = null;
        restoreCursor();
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
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
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
      if (suppressStageClickRef.current) {
        suppressStageClickRef.current = false;
        return;
      }
      if (pendingInsertType && e.target === stageRef.current) {
        const pos = getStagePointerPosition();
        if (!pos) return;
        addComponent(
          pendingInsertType,
          snapToGrid(pos.x, circuit.gridSize),
          snapToGrid(pos.y, circuit.gridSize)
        );
        setPendingInsertType(null);
        setInsertCursor(null);
        setPaletteResult(`Placed ${pendingInsertType}`);
        return;
      }
      if (e.target === stageRef.current) {
        if (tool === 'wire' && wireInProgress) {
          const pos = getStagePointerPosition();
          if (!pos) return;
          // Wire vertices intentionally bypass the grid so they can stay
          // aligned with off-grid terminals — clicking commits the corner at
          // the exact cursor position along the current orientation axis.
          addWirePoint(pos.x, pos.y);
        } else if (tool === 'select') {
          setSelected(null);
        }
      }
    },
    [
      pendingInsertType,
      addComponent,
      circuit.gridSize,
      tool,
      wireInProgress,
      getStagePointerPosition,
      addWirePoint,
      setSelected,
    ]
  );

  const handleMouseMove = useCallback(
    () => {
      if (selectionRect && tool === 'select') {
        const pos = getStagePointerPosition();
        if (pos) {
          setSelectionRect((current) =>
            current
              ? {
                  ...current,
                  endX: pos.x,
                  endY: pos.y,
                }
              : current
          );
        }
      }
      if (pendingInsertType) {
        const pos = getStagePointerPosition();
        if (pos) setInsertCursor(pos);
      }
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
    [
      selectionRect,
      pendingInsertType,
      tool,
      wireInProgress,
      getStagePointerPosition,
      hoveredConnectionPoint,
    ]
  );

  const handleStageMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (tool !== 'select') return;
      if (e.evt.button !== 0) return;
      if (e.target !== stageRef.current) return;
      const pos = getStagePointerPosition();
      if (!pos) return;
      setSelectionRect({
        startX: pos.x,
        startY: pos.y,
        endX: pos.x,
        endY: pos.y,
      });
    },
    [tool, getStagePointerPosition]
  );

  const handleStageMouseUp = useCallback(() => {
    if (tool !== 'select' || !selectionRect) return;
    const dx = selectionRect.endX - selectionRect.startX;
    const dy = selectionRect.endY - selectionRect.startY;
    const dragDistanceSq = dx * dx + dy * dy;
    if (dragDistanceSq < 16) {
      setSelectionRect(null);
      return;
    }

    const x1 = Math.min(selectionRect.startX, selectionRect.endX);
    const y1 = Math.min(selectionRect.startY, selectionRect.endY);
    const x2 = Math.max(selectionRect.startX, selectionRect.endX);
    const y2 = Math.max(selectionRect.startY, selectionRect.endY);
    const windowMode = selectionRect.endX >= selectionRect.startX;
    const margin = 18;

    const selectedIds = new Set(
      circuit.components
        .filter((comp) => {
          const worldPoints = comp.connectionPoints.map((cp) =>
            connectionPointWorld(comp, cp)
          );
          worldPoints.push({ x: comp.x, y: comp.y });
          const xs = worldPoints.map((p) => p.x);
          const ys = worldPoints.map((p) => p.y);
          const bx1 = Math.min(...xs) - margin;
          const by1 = Math.min(...ys) - margin;
          const bx2 = Math.max(...xs) + margin;
          const by2 = Math.max(...ys) + margin;

          if (windowMode) {
            return bx1 >= x1 && by1 >= y1 && bx2 <= x2 && by2 <= y2;
          }
          const intersects = bx2 >= x1 && bx1 <= x2 && by2 >= y1 && by1 <= y2;
          return intersects;
        })
        .map((c) => c.id)
    );

    useCircuitStore.setState({
      selectedId: null,
      circuit: {
        ...circuit,
        components: circuit.components.map((c) => ({
          ...c,
          selected: selectedIds.has(c.id),
        })),
      },
    });
    suppressStageClickRef.current = true;
    setSelectionRect(null);
  }, [tool, selectionRect, circuit]);

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
      setDragPreviewType(null);
      setDragPreviewCursor(null);
      const type =
        (e.dataTransfer.getData('componentType') as ComponentType) ||
        (getDragComponentType() as ComponentType | undefined);
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
      clearDragComponentType();
    },
    [addComponent, circuit.panX, circuit.panY, circuit.zoom, circuit.gridSize]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type =
        (e.dataTransfer.getData('componentType') as ComponentType) ||
        (getDragComponentType() as ComponentType | undefined);
      if (!type) return;
      const rect = (
        e.target as HTMLElement
      ).closest('.circuit-canvas-container')?.getBoundingClientRect();
      if (!rect) return;
      const x = (e.clientX - rect.left - circuit.panX) / circuit.zoom;
      const y = (e.clientY - rect.top - circuit.panY) / circuit.zoom;
      setDragPreviewType(type);
      setDragPreviewCursor({ x, y });
    },
    [circuit.panX, circuit.panY, circuit.zoom]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    const next = e.relatedTarget as Node | null;
    if (next && containerRef.current?.contains(next)) return;
    clearDragComponentType();
    setDragPreviewType(null);
    setDragPreviewCursor(null);
  }, []);

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
      } else if (ctrlOrMetaPressedRef.current) {
        const { circuit: liveCircuit } = useCircuitStore.getState();
        useCircuitStore.setState({
          selectedId: id,
          circuit: {
            ...liveCircuit,
            components: liveCircuit.components.map((c) =>
              c.id === id ? { ...c, selected: true } : c
            ),
          },
        });
      } else {
        setSelected(id);
      }
    },
    [tool, removeComponent, setSelected]
  );

  const renderComponent = (comp: CircuitComponent) => {
    const nodeResult = simulationResult?.nodes[comp.id];
    const isSelected = selectedId === comp.id || comp.selected;
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
      case 'hrc_fuse':
      case 'control_circuit_fuse':
        return (
          <HrcFuseSymbol
            key={comp.id}
            {...commonProps}
            onToggle={() => toggleComponent(comp.id)}
          />
        );
      case 'earth_leakage_relay_cbct':
        return (
          <EarthLeakageRelayCbctSymbol
            key={comp.id}
            {...commonProps}
            onToggle={() => toggleComponent(comp.id)}
          />
        );
      case 'three_phase_mcb':
      case 'mccb':
      case 'motor_protection_circuit_breaker':
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
      case 'motorized_mccb':
      case 'four_pole_motorized_mccb':
        return (
          <MotorizedMCCBSymbol
            key={comp.id}
            {...commonProps}
            onToggle={() => toggleComponent(comp.id)}
            onReset={() => resetTripped(comp.id)}
          />
        );
      case 'rcd':
      case 'residual_current_circuit_breaker':
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
      case 'panel_heater':
      case 'cooling_fan':
      case 'generic_load':
        return <LoadSymbol key={comp.id} {...commonProps} />;
      case 'busbar':
      case 'busbar_system':
      case 'neutral_bar_system':
      case 'earth_bar_grounding_system':
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
      case 'terminal_block':
        return <TerminalBlockSymbol key={comp.id} {...commonProps} />;
      case 'power_source':
        return <PowerSourceSymbol key={comp.id} {...commonProps} />;
      case 'dc_power_source':
        return <DCPowerSourceSymbol key={comp.id} {...commonProps} />;
      case 'ac_dc_converter':
        return <ACDCConverterSymbol key={comp.id} {...commonProps} />;
      case 'control_transformer':
        return <ControlTransformerSymbol key={comp.id} {...commonProps} />;
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
      case 'smart_relay':
      case 'timer':
      case 'overload_relay':
        return (
          <ControlSymbol
            key={comp.id}
            {...commonProps}
          />
        );
      case 'estop':
        return (
          <EStopSymbol
            key={comp.id}
            {...commonProps}
            onToggle={() => toggleComponent(comp.id)}
          />
        );
      case 'selector_switch':
        return (
          <SelectorSwitchSymbol
            key={comp.id}
            {...commonProps}
            onCycle={() => {
              const order: ('OFF' | 'AUTO' | 'MANUAL')[] = ['OFF', 'AUTO', 'MANUAL'];
              const cur = comp.properties.selectorPosition ?? 'OFF';
              const next = order[(order.indexOf(cur) + 1) % order.length];
              updateComponent(comp.id, {
                properties: { ...comp.properties, selectorPosition: next },
              });
            }}
          />
        );
      case 'indicator_lamp':
        return <IndicatorLampSymbol key={comp.id} {...commonProps} />;
      case 'phase_indicator_bank':
        return <PhaseIndicatorBankSymbol key={comp.id} {...commonProps} />;
      case 'smps':
        return <SmpsSymbol key={comp.id} {...commonProps} />;
      case 'interposing_relay':
        return <InterposingRelaySymbol key={comp.id} {...commonProps} />;
      case 'aux_contact_block':
        return (
          <AuxContactBlockSymbol
            key={comp.id}
            {...commonProps}
          />
        );
      case 'energy_meter':
      case 'digital_multifunction_meter':
        return <EnergyMeterSymbol key={comp.id} {...commonProps} />;
      case 'multimeter':
        return (
          <MultimeterSymbol
            key={comp.id}
            {...commonProps}
            onCycleMode={() => {
              const order: ('voltage' | 'current' | 'continuity')[] = [
                'voltage',
                'current',
                'continuity',
              ];
              const p = comp.properties as {
                multimeterMode?: 'voltage' | 'current' | 'continuity';
              };
              const cur = p.multimeterMode ?? 'voltage';
              const next = order[(order.indexOf(cur) + 1) % order.length];
              updateComponent(comp.id, {
                properties: { ...comp.properties, multimeterMode: next },
              });
            }}
          />
        );
      case 'door_interlock':
      case 'mechanical_interlock':
        return (
          <DoorInterlockSymbol
            key={comp.id}
            {...commonProps}
            onToggle={() => toggleComponent(comp.id)}
          />
        );
      case 'modbus_tcp_gateway':
        return <ModbusTcpGatewaySymbol key={comp.id} {...commonProps} />;
      case 'bacnet_ip_gateway':
        return <BacnetIpGatewaySymbol key={comp.id} {...commonProps} />;
      case 'di_module':
      case 'do_module':
      case 'ai_module':
      case 'ao_module':
        return <BmsIOModuleSymbol key={comp.id} {...commonProps} />;
      case 'relay_interface_card':
      case 'modbus_rtu_module':
      case 'communication_converter':
      case 'iot_gateway':
      case 'cloud_monitoring_module':
      case 'energy_management_controller':
      case 'ethernet_switch':
        return <CommInfraSymbol key={comp.id} {...commonProps} />;
      case 'signal_isolator':
      case 'optocoupler_module':
        return <SignalIsolationSymbol key={comp.id} {...commonProps} />;
      case 'ups_module':
      case 'dc_battery_backup':
      case 'motor_operator_kit':
      case 'shunt_trip_coil':
      case 'closing_coil':
      case 'uvr_release':
      case 'key_interlock':
      case 'neutral_link':
      case 'earth_link':
      case 'current_transformer':
      case 'voltage_transformer':
      case 'din_rail':
      case 'mounting_plate':
      case 'cable_duct':
      case 'busbar_support_insulator':
      case 'ferrule_cable_markers':
      case 'control_wiring':
      case 'power_cables':
      case 'ms_gi_sheet_enclosure':
      case 'ip_rated_enclosure':
      case 'power_quality_analyzer':
        return <PowerAuxSymbol key={comp.id} {...commonProps} />;
      default:
        return null;
    }
  };

  const findNearestSnapTerminal = useCallback(
    (x: number, y: number, excludeComponentId: string) => {
      let best:
        | {
            componentId: string;
            pointId: string;
            x: number;
            y: number;
            dist: number;
          }
        | null = null;
      for (const c of circuit.components) {
        if (c.id === excludeComponentId) continue;
        for (const cp of c.connectionPoints) {
          const wp = connectionPointWorld(c, cp);
          const d = Math.hypot(wp.x - x, wp.y - y);
          if (!best || d < best.dist) {
            best = { componentId: c.id, pointId: cp.id, x: wp.x, y: wp.y, dist: d };
          }
        }
      }
      return best && best.dist <= 22 ? best : null;
    },
    [circuit.components]
  );

  const renderMultimeterLeads = (comp: CircuitComponent) => {
    if (comp.type !== 'multimeter') return null;
    const p = comp.properties as {
      multimeterComTargetComponentId?: string;
      multimeterComTargetPointId?: string;
      multimeterInputTargetComponentId?: string;
      multimeterInputTargetPointId?: string;
      multimeterComProbeX?: number;
      multimeterComProbeY?: number;
      multimeterInputProbeX?: number;
      multimeterInputProbeY?: number;
    };
    const comJack = comp.connectionPoints.find((cp) => cp.label.toUpperCase() === 'COM');
    const inJack = comp.connectionPoints.find((cp) => cp.label.toUpperCase().includes('V'));
    if (!comJack || !inJack) return null;

    const comJackW = connectionPointWorld(comp, comJack);
    const inJackW = connectionPointWorld(comp, inJack);

    const resolveTargetPoint = (cid?: string, pid?: string) => {
      if (!cid || !pid) return null;
      const tc = circuit.components.find((c) => c.id === cid);
      if (!tc) return null;
      const tp = tc.connectionPoints.find((cp) => cp.id === pid);
      if (!tp) return null;
      return connectionPointWorld(tc, tp);
    };
    const comTarget = resolveTargetPoint(
      p.multimeterComTargetComponentId,
      p.multimeterComTargetPointId
    );
    const inTarget = resolveTargetPoint(
      p.multimeterInputTargetComponentId,
      p.multimeterInputTargetPointId
    );
    const comProbe = comTarget ?? {
      x: p.multimeterComProbeX ?? comJackW.x - 24,
      y: p.multimeterComProbeY ?? comJackW.y - 80,
    };
    const inProbe = inTarget ?? {
      x: p.multimeterInputProbeX ?? inJackW.x + 24,
      y: p.multimeterInputProbeY ?? inJackW.y - 80,
    };

    const setProbe = (which: 'com' | 'input', x: number, y: number) => {
      const snap = findNearestSnapTerminal(x, y, comp.id);
      if (which === 'com') {
        updateComponent(comp.id, {
          properties: {
            ...comp.properties,
            multimeterComProbeX: snap?.x ?? x,
            multimeterComProbeY: snap?.y ?? y,
            multimeterComTargetComponentId: snap?.componentId,
            multimeterComTargetPointId: snap?.pointId,
          },
        });
      } else {
        updateComponent(comp.id, {
          properties: {
            ...comp.properties,
            multimeterInputProbeX: snap?.x ?? x,
            multimeterInputProbeY: snap?.y ?? y,
            multimeterInputTargetComponentId: snap?.componentId,
            multimeterInputTargetPointId: snap?.pointId,
          },
        });
      }
    };

    return (
      <React.Fragment key={`${comp.id}-leads`}>
        <Line
          points={[comJackW.x, comJackW.y, comProbe.x, comProbe.y]}
          stroke="#60A5FA"
          strokeWidth={2}
          listening={false}
        />
        <Line
          points={[inJackW.x, inJackW.y, inProbe.x, inProbe.y]}
          stroke="#F87171"
          strokeWidth={2}
          listening={false}
        />
        <Circle
          x={comProbe.x}
          y={comProbe.y}
          radius={7}
          fill="#1D4ED8"
          stroke="#93C5FD"
          strokeWidth={1}
          draggable
          onDragEnd={(e) => {
            e.cancelBubble = true;
            setProbe('com', e.target.x(), e.target.y());
          }}
        />
        <Text
          x={comProbe.x - 10}
          y={comProbe.y - 18}
          width={20}
          text="COM"
          align="center"
          fontSize={8}
          fill="#93C5FD"
          listening={false}
        />
        <Circle
          x={inProbe.x}
          y={inProbe.y}
          radius={7}
          fill="#B91C1C"
          stroke="#FCA5A5"
          strokeWidth={1}
          draggable
          onDragEnd={(e) => {
            e.cancelBubble = true;
            setProbe('input', e.target.x(), e.target.y());
          }}
        />
        <Text
          x={inProbe.x - 10}
          y={inProbe.y - 18}
          width={20}
          text="VΩA"
          align="center"
          fontSize={8}
          fill="#FCA5A5"
          listening={false}
        />
      </React.Fragment>
    );
  };

  // Handle keyboard for escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelWire();
        setPendingInsertType(null);
        setInsertCursor(null);
        setSelected(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cancelWire, setSelected]);

  // Keep time-dependent devices (e.g. timer ON-delay) progressing even when
  // the user is not interacting with the canvas.
  useEffect(() => {
    const hasTimer = circuit.components.some((c) => c.type === 'timer');
    if (!hasTimer) return;
    const id = window.setInterval(() => {
      runSimulation();
    }, 200);
    return () => window.clearInterval(id);
  }, [circuit.components, runSimulation]);

  return (
    <div
      ref={containerRef}
      className={`circuit-canvas-container flex-1 overflow-hidden`}
      style={{ backgroundColor: tc.canvasHex }}
      onMouseEnter={() => setIsPointerInsideCanvas(true)}
      onMouseLeave={() => setIsPointerInsideCanvas(false)}
      onMouseMove={(e) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        lastPointerCanvasRef.current = { x, y };
        if (!paletteOpen) {
          setPalettePos({
            x: Math.max(8, Math.min(x + 10, rect.width - 280)),
            y: Math.max(8, Math.min(y + 10, rect.height - 70)),
          });
        }
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onAuxClick={(e) => {
        if (e.button === 1) {
          e.preventDefault();
        }
      }}
      onMouseDownCapture={(e: React.MouseEvent) => {
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
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleStageMouseUp}
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
          wireOrientation={wireOrientation}
          draftWireColor={wireDraftColor}
        />

        <Layer>
          {circuit.components.map(renderComponent)}
        </Layer>
        <Layer>
          {circuit.components.map(renderMultimeterLeads)}
        </Layer>
        {pendingPreviewComponent && (
          <Layer opacity={0.7} listening={false}>
            {renderComponent(pendingPreviewComponent)}
          </Layer>
        )}
        {selectionRect && tool === 'select' && (
          <Layer listening={false}>
            <Rect
              x={Math.min(selectionRect.startX, selectionRect.endX)}
              y={Math.min(selectionRect.startY, selectionRect.endY)}
              width={Math.abs(selectionRect.endX - selectionRect.startX)}
              height={Math.abs(selectionRect.endY - selectionRect.startY)}
              fill={
                selectionRect.endX >= selectionRect.startX
                  ? 'rgba(59,130,246,0.12)'
                  : 'rgba(34,197,94,0.12)'
              }
              stroke={selectionRect.endX >= selectionRect.startX ? '#3B82F6' : '#22C55E'}
              strokeWidth={1}
              dash={[6, 4]}
            />
          </Layer>
        )}

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
                    radius={4.5}
                    fill="#3B82F6"
                    opacity={0.01}
                    hitStrokeWidth={8}
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

            {hoveredConnectionPoint && (
              <Circle
                x={hoveredConnectionPoint.x}
                y={hoveredConnectionPoint.y}
                radius={3}
                stroke="#22C55E"
                strokeWidth={0.6}
                fill="rgba(34,197,94,0.08)"
                listening={false}
              />
            )}

            {wireDockHint &&
              (() => {
                const stroke = wireDockHint.aligned ? '#16A34A' : '#F59E0B';
                const fill = wireDockHint.aligned
                  ? 'rgba(22,163,74,0.18)'
                  : 'rgba(245,158,11,0.18)';
                const half = 4;
                const tickLen = 3;
                // The "perp" glyph mimics AutoCAD's perpendicular osnap: a
                // small square with a stem and a tick perpendicular to the
                // terminal's outward axis, so the user can read the dock
                // direction at a glance.
                const stemPoints =
                  wireDockHint.axis === 'h'
                    ? [
                        wireDockHint.x - half,
                        wireDockHint.y,
                        wireDockHint.x - half + tickLen,
                        wireDockHint.y,
                      ]
                    : [
                        wireDockHint.x,
                        wireDockHint.y - half,
                        wireDockHint.x,
                        wireDockHint.y - half + tickLen,
                      ];
                const tickPoints =
                  wireDockHint.axis === 'h'
                    ? [
                        wireDockHint.x - half + tickLen,
                        wireDockHint.y - tickLen,
                        wireDockHint.x - half + tickLen,
                        wireDockHint.y + tickLen,
                      ]
                    : [
                        wireDockHint.x - tickLen,
                        wireDockHint.y - half + tickLen,
                        wireDockHint.x + tickLen,
                        wireDockHint.y - half + tickLen,
                      ];
                return (
                  <>
                    <Rect
                      x={wireDockHint.x - half}
                      y={wireDockHint.y - half}
                      width={half * 2}
                      height={half * 2}
                      stroke={stroke}
                      strokeWidth={0.6}
                      fill={fill}
                      listening={false}
                    />
                    <Line
                      points={stemPoints}
                      stroke={stroke}
                      strokeWidth={0.6}
                      lineCap="round"
                      listening={false}
                    />
                    <Line
                      points={tickPoints}
                      stroke={stroke}
                      strokeWidth={0.6}
                      lineCap="round"
                      listening={false}
                    />
                  </>
                );
              })()}
          </Layer>
        )}
      </Stage>
      {paletteOpen && (
        <div
          className={`absolute z-20 px-2 py-1 rounded border ${tc.border} ${tc.toolbar} shadow-lg`}
          style={{ left: palettePos.x, top: palettePos.y }}
        >
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-blue-400">Cmd</span>
            <input
              ref={paletteInputRef}
              value={paletteText}
              onChange={(e) => {
                setPaletteText(e.target.value);
                setPaletteSuggestionIndex(-1);
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  if (paletteSuggestions.length > 0) {
                    setPaletteSuggestionIndex((prev) => {
                      const next = prev + 1;
                      return next >= paletteSuggestions.length ? 0 : next;
                    });
                  }
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  if (paletteSuggestions.length > 0) {
                    setPaletteSuggestionIndex((prev) => {
                      const next = prev - 1;
                      return next < 0 ? paletteSuggestions.length - 1 : next;
                    });
                  }
                } else if (e.key === 'Enter') {
                  const activeText =
                    paletteSuggestionIndex >= 0 &&
                    paletteSuggestionIndex < paletteSuggestions.length
                      ? paletteSuggestions[paletteSuggestionIndex]
                      : paletteText;
                  executePaletteCommand(activeText);
                } else if (e.key === 'Escape') {
                  setPaletteOpen(false);
                  setPaletteText('');
                  setPaletteSuggestionIndex(-1);
                }
              }}
              placeholder="s | w | add mcb | z e"
              className={`h-6 px-2 rounded border ${tc.border} ${tc.canvas} ${tc.text} text-[11px] w-52 outline-none`}
            />
          </div>
          {paletteResult && (
            <div className="text-[10px] text-emerald-400 mt-1 max-w-56 truncate">
              {paletteResult}
            </div>
          )}
          {paletteSuggestions.length > 0 && (
            <div className="mt-1 space-y-0.5">
              {paletteSuggestions.map((hint: string) => (
                <div
                  key={hint}
                  className={`text-[10px] ${
                    paletteSuggestions[paletteSuggestionIndex] === hint
                      ? 'text-blue-300'
                      : tc.textMuted
                  } cursor-pointer hover:opacity-100 opacity-85`}
                  onMouseEnter={() =>
                    setPaletteSuggestionIndex(paletteSuggestions.indexOf(hint))
                  }
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setPaletteText(hint);
                    setPaletteSuggestionIndex(paletteSuggestions.indexOf(hint));
                    executePaletteCommand(hint);
                  }}
                >
                  {hint}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CircuitCanvas;
