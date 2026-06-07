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
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
