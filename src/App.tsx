import { useEffect, useState } from 'react';
import Toolbar from './components/Toolbar/Toolbar';
import Sidebar from './components/Panels/Sidebar';
import CircuitCanvas from './components/Canvas/CircuitCanvas';
import InspectorColumn from './components/Panels/InspectorColumn';
import StatusBar from './components/Panels/StatusBar';
import FaultDialog from './components/Dialogs/FaultDialog';
import ContinuityBuzzer from './components/Audio/ContinuityBuzzer';
import TripSound from './components/Audio/TripSound';
import { AppErrorBoundary } from './components/ErrorBoundary/AppErrorBoundary';
import { themeColors, useThemeStore } from './store/themeStore';

const errPanel =
  'flex flex-col items-center justify-center gap-3 border border-amber-600/40 bg-amber-950/90 p-4 text-center text-amber-50';

const SIDEBAR_COLLAPSED_KEY = 'electroism.sidebar.collapsed.v1';
const PROPERTY_PANEL_COLLAPSED_KEY = 'electroism.propertyPanel.collapsed.v1';

function App() {
  const theme = useThemeStore((s) => s.theme);
  const tc = themeColors[theme];
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [propertyCollapsed, setPropertyCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem(PROPERTY_PANEL_COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(
        SIDEBAR_COLLAPSED_KEY,
        sidebarCollapsed ? '1' : '0'
      );
    } catch {
      // ignore storage errors
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        PROPERTY_PANEL_COLLAPSED_KEY,
        propertyCollapsed ? '1' : '0'
      );
    } catch {
      // ignore storage errors
    }
  }, [propertyCollapsed]);

  return (
    <div
      className={`h-screen w-screen flex flex-col overflow-hidden ${
        theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'
      }`}
      data-theme={theme}
    >
      <AppErrorBoundary
        areaName="Toolbar"
        fallbackClassName={`w-full shrink-0 border-b border-amber-600/40 bg-amber-950/90 py-3 px-4 ${errPanel}`}
      >
        <Toolbar />
      </AppErrorBoundary>
      <div className="flex flex-1 overflow-hidden">
        {!sidebarCollapsed && (
          <AppErrorBoundary
            areaName="Sidebar"
            fallbackClassName={`h-full min-h-0 w-56 shrink-0 ${errPanel}`}
          >
            <Sidebar />
          </AppErrorBoundary>
        )}
        <button
          type="button"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => setSidebarCollapsed((s) => !s)}
          className={`w-5 border-r ${tc.border} ${tc.panel} ${tc.textMuted} hover:${tc.text} text-xs font-semibold transition-colors`}
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
          title={propertyCollapsed ? 'Expand properties' : 'Collapse properties'}
          onClick={() => setPropertyCollapsed((s) => !s)}
          className={`w-5 border-l ${tc.border} ${tc.panel} ${tc.textMuted} hover:${tc.text} text-xs font-semibold transition-colors`}
        >
          {propertyCollapsed ? '<' : '>'}
        </button>
        {!propertyCollapsed && (
          <AppErrorBoundary
            areaName="Inspector"
            fallbackClassName={`h-full min-h-0 w-80 shrink-0 ${errPanel}`}
          >
            <InspectorColumn />
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
      <ContinuityBuzzer />
      <TripSound />
    </div>
  );
}

export default App;
