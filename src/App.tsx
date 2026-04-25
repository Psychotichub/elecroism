import Toolbar from './components/Toolbar/Toolbar';
import Sidebar from './components/Panels/Sidebar';
import CircuitCanvas from './components/Canvas/CircuitCanvas';
import PropertyPanel from './components/Panels/PropertyPanel';
import StatusBar from './components/Panels/StatusBar';
import FaultDialog from './components/Dialogs/FaultDialog';
import { useThemeStore } from './store/themeStore';

function App() {
  const theme = useThemeStore((s) => s.theme);

  return (
    <div
      className={`h-screen w-screen flex flex-col overflow-hidden ${
        theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'
      }`}
      data-theme={theme}
    >
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <CircuitCanvas />
        <PropertyPanel />
      </div>
      <StatusBar />
      <FaultDialog />
    </div>
  );
}

export default App;
