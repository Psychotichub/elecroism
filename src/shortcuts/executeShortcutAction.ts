import { useCircuitStore } from '../store/circuitStore';
import { useErrorReportingStore } from '../store/errorReportingStore';
import { useShortcutStore } from '../store/shortcutStore';
import { executeMenuAction } from '../menu/executeMenuAction';
import { isMenuActionId } from '../menu/menuActionIds';
import type { ShortcutActionId } from './shortcutRegistry';

function handleDeleteSelection(): void {
  const {
    selectedId,
    removeComponent,
    removeWire,
    removeWireVertex,
    wireGripVertexIndex,
    circuit,
    wireInProgress,
  } = useCircuitStore.getState();

  const selectedComponentIds = circuit.components
    .filter((c) => c.selected)
    .map((c) => c.id);
  if (selectedComponentIds.length > 0) {
    selectedComponentIds.forEach((id) => removeComponent(id));
    return;
  }
  if (!selectedId) return;

  const selWire = circuit.wires.find((w) => w.id === selectedId);
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

  void wireInProgress;
}

/**
 * Dispatch any bindable shortcut action (menu, tool, or editor-specific).
 */
export async function executeShortcutAction(
  actionId: ShortcutActionId
): Promise<boolean> {
  if (isMenuActionId(actionId)) {
    return executeMenuAction(actionId);
  }

  const circuitStore = useCircuitStore.getState();

  switch (actionId) {
    case 'tool-select':
      circuitStore.setTool('select');
      return true;
    case 'tool-wire':
      circuitStore.setTool('wire');
      return true;
    case 'tool-delete':
      circuitStore.setTool('delete');
      return true;
    case 'tool-pan':
      circuitStore.setTool('pan');
      return true;
    case 'delete-selection':
      handleDeleteSelection();
      return true;
    case 'toggle-wire-orientation': {
      const { tool, wireInProgress } = circuitStore;
      if (tool === 'wire' && wireInProgress) {
        circuitStore.toggleWireOrientation();
      }
      return true;
    }
    case 'shortcut-settings':
      useShortcutStore.getState().setSettingsOpen(true);
      return true;
    case 'privacy-settings':
      useErrorReportingStore.getState().setSettingsOpen(true);
      return true;
    default:
      return false;
  }
}
