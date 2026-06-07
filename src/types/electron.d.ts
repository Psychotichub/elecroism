export type UpdatePhase =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error';

export interface UpdateStatus {
  phase: UpdatePhase;
  version?: string;
  percent?: number;
  transferred?: number;
  total?: number;
  message?: string;
}

export type OpenProjectDialogResult = {
  ok: boolean;
  error?: string;
  filePath?: string;
  text?: string;
};

export type RecentMenuItem = {
  index: number;
  label: string;
};

export interface ElectronAPI {
  platform: NodeJS.Platform;
  isPackaged: boolean;
  versions: {
    app: string;
    electron: string;
    chrome: string;
  };
  onUpdateStatus: (callback: (status: UpdateStatus) => void) => () => void;
  installUpdate: () => Promise<void>;
  onMenuAction: (callback: (actionId: string) => void) => () => void;
  onOpenProjectPath: (callback: (filePath: string) => void) => () => void;
  showAbout: () => Promise<void>;
  checkForUpdates: () => Promise<void>;
  readProjectFile: (filePath: string) => Promise<string | null>;
  showOpenProjectDialog: () => Promise<OpenProjectDialogResult>;
  syncRecentMenu: (items: RecentMenuItem[]) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
