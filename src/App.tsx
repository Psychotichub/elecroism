import { useEffect, useState } from 'react';
import Toolbar from './components/Toolbar/Toolbar';
import Sidebar from './components/Panels/Sidebar';
import CircuitCanvas from './components/Canvas/CircuitCanvas';
import PropertyPanel from './components/Panels/PropertyPanel';
import StatusBar from './components/Panels/StatusBar';
import FaultDialog from './components/Dialogs/FaultDialog';
import ContinuityBuzzer from './components/Audio/ContinuityBuzzer';
import { themeColors, useThemeStore } from './store/themeStore';

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
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        {!sidebarCollapsed && <Sidebar />}
        <button
          type="button"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => setSidebarCollapsed((s) => !s)}
          className={`w-5 border-r ${tc.border} ${tc.panel} ${tc.textMuted} hover:${tc.text} text-xs font-semibold transition-colors`}
        >
          {sidebarCollapsed ? '>' : '<'}
        </button>
        <CircuitCanvas />
        <button
          type="button"
          title={propertyCollapsed ? 'Expand properties' : 'Collapse properties'}
          onClick={() => setPropertyCollapsed((s) => !s)}
          className={`w-5 border-l ${tc.border} ${tc.panel} ${tc.textMuted} hover:${tc.text} text-xs font-semibold transition-colors`}
        >
          {propertyCollapsed ? '<' : '>'}
        </button>
        {!propertyCollapsed && <PropertyPanel />}
      </div>
      <StatusBar />
      <FaultDialog />
      <ContinuityBuzzer />
    </div>
  );
}

export default App;
