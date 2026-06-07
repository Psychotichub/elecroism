import { useEffect } from 'react';
import { executeMenuAction } from '../menu/executeMenuAction';
import {
  isProjectFileName,
  openProjectFromText,
  openRecentProject,
} from '../utils/projectOpen';
import { listRecentProjects } from '../utils/projectPersistence';

/** Forward native Electron menu actions to the shared renderer dispatcher. */
export function useElectronMenuBridge(): void {
  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;

    const unsubMenu = api.onMenuAction?.((actionId) => {
      const recentMatch = /^open-recent-(\d+)$/.exec(actionId);
      if (recentMatch) {
        const index = Number(recentMatch[1]);
        const entry = listRecentProjects()[index];
        if (!entry) return;
        void openRecentProject(entry).then((result) => {
          if (!result.ok) window.alert(result.error ?? 'Could not open project.');
        });
        return;
      }
      void executeMenuAction(actionId);
    });

    const unsubPath = api.onOpenProjectPath?.((filePath) => {
      if (!isProjectFileName(filePath)) return;
      void api.readProjectFile?.(filePath).then((text) => {
        if (!text) {
          window.alert('Could not read project file.');
          return;
        }
        const name = filePath.split(/[/\\]/).pop();
        const result = openProjectFromText(text, {
          displayName: name,
          filePath,
        });
        if (!result.ok) window.alert(result.error ?? 'Could not open file.');
      });
    });

    return () => {
      unsubMenu?.();
      unsubPath?.();
    };
  }, []);
}
