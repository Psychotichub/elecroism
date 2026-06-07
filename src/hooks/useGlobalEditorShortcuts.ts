import { useEffect } from 'react';
import { useCircuitStore } from '../store/circuitStore';
import type { ToolMode } from '../types';

export function openProjectFile(): void {
  const { loadProjectFromDocument } = useCircuitStore.getState();
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.eproj,.esim,.json';
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as unknown;
        if (!loadProjectFromDocument(data)) {
          alert('Invalid project file format');
        }
      } catch {
        alert('Invalid file format');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

export function fitToScreen(): void {
  const { setZoom, setPan } = useCircuitStore.getState();
  setZoom(1);
  setPan(100, 50);
}

/** AutoCAD-style editor shortcuts (global, except when typing in form fields). */
export function useGlobalEditorShortcuts(): void {
  const circuitZoom = useCircuitStore((s) => s.circuit.zoom);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const ctrl = e.ctrlKey || e.metaKey;
      const {
        undo,
        redo,
        saveCircuit,
        clearCircuit,
        setTool,
        setZoom,
        circuit,
      } = useCircuitStore.getState();

      if (ctrl && e.key === 'z') {
        e.preventDefault();
        undo();
      } else if (ctrl && e.key === 'y') {
        e.preventDefault();
        redo();
      } else if (ctrl && e.key === 's') {
        e.preventDefault();
        saveCircuit();
      } else if (ctrl && e.key === 'o') {
        e.preventDefault();
        openProjectFile();
      } else if (ctrl && e.key === 'n') {
        e.preventDefault();
        clearCircuit();
      } else if (ctrl && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        useCircuitStore.getState().copySelection();
      } else if (ctrl && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        useCircuitStore.getState().pasteSelection();
      } else if (ctrl && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        useCircuitStore.getState().cutSelection();
      } else if (ctrl && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        const { circuit: liveCircuit } = useCircuitStore.getState();
        useCircuitStore.setState({
          selectedId: null,
          circuit: {
            ...liveCircuit,
            components: liveCircuit.components.map((c) => ({
              ...c,
              selected: true,
            })),
          },
        });
      } else {
        const keyMap: Record<string, ToolMode> = {
          v: 'select',
          w: 'wire',
          e: 'delete',
          ' ': 'pan',
        };
        const mappedTool = keyMap[e.key.toLowerCase()];
        if (mappedTool) {
          e.preventDefault();
          setTool(mappedTool);
        }

        if (e.key === '+' || e.key === '=') {
          setZoom(circuit.zoom * 1.2);
        } else if (e.key === '-') {
          setZoom(circuit.zoom / 1.2);
        } else if (e.key === 'f' || e.key === 'F') {
          fitToScreen();
        } else if (e.key === 'F3') {
          e.preventDefault();
          useCircuitStore.getState().toggleWireObjectSnap();
        } else if (e.key === 'F8') {
          e.preventDefault();
          useCircuitStore.getState().toggleWireOrtho();
        } else if (e.key === 'F9') {
          e.preventDefault();
          useCircuitStore.getState().toggleWireGridSnap();
        } else if (e.key === 'Tab') {
          const { tool, wireInProgress } = useCircuitStore.getState();
          if (tool === 'wire' && wireInProgress) {
            e.preventDefault();
            useCircuitStore.getState().toggleWireOrientation();
          }
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
          const {
            selectedId,
            removeComponent,
            removeWire,
            removeWireVertex,
            wireGripVertexIndex,
            circuit: liveCircuit,
            wireInProgress: wipWire,
          } = useCircuitStore.getState();
          if (e.key === 'Backspace' && wipWire) {
            return;
          }
          const selectedComponentIds = liveCircuit.components
            .filter((c) => c.selected)
            .map((c) => c.id);
          if (selectedComponentIds.length > 0) {
            selectedComponentIds.forEach((id) => removeComponent(id));
          } else if (selectedId) {
            const selWire = liveCircuit.wires.find((w) => w.id === selectedId);
            const nVerts = selWire ? selWire.points.length / 2 : 0;
            const canRemoveInteriorGrip =
              selWire &&
              wireGripVertexIndex != null &&
              wireGripVertexIndex > 0 &&
              wireGripVertexIndex < nVerts - 1;
            if (selWire && canRemoveInteriorGrip) {
              removeWireVertex(selectedId, wireGripVertexIndex);
            } else if (selWire) {
              removeWire(selectedId);
            } else {
              removeComponent(selectedId);
            }
          }
        } else if (e.key === 'r' || e.key === 'R') {
          const { selectedId, rotateComponent } = useCircuitStore.getState();
          if (selectedId) {
            rotateComponent(selectedId);
          }
        } else if (
          e.key === 'ArrowLeft' ||
          e.key === 'ArrowRight' ||
          e.key === 'ArrowUp' ||
          e.key === 'ArrowDown'
        ) {
          const st = useCircuitStore.getState();
          if (st.tool !== 'select') return;
          const selectedCount = st.circuit.components.filter(
            (c) => c.selected || c.id === st.selectedId
          ).length;
          if (selectedCount === 0) return;
          e.preventDefault();
          const step = (e.shiftKey ? 10 : 1) * st.circuit.gridSize;
          const dx =
            e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
          const dy =
            e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
          st.nudgeSelection(dx, dy);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [circuitZoom]);
}
