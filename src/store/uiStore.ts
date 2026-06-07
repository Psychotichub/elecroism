import { create } from 'zustand';
import type Konva from 'konva';
import type { ComponentType } from '../types';
import { getGuidedTutorial } from '../utils/guidedTutorials';
import type { QuizGradeResult } from '../utils/quizGrading';
import type { MotorThermalReading } from '../simulation/motorThermal';

const LEARNING_KEY = 'electroism.learningMode.v1';
const INTEGRITY_OVERLAY_KEY = 'electroism.connectionIntegrityOverlay.v1';
const ARC_FLASH_BADGES_KEY = 'electroism.arcFlashBadges.v1';
const SIDEBAR_COLLAPSED_KEY = 'electroism.sidebar.collapsed.v1';
const PROPERTY_PANEL_COLLAPSED_KEY = 'electroism.propertyPanel.collapsed.v1';
function loadBool(key: string, defaultValue: boolean): boolean {
  if (typeof window === 'undefined') return defaultValue;
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return defaultValue;
  }
}

function saveBool(key: string, value: boolean): void {
  try {
    window.localStorage.setItem(key, value ? '1' : '0');
  } catch {
    // ignore
  }
}

function loadLearningMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(LEARNING_KEY) === '1';
  } catch {
    return false;
  }
}

function loadConnectionIntegrityOverlay(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(INTEGRITY_OVERLAY_KEY) === '1';
  } catch {
    return false;
  }
}

function loadArcFlashBadges(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const v = window.localStorage.getItem(ARC_FLASH_BADGES_KEY);
    return v !== '0';
  } catch {
    return true;
  }
}

interface UiStore {
  learningMode: boolean;
  setLearningMode: (on: boolean) => void;
  toggleLearningMode: () => void;
  connectionIntegrityOverlay: boolean;
  setConnectionIntegrityOverlay: (on: boolean) => void;
  toggleConnectionIntegrityOverlay: () => void;
  arcFlashBadges: boolean;
  setArcFlashBadges: (on: boolean) => void;
  toggleArcFlashBadges: () => void;
  commandPaletteOpen: boolean;
  commandPaletteSession: number;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  /** Konva stage registered by CircuitCanvas for raster/PDF export. */
  konvaStage: Konva.Stage | null;
  setKonvaStage: (stage: Konva.Stage | null) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
  propertyPanelCollapsed: boolean;
  setPropertyPanelCollapsed: (collapsed: boolean) => void;
  togglePropertyPanelCollapsed: () => void;
  /** Keyboard or palette-initiated component placement on the canvas. */
  pendingInsertType: ComponentType | null;
  setPendingInsertType: (type: ComponentType | null) => void;
  canvasStatusMessage: string;
  setCanvasStatusMessage: (message: string) => void;
  activeTutorialId: string | null;
  tutorialStepIndex: number;
  startTutorial: (tutorialId: string) => void;
  exitTutorial: () => void;
  setTutorialStepIndex: (index: number) => void;
  advanceTutorialStep: () => void;
  retreatTutorialStep: () => void;
  activeChallengeId: string | null;
  challengeSelectedOption: string | null;
  challengeFreeText: string;
  challengeSubmitted: boolean;
  challengeGrade: QuizGradeResult | null;
  startChallenge: (challengeId: string) => void;
  exitChallenge: () => void;
  setChallengeSelectedOption: (option: string | null) => void;
  setChallengeFreeText: (text: string) => void;
  setChallengeGrade: (grade: QuizGradeResult | null) => void;
  markChallengeSubmitted: () => void;
  /** Latest motor thermal % from oscilloscope cursor (per motor id). */
  motorThermalById: Record<string, MotorThermalReading>;
  setMotorThermalById: (readings: Record<string, MotorThermalReading>) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  learningMode: loadLearningMode(),
  setLearningMode: (on) => {
    try {
      window.localStorage.setItem(LEARNING_KEY, on ? '1' : '0');
    } catch {
      // ignore
    }
    set({ learningMode: on });
  },
  toggleLearningMode: () =>
    set((s) => {
      const next = !s.learningMode;
      try {
        window.localStorage.setItem(LEARNING_KEY, next ? '1' : '0');
      } catch {
        // ignore
      }
      return { learningMode: next };
    }),
  connectionIntegrityOverlay: loadConnectionIntegrityOverlay(),
  setConnectionIntegrityOverlay: (on) => {
    try {
      window.localStorage.setItem(INTEGRITY_OVERLAY_KEY, on ? '1' : '0');
    } catch {
      // ignore
    }
    set({ connectionIntegrityOverlay: on });
  },
  toggleConnectionIntegrityOverlay: () =>
    set((s) => {
      const next = !s.connectionIntegrityOverlay;
      try {
        window.localStorage.setItem(INTEGRITY_OVERLAY_KEY, next ? '1' : '0');
      } catch {
        // ignore
      }
      return { connectionIntegrityOverlay: next };
    }),
  arcFlashBadges: loadArcFlashBadges(),
  setArcFlashBadges: (on) => {
    try {
      window.localStorage.setItem(ARC_FLASH_BADGES_KEY, on ? '1' : '0');
    } catch {
      // ignore
    }
    set({ arcFlashBadges: on });
  },
  toggleArcFlashBadges: () =>
    set((s) => {
      const next = !s.arcFlashBadges;
      try {
        window.localStorage.setItem(ARC_FLASH_BADGES_KEY, next ? '1' : '0');
      } catch {
        // ignore
      }
      return { arcFlashBadges: next };
    }),
  commandPaletteOpen: false,
  commandPaletteSession: 0,
  setCommandPaletteOpen: (open) =>
    set((s) => ({
      commandPaletteOpen: open,
      commandPaletteSession: open ? s.commandPaletteSession + 1 : s.commandPaletteSession,
    })),
  toggleCommandPalette: () =>
    set((s) => ({
      commandPaletteOpen: !s.commandPaletteOpen,
      commandPaletteSession: !s.commandPaletteOpen
        ? s.commandPaletteSession + 1
        : s.commandPaletteSession,
    })),
  konvaStage: null,
  setKonvaStage: (stage) => set({ konvaStage: stage }),
  sidebarCollapsed: loadBool(SIDEBAR_COLLAPSED_KEY, false),
  setSidebarCollapsed: (collapsed) => {
    saveBool(SIDEBAR_COLLAPSED_KEY, collapsed);
    set({ sidebarCollapsed: collapsed });
  },
  toggleSidebarCollapsed: () =>
    set((s) => {
      const next = !s.sidebarCollapsed;
      saveBool(SIDEBAR_COLLAPSED_KEY, next);
      return { sidebarCollapsed: next };
    }),
  propertyPanelCollapsed: loadBool(PROPERTY_PANEL_COLLAPSED_KEY, false),
  setPropertyPanelCollapsed: (collapsed) => {
    saveBool(PROPERTY_PANEL_COLLAPSED_KEY, collapsed);
    set({ propertyPanelCollapsed: collapsed });
  },
  togglePropertyPanelCollapsed: () =>
    set((s) => {
      const next = !s.propertyPanelCollapsed;
      saveBool(PROPERTY_PANEL_COLLAPSED_KEY, next);
      return { propertyPanelCollapsed: next };
    }),
  pendingInsertType: null,
  setPendingInsertType: (type) =>
    set({
      pendingInsertType: type,
      canvasStatusMessage: type
        ? `Placement mode: ${type}. Click the canvas to place, Escape to cancel.`
        : '',
    }),
  canvasStatusMessage: '',
  setCanvasStatusMessage: (message) => set({ canvasStatusMessage: message }),
  activeTutorialId: null,
  tutorialStepIndex: 0,
  startTutorial: (tutorialId) => {
    const tutorial = getGuidedTutorial(tutorialId);
    if (!tutorial) return;
    set({
      activeTutorialId: tutorialId,
      tutorialStepIndex: 0,
      canvasStatusMessage: `Tutorial started: ${tutorial.title}`,
    });
  },
  exitTutorial: () =>
    set({
      activeTutorialId: null,
      tutorialStepIndex: 0,
      canvasStatusMessage: '',
    }),
  setTutorialStepIndex: (index) => set({ tutorialStepIndex: Math.max(0, index) }),
  advanceTutorialStep: () =>
    set((s) => {
      const tutorial = s.activeTutorialId
        ? getGuidedTutorial(s.activeTutorialId)
        : undefined;
      if (!tutorial) return s;
      const next = Math.min(s.tutorialStepIndex + 1, tutorial.steps.length - 1);
      return { tutorialStepIndex: next };
    }),
  retreatTutorialStep: () =>
    set((s) => ({ tutorialStepIndex: Math.max(0, s.tutorialStepIndex - 1) })),
  activeChallengeId: null,
  challengeSelectedOption: null,
  challengeFreeText: '',
  challengeSubmitted: false,
  challengeGrade: null,
  startChallenge: (challengeId) =>
    set({
      activeChallengeId: challengeId,
      activeTutorialId: null,
      tutorialStepIndex: 0,
      challengeSelectedOption: null,
      challengeFreeText: '',
      challengeSubmitted: false,
      challengeGrade: null,
      canvasStatusMessage: 'Challenge loaded — diagnose the fault.',
    }),
  exitChallenge: () =>
    set({
      activeChallengeId: null,
      challengeSelectedOption: null,
      challengeFreeText: '',
      challengeSubmitted: false,
      challengeGrade: null,
      canvasStatusMessage: '',
    }),
  setChallengeSelectedOption: (option) =>
    set({ challengeSelectedOption: option }),
  setChallengeFreeText: (text) => set({ challengeFreeText: text }),
  setChallengeGrade: (grade) => set({ challengeGrade: grade }),
  markChallengeSubmitted: () => set({ challengeSubmitted: true }),
  motorThermalById: {},
  setMotorThermalById: (readings) => set({ motorThermalById: readings }),
}));
