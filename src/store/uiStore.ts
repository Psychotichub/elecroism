import { create } from 'zustand';
import type Konva from 'konva';
import type { ComponentType } from '../types';
import { getGuidedTutorial } from '../utils/guidedTutorials';
import type { AssignmentSession } from '../types/assignment';
import type { QuizGradeResult } from '../utils/quizGrading';
import type { MotorThermalReading } from '../simulation/motorThermal';
import type { SnapshotSheetVisualDiff } from '../utils/projectSnapshotDiff';
import {
  clampPanelWidth,
  PANEL_DEFAULT_WIDTH,
} from '../constants/panelLayout';

const LEARNING_KEY = 'electroism.learningMode.v1';
const INTEGRITY_OVERLAY_KEY = 'electroism.connectionIntegrityOverlay.v1';
const ARC_FLASH_BADGES_KEY = 'electroism.arcFlashBadges.v1';
const SIDEBAR_COLLAPSED_KEY = 'electroism.sidebar.collapsed.v1';
const PROPERTY_PANEL_COLLAPSED_KEY = 'electroism.propertyPanel.collapsed.v1';
const SLD_VIEW_KEY = 'electroism.sldViewMode.v1';
const UI_DENSITY_KEY = 'electroism.uiDensity.v1';
const SHEET_TAB_BAR_KEY = 'electroism.sheetTabBar.visible.v1';
const SIDEBAR_WIDTH_KEY = 'electroism.sidebar.width.v1';
const INSPECTOR_WIDTH_KEY = 'electroism.inspector.width.v1';

export type UiDensity = 'default' | 'comfortable';

function loadUiDensity(): UiDensity {
  if (typeof window === 'undefined') return 'default';
  try {
    return window.localStorage.getItem(UI_DENSITY_KEY) === 'comfortable'
      ? 'comfortable'
      : 'default';
  } catch {
    return 'default';
  }
}

function saveUiDensity(density: UiDensity): void {
  try {
    window.localStorage.setItem(UI_DENSITY_KEY, density);
  } catch {
    // ignore
  }
}
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

function loadPanelWidth(key: string, fallback: number): number {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

function savePanelWidth(key: string, value: number): void {
  try {
    window.localStorage.setItem(key, String(value));
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
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
  resetSidebarWidth: () => void;
  paletteCategoryFilter: string | null;
  setPaletteCategoryFilter: (name: string | null) => void;
  propertyPanelCollapsed: boolean;
  setPropertyPanelCollapsed: (collapsed: boolean) => void;
  togglePropertyPanelCollapsed: () => void;
  inspectorWidth: number;
  setInspectorWidth: (width: number) => void;
  resetInspectorWidth: () => void;
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
  activeAssignment: AssignmentSession | null;
  assignmentStudentName: string;
  assignmentStudentId: string;
  assignmentFreeText: string;
  assignmentSubmitted: boolean;
  gradeSubmissionsOpen: boolean;
  startAssignment: (session: AssignmentSession) => void;
  exitAssignment: () => void;
  setAssignmentStudentName: (name: string) => void;
  setAssignmentStudentId: (id: string) => void;
  setAssignmentFreeText: (text: string) => void;
  markAssignmentSubmitted: () => void;
  setGradeSubmissionsOpen: (open: boolean) => void;
  /** Latest motor thermal % from oscilloscope cursor (per motor id). */
  motorThermalById: Record<string, MotorThermalReading>;
  setMotorThermalById: (readings: Record<string, MotorThermalReading>) => void;
  /** Canvas overlay for snapshot revision compare on the active sheet. */
  snapshotDiffOverlay: SnapshotSheetVisualDiff | null;
  setSnapshotDiffOverlay: (overlay: SnapshotSheetVisualDiff | null) => void;
  /** Simplified single-line diagram view (non-destructive display mode). */
  sldViewMode: boolean;
  setSldViewMode: (on: boolean) => void;
  toggleSldViewMode: () => void;
  projectSettingsOpen: boolean;
  setProjectSettingsOpen: (open: boolean) => void;
  /** Click canvas to drop a review comment pin. */
  reviewCommentPlacementMode: boolean;
  setReviewCommentPlacementMode: (on: boolean) => void;
  toggleReviewCommentPlacementMode: () => void;
  activeReviewCommentId: string | null;
  setActiveReviewCommentId: (id: string | null) => void;
  pendingReviewCommentBody: string | null;
  pendingReviewCommentAuthor: string | null;
  setPendingReviewComment: (
    body: string | null,
    author?: string | null
  ) => void;
  libraryPackBrowserOpen: boolean;
  setLibraryPackBrowserOpen: (open: boolean) => void;
  /** Validation issue highlighted on the canvas after a panel click. */
  validationFocusIssueId: string | null;
  setValidationFocusIssueId: (id: string | null) => void;
  uiDensity: UiDensity;
  setUiDensity: (density: UiDensity) => void;
  showSheetTabBar: boolean;
  setShowSheetTabBar: (on: boolean) => void;
  toggleShowSheetTabBar: () => void;
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
  sidebarWidth: clampPanelWidth(
    loadPanelWidth(SIDEBAR_WIDTH_KEY, PANEL_DEFAULT_WIDTH.sidebar),
    'sidebar'
  ),
  setSidebarWidth: (width) => {
    const next = clampPanelWidth(width, 'sidebar');
    savePanelWidth(SIDEBAR_WIDTH_KEY, next);
    set({ sidebarWidth: next });
  },
  resetSidebarWidth: () => {
    savePanelWidth(SIDEBAR_WIDTH_KEY, PANEL_DEFAULT_WIDTH.sidebar);
    set({
      sidebarWidth: PANEL_DEFAULT_WIDTH.sidebar,
      sidebarCollapsed: false,
    });
    saveBool(SIDEBAR_COLLAPSED_KEY, false);
  },
  paletteCategoryFilter: null,
  setPaletteCategoryFilter: (name) => set({ paletteCategoryFilter: name }),
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
  inspectorWidth: clampPanelWidth(
    loadPanelWidth(INSPECTOR_WIDTH_KEY, PANEL_DEFAULT_WIDTH.inspector),
    'inspector'
  ),
  setInspectorWidth: (width) => {
    const next = clampPanelWidth(width, 'inspector');
    savePanelWidth(INSPECTOR_WIDTH_KEY, next);
    set({ inspectorWidth: next });
  },
  resetInspectorWidth: () => {
    savePanelWidth(INSPECTOR_WIDTH_KEY, PANEL_DEFAULT_WIDTH.inspector);
    set({
      inspectorWidth: PANEL_DEFAULT_WIDTH.inspector,
      propertyPanelCollapsed: false,
    });
    saveBool(PROPERTY_PANEL_COLLAPSED_KEY, false);
  },
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
  activeAssignment: null,
  assignmentStudentName: '',
  assignmentStudentId: '',
  assignmentFreeText: '',
  assignmentSubmitted: false,
  gradeSubmissionsOpen: false,
  startAssignment: (session) =>
    set({
      activeAssignment: session,
      activeChallengeId: null,
      activeTutorialId: null,
      tutorialStepIndex: 0,
      challengeSelectedOption: null,
      challengeFreeText: '',
      challengeSubmitted: false,
      challengeGrade: null,
      assignmentStudentName: '',
      assignmentStudentId: '',
      assignmentFreeText: '',
      assignmentSubmitted: false,
      canvasStatusMessage: `Assignment: ${session.title}`,
    }),
  exitAssignment: () =>
    set({
      activeAssignment: null,
      assignmentStudentName: '',
      assignmentStudentId: '',
      assignmentFreeText: '',
      assignmentSubmitted: false,
      canvasStatusMessage: '',
    }),
  setAssignmentStudentName: (name) => set({ assignmentStudentName: name }),
  setAssignmentStudentId: (id) => set({ assignmentStudentId: id }),
  setAssignmentFreeText: (text) => set({ assignmentFreeText: text }),
  markAssignmentSubmitted: () => set({ assignmentSubmitted: true }),
  setGradeSubmissionsOpen: (open) => set({ gradeSubmissionsOpen: open }),
  motorThermalById: {},
  setMotorThermalById: (readings) => set({ motorThermalById: readings }),
  snapshotDiffOverlay: null,
  setSnapshotDiffOverlay: (overlay) => set({ snapshotDiffOverlay: overlay }),
  sldViewMode: loadBool(SLD_VIEW_KEY, false),
  setSldViewMode: (on) => {
    saveBool(SLD_VIEW_KEY, on);
    set({ sldViewMode: on });
  },
  toggleSldViewMode: () =>
    set((s) => {
      const next = !s.sldViewMode;
      saveBool(SLD_VIEW_KEY, next);
      return { sldViewMode: next };
    }),
  projectSettingsOpen: false,
  setProjectSettingsOpen: (open) => set({ projectSettingsOpen: open }),
  reviewCommentPlacementMode: false,
  setReviewCommentPlacementMode: (on) =>
    set({ reviewCommentPlacementMode: on }),
  toggleReviewCommentPlacementMode: () =>
    set((s) => ({ reviewCommentPlacementMode: !s.reviewCommentPlacementMode })),
  activeReviewCommentId: null,
  setActiveReviewCommentId: (id) => set({ activeReviewCommentId: id }),
  pendingReviewCommentBody: null,
  pendingReviewCommentAuthor: null,
  setPendingReviewComment: (body, author = null) =>
    set({
      pendingReviewCommentBody: body,
      pendingReviewCommentAuthor: author,
    }),
  libraryPackBrowserOpen: false,
  setLibraryPackBrowserOpen: (open) => set({ libraryPackBrowserOpen: open }),
  validationFocusIssueId: null,
  setValidationFocusIssueId: (id) => set({ validationFocusIssueId: id }),
  uiDensity: loadUiDensity(),
  setUiDensity: (density: UiDensity) => {
    saveUiDensity(density);
    set({ uiDensity: density });
  },
  showSheetTabBar: loadBool(SHEET_TAB_BAR_KEY, true),
  setShowSheetTabBar: (on) => {
    saveBool(SHEET_TAB_BAR_KEY, on);
    set({ showSheetTabBar: on });
  },
  toggleShowSheetTabBar: () =>
    set((s) => {
      const next = !s.showSheetTabBar;
      saveBool(SHEET_TAB_BAR_KEY, next);
      return { showSheetTabBar: next };
    }),
}));
