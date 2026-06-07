import { lazy, Suspense, useEffect, useState } from 'react';
import AppMenuBar from './components/Toolbar/AppMenuBar';
import Toolbar from './components/Toolbar/Toolbar';
import { useGlobalEditorShortcuts } from './hooks/useGlobalEditorShortcuts';
const Sidebar = lazy(() => import('./components/Panels/Sidebar'));
const CircuitCanvas = lazy(() => import('./components/Canvas/CircuitCanvas'));
const InspectorColumn = lazy(() => import('./components/Panels/InspectorColumn'));
import StatusBar from './components/Panels/StatusBar';
import FaultDialog from './components/Dialogs/FaultDialog';
import CommandPalette from './components/Dialogs/CommandPalette';
import TutorialPanel from './components/Panels/TutorialPanel';
import ChallengePanel from './components/Panels/ChallengePanel';
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

const errPanel =
  'flex flex-col items-center justify-center gap-3 border border-amber-600/40 bg-amber-950/90 p-4 text-center text-amber-50';

function App() {
  const theme = useThemeStore((s) => s.theme);
  const tc = themeColors[theme];
  const setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebarCollapsed = useUiStore((s) => s.toggleSidebarCollapsed);
  const propertyCollapsed = useUiStore((s) => s.propertyPanelCollapsed);
  const togglePropertyPanelCollapsed = useUiStore(
    (s) => s.togglePropertyPanelCollapsed
  );
  const autosaveProject = useCircuitStore((s) => s.autosaveProject);
  const [restoreOpen, setRestoreOpen] = useState(false);

  useGlobalEditorShortcuts();

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

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setCommandPaletteOpen]);

  return (
    <div
      className={`h-screen w-screen flex flex-col overflow-hidden ${tc.bg}`}
      data-theme={theme}
    >
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
      <AppErrorBoundary
        areaName="Sheet tabs"
        fallbackClassName={`w-full shrink-0 border-b border-amber-600/40 bg-amber-950/90 py-1 px-4 ${errPanel}`}
      >
        <SheetTabs />
      </AppErrorBoundary>
      <div className="flex flex-1 overflow-hidden">
        {!sidebarCollapsed && (
          <AppErrorBoundary
            areaName="Sidebar"
            fallbackClassName={`h-full min-h-0 w-56 shrink-0 ${errPanel}`}
          >
            <Suspense
              fallback={
                <div
                  className={`h-full min-h-0 w-56 shrink-0 animate-pulse ${tc.panel} border-r ${tc.border}`}
                  aria-hidden
                />
              }
            >
              <Sidebar />
            </Suspense>
          </AppErrorBoundary>
        )}
        <button
          type="button"
          aria-label={
            sidebarCollapsed ? 'Expand component palette' : 'Collapse component palette'
          }
          aria-expanded={!sidebarCollapsed}
          aria-controls="sidebar-palette-root"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={toggleSidebarCollapsed}
          className={`w-5 border-r ${tc.border} ${tc.panel} ${tc.textMuted} hover:${tc.text} text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}
        >
          {sidebarCollapsed ? '>' : '<'}
        </button>
        <AppErrorBoundary
          areaName="Canvas"
          fallbackClassName={`flex min-h-0 min-w-0 flex-1 ${errPanel}`}
        >
          <CircuitCanvas />
        </AppErrorBoundary>
        <button
          type="button"
          aria-label={
            propertyCollapsed ? 'Expand inspector panel' : 'Collapse inspector panel'
          }
          aria-expanded={!propertyCollapsed}
          aria-controls="inspector-panel-root"
          title={propertyCollapsed ? 'Expand properties' : 'Collapse properties'}
          onClick={togglePropertyPanelCollapsed}
          className={`w-5 border-l ${tc.border} ${tc.panel} ${tc.textMuted} hover:${tc.text} text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}
        >
          {propertyCollapsed ? '<' : '>'}
        </button>
        {!propertyCollapsed && (
          <AppErrorBoundary
            areaName="Inspector"
            fallbackClassName={`h-full min-h-0 w-80 shrink-0 ${errPanel}`}
          >
            <Suspense
              fallback={
                <div
                  className={`h-full min-h-0 w-80 shrink-0 animate-pulse ${tc.panel} border-l ${tc.border}`}
                  aria-hidden
                />
              }
            >
              <InspectorColumn />
            </Suspense>
          </AppErrorBoundary>
        )}
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
      <TutorialPanel />
      <ChallengePanel />
      <RestoreSessionDialog
        open={restoreOpen}
        onClose={() => setRestoreOpen(false)}
      />
      <ContinuityBuzzer />
      <TripSound />
    </div>
  );
}

export default App;
