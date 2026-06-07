import { lazy, Suspense, useEffect, useState } from 'react';
import AppMenuBar from './components/Toolbar/AppMenuBar';
import Toolbar from './components/Toolbar/Toolbar';
import { useGlobalEditorShortcuts } from './hooks/useGlobalEditorShortcuts';
import { useElectronMenuBridge } from './hooks/useElectronMenuBridge';
import { useProjectFileDrop } from './hooks/useProjectFileDrop';
import ProjectDropOverlay from './components/Dialogs/ProjectDropOverlay';
import { syncRecentMenuToNative } from './utils/projectOpen';
const Sidebar = lazy(() => import('./components/Panels/Sidebar'));
const CircuitCanvas = lazy(() => import('./components/Canvas/CircuitCanvas'));
const InspectorColumn = lazy(() => import('./components/Panels/InspectorColumn'));
import StatusBar from './components/Panels/StatusBar';
import FaultDialog from './components/Dialogs/FaultDialog';
import CommandPalette from './components/Dialogs/CommandPalette';
import ShortcutSettingsDialog from './components/Dialogs/ShortcutSettingsDialog';
import PrivacySettingsDialog from './components/Dialogs/PrivacySettingsDialog';
import ProjectSettingsDialog from './components/Dialogs/ProjectSettingsDialog';
import LibraryPackBrowserDialog from './components/Dialogs/LibraryPackBrowserDialog';
import TutorialPanel from './components/Panels/TutorialPanel';
import ChallengePanel from './components/Panels/ChallengePanel';
import AssignmentPanel from './components/Panels/AssignmentPanel';
import GradeSubmissionsDialog from './components/Dialogs/GradeSubmissionsDialog';
import RestoreSessionDialog from './components/Dialogs/RestoreSessionDialog';
import SheetTabs from './components/Toolbar/SheetTabs';
import { useCircuitStore } from './store/circuitStore';
import { loadAutosave } from './utils/projectPersistence';
import { hasAnySnapshots } from './utils/projectSnapshots';
import { useUiStore } from './store/uiStore';
import ContinuityBuzzer from './components/Audio/ContinuityBuzzer';
import TripSound from './components/Audio/TripSound';
import { AppErrorBoundary } from './components/ErrorBoundary/AppErrorBoundary';
import { themeColors, useThemeStore } from './store/themeStore';
import WebInstallBanner from './components/Pwa/WebInstallBanner';
import { MOTION_CLASS } from './design/motion';
import { cn } from './components/ui/cn';
import { useProjectDocumentTitle } from './hooks/useProjectDocumentTitle';
import PanelSplitter from './components/layout/PanelSplitter';
import PaletteIconRail from './components/Panels/PaletteIconRail';
import {
  PALETTE_RAIL_WIDTH,
  PANEL_WIDTH_LIMITS,
  SIDEBAR_RAIL_SNAP_THRESHOLD,
} from './constants/panelLayout';

const errPanel =
  'flex flex-col items-center justify-center gap-3 border border-amber-600/40 bg-amber-950/90 p-4 text-center text-amber-50';

function App() {
  const theme = useThemeStore((s) => s.theme);
  const tc = themeColors[theme];
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebarCollapsed = useUiStore((s) => s.toggleSidebarCollapsed);
  const sidebarWidth = useUiStore((s) => s.sidebarWidth);
  const setSidebarWidth = useUiStore((s) => s.setSidebarWidth);
  const resetSidebarWidth = useUiStore((s) => s.resetSidebarWidth);
  const uiDensity = useUiStore((s) => s.uiDensity);
  const showSheetTabBar = useUiStore((s) => s.showSheetTabBar);
  const propertyCollapsed = useUiStore((s) => s.propertyPanelCollapsed);
  const togglePropertyPanelCollapsed = useUiStore(
    (s) => s.togglePropertyPanelCollapsed
  );
  const inspectorWidth = useUiStore((s) => s.inspectorWidth);
  const setInspectorWidth = useUiStore((s) => s.setInspectorWidth);
  const resetInspectorWidth = useUiStore((s) => s.resetInspectorWidth);
  const setSidebarCollapsed = useUiStore((s) => s.setSidebarCollapsed);
  const setPropertyPanelCollapsed = useUiStore(
    (s) => s.setPropertyPanelCollapsed
  );

  const sidebarPanelWidth = sidebarCollapsed ? PALETTE_RAIL_WIDTH : sidebarWidth;

  const handleSidebarResize = (deltaPx: number) => {
    if (sidebarCollapsed) {
      setSidebarCollapsed(false);
      setSidebarWidth(Math.max(SIDEBAR_RAIL_SNAP_THRESHOLD, PALETTE_RAIL_WIDTH + deltaPx));
      return;
    }
    const next = sidebarWidth + deltaPx;
    if (next < SIDEBAR_RAIL_SNAP_THRESHOLD) {
      setSidebarCollapsed(true);
      return;
    }
    setSidebarWidth(next);
  };

  const handleInspectorResize = (deltaPx: number) => {
    if (propertyCollapsed) {
      setPropertyPanelCollapsed(false);
      setInspectorWidth(PANEL_WIDTH_LIMITS.inspector.min);
      return;
    }
    const next = inspectorWidth + deltaPx;
    if (next < PANEL_WIDTH_LIMITS.inspector.min - 24) {
      setPropertyPanelCollapsed(true);
      return;
    }
    setInspectorWidth(next);
  };
  const autosaveProject = useCircuitStore((s) => s.autosaveProject);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const projectDropActive = useProjectFileDrop();

  useGlobalEditorShortcuts();
  useElectronMenuBridge();
  useProjectDocumentTitle();

  useEffect(() => {
    syncRecentMenuToNative();
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const hasAutosave = loadAutosave() != null;
        const hasSnapshots = await hasAnySnapshots();
        if (hasAutosave || hasSnapshots) setRestoreOpen(true);
      } catch {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      autosaveProject();
    }, 45000);
    const onBeforeUnload = () => {
      autosaveProject();
      const st = useCircuitStore.getState();
      void st.createProjectSnapshot('Session end');
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [autosaveProject]);

  return (
    <div
      className={`h-screen w-screen flex flex-col overflow-hidden ${tc.bg}`}
      data-theme={theme}
      data-density={uiDensity}
    >
      <WebInstallBanner />
      <AppErrorBoundary
        areaName="Menu bar"
        fallbackClassName={`w-full shrink-0 border-b border-amber-600/40 bg-amber-950/90 py-1 px-4 ${errPanel}`}
      >
        <AppMenuBar />
      </AppErrorBoundary>
      <AppErrorBoundary
        areaName="Toolbar"
        fallbackClassName={`w-full shrink-0 border-b border-amber-600/40 bg-amber-950/90 py-3 px-4 ${errPanel}`}
      >
        <Toolbar />
      </AppErrorBoundary>
      {showSheetTabBar ? (
        <AppErrorBoundary
          areaName="Sheet tabs"
          fallbackClassName={`w-full shrink-0 border-b border-amber-600/40 bg-amber-950/90 py-1 px-4 ${errPanel}`}
        >
          <SheetTabs />
        </AppErrorBoundary>
      ) : null}
      <div className="flex flex-1 overflow-hidden">
        <div
          className={cn(
            'h-full min-h-0 shrink-0 overflow-hidden border-r',
            MOTION_CLASS.panelCollapse,
            tc.border
          )}
          style={{ width: sidebarPanelWidth }}
        >
          <div className="h-full w-full min-w-0">
            <AppErrorBoundary
              areaName="Sidebar"
              fallbackClassName={`h-full min-h-0 w-full ${errPanel}`}
            >
              {sidebarCollapsed ? (
                <PaletteIconRail />
              ) : (
                <Suspense
                  fallback={
                    <div
                      className={`h-full min-h-0 w-full animate-pulse ${tc.panel}`}
                      aria-hidden
                    />
                  }
                >
                  <Sidebar />
                </Suspense>
              )}
            </AppErrorBoundary>
          </div>
        </div>
        <PanelSplitter
          side="left"
          ariaLabel={
            sidebarCollapsed
              ? 'Expand component palette'
              : 'Resize component palette'
          }
          ariaControls="sidebar-palette-root"
          ariaExpanded={!sidebarCollapsed}
          onResize={handleSidebarResize}
          onDoubleClick={resetSidebarWidth}
          onToggleCollapse={toggleSidebarCollapsed}
        />
        <AppErrorBoundary
          areaName="Canvas"
          fallbackClassName={`flex min-h-0 min-w-0 flex-1 ${errPanel}`}
        >
          <CircuitCanvas />
        </AppErrorBoundary>
        <PanelSplitter
          side="right"
          ariaLabel={
            propertyCollapsed ? 'Expand inspector panel' : 'Resize inspector panel'
          }
          ariaControls="inspector-panel-root"
          ariaExpanded={!propertyCollapsed}
          onResize={handleInspectorResize}
          onDoubleClick={resetInspectorWidth}
          onToggleCollapse={togglePropertyPanelCollapsed}
        />
        <div
          className={cn(
            'h-full min-h-0 shrink-0 overflow-hidden border-l',
            MOTION_CLASS.panelCollapse,
            propertyCollapsed ? 'w-0 border-transparent' : tc.border
          )}
          style={{ width: propertyCollapsed ? 0 : inspectorWidth }}
          aria-hidden={propertyCollapsed}
        >
          <div className="h-full w-full min-w-0">
            <AppErrorBoundary
              areaName="Inspector"
              fallbackClassName={`h-full min-h-0 w-full ${errPanel}`}
            >
              <Suspense
                fallback={
                  <div
                    className={`h-full min-h-0 w-full animate-pulse ${tc.panel}`}
                    aria-hidden
                  />
                }
              >
                <InspectorColumn />
              </Suspense>
            </AppErrorBoundary>
          </div>
        </div>
      </div>
      <AppErrorBoundary
        areaName="Status bar"
        fallbackClassName={`w-full shrink-0 border-t border-amber-600/40 bg-amber-950/90 py-2 px-4 ${errPanel}`}
      >
        <StatusBar />
      </AppErrorBoundary>
      <AppErrorBoundary
        areaName="Fault dialog"
        fallbackClassName={`fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 ${errPanel} border-0`}
      >
        <FaultDialog />
      </AppErrorBoundary>
      <CommandPalette />
      <ShortcutSettingsDialog />
      <PrivacySettingsDialog />
      <ProjectSettingsDialog />
      <LibraryPackBrowserDialog />
      <TutorialPanel />
      <ChallengePanel />
      <AssignmentPanel />
      <GradeSubmissionsDialog />
      <RestoreSessionDialog
        open={restoreOpen}
        onClose={() => setRestoreOpen(false)}
      />
      <ProjectDropOverlay active={projectDropActive} />
      <ContinuityBuzzer />
      <TripSound />
    </div>
  );
}

export default App;
