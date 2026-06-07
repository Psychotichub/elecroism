import { useEffect } from 'react';
import { useCircuitStore } from '../store/circuitStore';
import { isAnySheetDirty } from '../utils/sheetDirtyState';

export function useProjectDocumentTitle(): void {
  const project = useCircuitStore((s) => s.project);
  const circuit = useCircuitStore((s) => s.circuit);
  const baselines = useCircuitStore((s) => s.sheetSaveBaselines);

  useEffect(() => {
    const dirty = isAnySheetDirty(project, circuit, baselines);
    const prefix = dirty ? '• ' : '';
    document.title = `${prefix}${project.name} — ElectroSim`;
  }, [project, circuit, baselines]);
}
