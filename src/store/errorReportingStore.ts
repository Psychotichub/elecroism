import { create } from 'zustand';

const OPT_IN_KEY = 'electroism.errorReporting.optIn.v1';

function loadOptIn(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(OPT_IN_KEY) === '1';
  } catch {
    return false;
  }
}

function saveOptIn(enabled: boolean): void {
  try {
    window.localStorage.setItem(OPT_IN_KEY, enabled ? '1' : '0');
  } catch {
    // ignore
  }
}

interface ErrorReportingStore {
  optIn: boolean;
  settingsOpen: boolean;
  pendingCount: number;
  setOptIn: (enabled: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setPendingCount: (count: number) => void;
}

export const useErrorReportingStore = create<ErrorReportingStore>((set) => ({
  optIn: loadOptIn(),
  settingsOpen: false,
  pendingCount: 0,
  setOptIn: (enabled) => {
    saveOptIn(enabled);
    set({ optIn: enabled });
  },
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setPendingCount: (count) => set({ pendingCount: count }),
}));
