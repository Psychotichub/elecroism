export type LearningPanelPlacement = 'dock' | 'floating';

export type LearningPanelPrefs = {
  placement: LearningPanelPlacement;
  pinned: boolean;
};

const STORAGE_KEY = 'electroism.learningPanel.v1';

const DEFAULT_PREFS: LearningPanelPrefs = {
  placement: 'dock',
  pinned: true,
};

export function loadLearningPanelPrefs(): LearningPanelPrefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<LearningPanelPrefs>;
    return {
      placement: parsed.placement === 'floating' ? 'floating' : 'dock',
      pinned: parsed.pinned !== false,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function saveLearningPanelPrefs(prefs: LearningPanelPrefs): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}
