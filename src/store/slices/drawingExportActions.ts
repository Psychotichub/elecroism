import { v4 as uuid } from 'uuid';
import type { CircuitComponent, DrawingSheet } from '../../types';
import { boundsForComponents } from '../../utils/drawingBounds';
import { downloadDrawingPdf } from '../../utils/drawingExport';
import { downloadDocumentationPack } from '../../utils/documentationPackExport';
import { downloadSldPdf, waitForCanvasRepaint } from '../../utils/sldExport';
import { useUiStore } from '../uiStore';
import type { DrawingMetadataPatch } from '../circuitStoreTypes';
import type { CircuitStoreGet, CircuitStoreSet } from './sliceTypes';

export type { DrawingMetadataPatch };

export function createDrawingExportActions(
  set: CircuitStoreSet,
  get: CircuitStoreGet
) {
  return {
    setDrawingMetadata: (patch: DrawingMetadataPatch) => {
      set((state) => ({
        circuit: {
          ...state.circuit,
          ...patch,
          updatedAt: new Date().toISOString(),
        },
      }));
    },

    addDrawingSheet: (partial?: Partial<DrawingSheet>) => {
      set((state) => {
        const existing: DrawingSheet[] = state.circuit.drawingSheets ?? [];
        const nextNum =
          existing.reduce(
            (m: number, s: DrawingSheet) => Math.max(m, s.sheetNumber),
            0
          ) + 1;
        const sheet: DrawingSheet = {
          id: uuid(),
          sheetNumber: partial?.sheetNumber ?? nextNum,
          title: partial?.title ?? `Sheet ${nextNum}`,
          reference: partial?.reference ?? `=S${nextNum}`,
          minX: partial?.minX,
          minY: partial?.minY,
          maxX: partial?.maxX,
          maxY: partial?.maxY,
          componentIds: partial?.componentIds,
        };
        return {
          circuit: {
            ...state.circuit,
            drawingSheets: [...existing, sheet],
            updatedAt: new Date().toISOString(),
          },
        };
      });
    },

    addDrawingSheetFromSelection: () => {
      const state = get();
      const ids = state.circuit.components
        .filter((c: CircuitComponent) => c.selected)
        .map((c: CircuitComponent) => c.id);
      if (ids.length === 0) return false;
      const bounds = boundsForComponents(state.circuit, ids);
      const existing: DrawingSheet[] = state.circuit.drawingSheets ?? [];
      const nextNum =
        existing.reduce(
          (m: number, s: DrawingSheet) => Math.max(m, s.sheetNumber),
          0
        ) + 1;
      const sheet: DrawingSheet = {
        id: uuid(),
        sheetNumber: nextNum,
        title: `Sheet ${nextNum}`,
        reference: `=S${nextNum}`,
        componentIds: ids,
        ...(bounds
          ? {
              minX: bounds.minX,
              minY: bounds.minY,
              maxX: bounds.maxX,
              maxY: bounds.maxY,
            }
          : {}),
      };
      set({
        circuit: {
          ...state.circuit,
          drawingSheets: [...existing, sheet],
          updatedAt: new Date().toISOString(),
        },
      });
      return true;
    },

    updateDrawingSheet: (id: string, patch: Partial<DrawingSheet>) => {
      set((state) => ({
        circuit: {
          ...state.circuit,
          drawingSheets: (state.circuit.drawingSheets ?? []).map((s) =>
            s.id === id ? { ...s, ...patch, id: s.id } : s
          ),
          updatedAt: new Date().toISOString(),
        },
      }));
    },

    removeDrawingSheet: (id: string) => {
      set((state) => ({
        circuit: {
          ...state.circuit,
          drawingSheets: (state.circuit.drawingSheets ?? []).filter(
            (s) => s.id !== id
          ),
          updatedAt: new Date().toISOString(),
        },
      }));
    },

    exportDrawingPdf: async () => {
      const stage = useUiStore.getState().konvaStage;
      if (!stage) {
        return 'Canvas not ready — open the schematic view first.';
      }
      const circuit = get().circuit;
      if (
        circuit.components.length === 0 &&
        circuit.wires.length === 0
      ) {
        return 'Nothing to export — add components or wires first.';
      }
      try {
        await downloadDrawingPdf(
          stage,
          circuit,
          circuit.name || 'circuit',
          get().project
        );
        return null;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return `PDF export failed: ${msg}`;
      }
    },

    exportSldPdf: async () => {
      const stage = useUiStore.getState().konvaStage;
      if (!stage) {
        return 'Canvas not ready — open the schematic view first.';
      }
      const circuit = get().circuit;
      if (circuit.components.length === 0 && circuit.wires.length === 0) {
        return 'Nothing to export — add components or wires first.';
      }
      const wasSld = useUiStore.getState().sldViewMode;
      if (!wasSld) useUiStore.getState().setSldViewMode(true);
      try {
        await waitForCanvasRepaint();
        await downloadSldPdf(
          stage,
          circuit,
          circuit.name || 'circuit',
          get().project
        );
        return null;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return `SLD PDF export failed: ${msg}`;
      } finally {
        if (!wasSld) useUiStore.getState().setSldViewMode(false);
      }
    },

    exportDocumentationPack: async () => {
      const stage = useUiStore.getState().konvaStage;
      if (!stage) {
        return 'Canvas not ready — open the schematic view first.';
      }
      const { circuit, project, simulationResult } = get();
      if (circuit.components.length === 0 && circuit.wires.length === 0) {
        return 'Nothing to export — add components or wires first.';
      }
      try {
        await downloadDocumentationPack(
          stage,
          circuit,
          simulationResult,
          project
        );
        return null;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return `Documentation pack export failed: ${msg}`;
      }
    },
  };
}
