import { useCircuitStore } from '../store/circuitStore';
import { useUiStore } from '../store/uiStore';
import { useThemeStore } from '../store/themeStore';
import { exportToPNG } from '../utils/export';
import { downloadCoordinationStudyPdf } from '../utils/coordinationStudyReport';
import { fitToScreen, openProjectFile } from '../hooks/useGlobalEditorShortcuts';
import { isMenuActionId } from './menuActionIds';

/**
 * Run a shared menu action (native OS menu or in-app menu bar).
 * Returns false when the action id is unknown.
 */
export async function executeMenuAction(actionId: string): Promise<boolean> {
  if (!isMenuActionId(actionId)) return false;

  const circuitStore = useCircuitStore.getState();
  const uiStore = useUiStore.getState();
  const themeStore = useThemeStore.getState();

  switch (actionId) {
    case 'new':
      circuitStore.clearCircuit();
      return true;
    case 'open':
      openProjectFile();
      return true;
    case 'save':
      circuitStore.saveCircuit();
      return true;
    case 'project-settings':
      uiStore.setProjectSettingsOpen(true);
      return true;
    case 'get-library-packs':
      uiStore.setLibraryPackBrowserOpen(true);
      return true;
    case 'export-png': {
      const stage = uiStore.konvaStage;
      if (!stage) {
        window.alert('Canvas not ready — try again in a moment.');
        return true;
      }
      exportToPNG(stage, `${circuitStore.circuit.name}.png`);
      return true;
    }
    case 'export-pdf': {
      const err = await circuitStore.exportDrawingPdf();
      if (err) window.alert(err);
      return true;
    }
    case 'coordination-pdf':
      try {
        downloadCoordinationStudyPdf(
          circuitStore.circuit,
          circuitStore.simulationResult
        );
      } catch (e) {
        window.alert(e instanceof Error ? e.message : 'Export failed.');
      }
      return true;
    case 'export-documentation-pack': {
      const err = await circuitStore.exportDocumentationPack();
      if (err) window.alert(err);
      return true;
    }
    case 'export-wire-csv':
      circuitStore.exportWireScheduleCsv();
      return true;
    case 'export-bom-csv':
      circuitStore.exportBomCsv();
      return true;
    case 'export-terminal-csv':
      circuitStore.exportTerminalScheduleCsv();
      return true;
    case 'export-cable-csv':
      circuitStore.exportCableScheduleCsv();
      return true;
    case 'export-panel-schedule-csv':
      circuitStore.exportPanelScheduleCsv();
      return true;
    case 'export-panel-schedule-pdf': {
      const err = circuitStore.exportPanelSchedulePdf();
      if (err) window.alert(err);
      return true;
    }
    case 'export-review-comments-pdf': {
      const err = circuitStore.exportReviewCommentsPdf();
      if (err) window.alert(err);
      return true;
    }
    case 'export-review-comments-json': {
      const err = circuitStore.exportReviewCommentsJson();
      if (err) window.alert(err);
      return true;
    }
    case 'undo':
      circuitStore.undo();
      return true;
    case 'redo':
      circuitStore.redo();
      return true;
    case 'cut':
      circuitStore.cutSelection();
      return true;
    case 'copy':
      circuitStore.copySelection();
      return true;
    case 'paste':
      circuitStore.pasteSelection();
      return true;
    case 'select-all': {
      const { circuit } = circuitStore;
      useCircuitStore.setState({
        selectedId: null,
        circuit: {
          ...circuit,
          components: circuit.components.map((c) => ({ ...c, selected: true })),
        },
      });
      return true;
    }
    case 'rotate': {
      const { selectedId, rotateComponent } = circuitStore;
      if (selectedId) rotateComponent(selectedId);
      return true;
    }
    case 'zoom-in':
      circuitStore.setZoom(circuitStore.circuit.zoom * 1.2);
      return true;
    case 'zoom-out':
      circuitStore.setZoom(circuitStore.circuit.zoom / 1.2);
      return true;
    case 'fit-screen':
      fitToScreen();
      return true;
    case 'toggle-wire-labels':
      circuitStore.setCircuitWireLabelsVisible(
        circuitStore.circuit.wireLabelsVisible === false
      );
      return true;
    case 'toggle-connection-overlay':
      uiStore.toggleConnectionIntegrityOverlay();
      return true;
    case 'toggle-arc-flash':
      uiStore.toggleArcFlashBadges();
      return true;
    case 'toggle-object-snap':
      circuitStore.toggleWireObjectSnap();
      return true;
    case 'toggle-ortho':
      circuitStore.toggleWireOrtho();
      return true;
    case 'toggle-grid-snap':
      circuitStore.toggleWireGridSnap();
      return true;
    case 'toggle-auto-route':
      circuitStore.toggleWireAutoRoute();
      return true;
    case 'toggle-sld-view':
      uiStore.toggleSldViewMode();
      return true;
    case 'export-sld-pdf': {
      const err = await circuitStore.exportSldPdf();
      if (err) window.alert(err);
      return true;
    }
    case 'cycle-theme':
      themeStore.cycleTheme();
      return true;
    case 'run-simulation':
      circuitStore.runSimulation();
      return true;
    case 'toggle-sidebar':
      uiStore.toggleSidebarCollapsed();
      return true;
    case 'toggle-inspector':
      uiStore.togglePropertyPanelCollapsed();
      return true;
    case 'command-palette':
      uiStore.setCommandPaletteOpen(true);
      return true;
    case 'about':
      await window.electronAPI?.showAbout?.();
      return true;
    case 'check-for-updates':
      await window.electronAPI?.checkForUpdates?.();
      return true;
    default:
      return false;
  }
}
