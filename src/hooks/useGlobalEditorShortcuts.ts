import { useEffect } from 'react';
import { useShortcutStore } from '../store/shortcutStore';
import { useCircuitStore } from '../store/circuitStore';
import { executeShortcutAction } from '../shortcuts/executeShortcutAction';
import {
  openProjectFromFile,
  openProjectFromText,
  PROJECT_FILE_ACCEPT,
} from '../utils/projectOpen';

export function openProjectFile(): void {
  const api = window.electronAPI;
  if (api?.showOpenProjectDialog) {
    void api.showOpenProjectDialog().then((result) => {
      if (!result?.ok) {
        if (result?.error) window.alert(result.error);
        return;
      }
      if (!result.text) return;
      const name = result.filePath?.split(/[/\\]/).pop();
      const opened = openProjectFromText(result.text, {
        displayName: name,
        filePath: result.filePath,
      });
      if (!opened.ok) window.alert(opened.error ?? 'Could not open file.');
    });
    return;
  }

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = PROJECT_FILE_ACCEPT;
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    void openProjectFromFile(file).then((result) => {
      if (!result.ok) window.alert(result.error ?? 'Could not open file.');
    });
  };
  input.click();
}

export function fitToScreen(): void {
  const { setZoom, setPan } = useCircuitStore.getState();
  setZoom(1);
  setPan(100, 50);
}

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

/** Global editor shortcuts driven by the customizable shortcut store. */
export function useGlobalEditorShortcuts(): void {
  const settingsOpen = useShortcutStore((s) => s.settingsOpen);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (settingsOpen) return;

      const shortcutStore = useShortcutStore.getState();
      const actionId = shortcutStore.findActionForEvent(e);

      if (actionId === 'toggle-wire-orientation') {
        const { tool, wireInProgress } = useCircuitStore.getState();
        if (tool !== 'wire' || !wireInProgress) return;
        e.preventDefault();
        void executeShortcutAction(actionId);
        return;
      }

      if (actionId === 'delete-selection') {
        const { wireInProgress } = useCircuitStore.getState();
        if (e.key === 'Backspace' && wireInProgress) return;
        e.preventDefault();
        void executeShortcutAction(actionId);
        return;
      }

      if (actionId) {
        e.preventDefault();
        void executeShortcutAction(actionId);
        return;
      }

      if (e.key === 'Backspace') {
        const { wireInProgress } = useCircuitStore.getState();
        if (!wireInProgress) {
          e.preventDefault();
          void executeShortcutAction('delete-selection');
          return;
        }
      }

      if (
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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settingsOpen]);
}
