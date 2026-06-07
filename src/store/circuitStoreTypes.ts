import type {
  Circuit,
  CircuitComponent,
  Wire,
  SimulationResult,
  ToolMode,
  HistoryEntry,
  ComponentType,
  FaultEvent,
  PhaseSystem,
  BmsSimLogEntry,
  WireObjectSnapModes,
  WireColor,
  WireStyleLayer,
  DesignatorScheme,
  DrawingSheet,
  ComponentProperties,
} from '../types';
import type { ElectroProject, RecentProjectEntry } from '../types/project';
import type { ComponentMacro } from '../utils/componentMacros';
import type { AlignMode, DistributeMode } from '../utils/componentAlignment';
import type { SpatialRenumberOrder } from '../utils/designatorRules';
import type { ProjectSnapshotSummary } from '../utils/projectSnapshots';
import type { LibraryMergeMode } from '../utils/componentLibraryPack';
import type {
  ProjectTitleBlock,
  RevisionHistoryEntry,
} from '../types/project';
import type { CircuitValidationIssue } from '../utils/circuitDesignValidation';

export type DrawingMetadataPatch = {
  drawingProject?: string;
  drawingNumber?: string;
  drawingRevision?: string;
  drawnBy?: string;
  checkedBy?: string;
  name?: string;
};

/** Full Zustand store shape — shared by slices and `useCircuitStore`. */
export interface CircuitStore {
  project: ElectroProject;
  circuit: Circuit;
  /** Per-sheet fingerprints from the last explicit save (download). */
  sheetSaveBaselines: Record<string, string>;
  simulationResult: SimulationResult | null;
  /** True while a Web Worker simulation is in flight. */
  simulationPending: boolean;
  selectedId: string | null;
  /** Selected vertex on the selected wire (for Delete = remove bend). */
  wireGripVertexIndex: number | null;
  tool: ToolMode;
  wireInProgress: Partial<Wire> | null;
  wirePoints: number[];
  /** Axis the next leg of the in-progress wire will follow ('h' = horizontal,
   *  'v' = vertical). Seeded from the start terminal's outward direction so
   *  the first segment leaves the terminal perpendicular to the component;
   *  toggles after every committed leg so subsequent clicks alternate. */
  wireOrientation: 'h' | 'v';
  history: HistoryEntry[];
  historyIndex: number;
  faultDialogEvent: FaultEvent | null;
  /** Last BMS command attempts (simulator / audit). */
  bmsSimLog: BmsSimLogEntry[];
  clearBmsSimLog: () => void;
  clearBmsSimLogForDevice: (deviceId: string) => void;

  addComponent: (
    type: ComponentType,
    x: number,
    y: number,
    options?: {
      pushButtonVariant?: 'NO' | 'NC';
      mcbInitialPoles?: 1 | 2;
      initialScale?: number;
    }
  ) => void;
  setMcbPoleLayout: (id: string, poles: 1 | 2) => void;
  setPushButtonPressed: (id: string, pressed: boolean) => void;
  updateComponent: (
    id: string,
    updates: Partial<CircuitComponent>
  ) => void;
  setComponentPhaseSystem: (id: string, phase: PhaseSystem) => void;
  removeComponent: (id: string) => void;
  toggleComponent: (id: string) => void;
  resetTripped: (id: string) => void;
  /** BMS closing coil (CC) pulse — closes main contacts if interlocks OK */
  acbBmsClosePulse: (id: string) => void;
  /** BMS shunt trip — opens main contacts (remote OFF) */
  acbBmsShuntOpen: (id: string) => void;
  mccbBmsMotorClosePulse: (id: string) => void;
  mccbBmsShuntOpen: (id: string) => void;
  moveComponent: (id: string, x: number, y: number) => void;
  dragMoveSelection: (
    draggedId: string,
    initialPositions: Record<string, { x: number; y: number }>,
    totalDx: number,
    totalDy: number
  ) => void;
  rotateComponent: (id: string) => void;
  duplicateComponent: (id: string) => void;
  clipboard: { components: CircuitComponent[]; wires: Wire[] } | null;
  copySelection: () => void;
  cutSelection: () => void;
  pasteSelection: () => void;
  saveSelectionAsMacro: (name: string) => boolean;
  insertMacro: (macroId: string) => void;
  insertCircuitTemplate: (templateId: string) => void;
  listMacros: () => ComponentMacro[];
  alignSelection: (mode: AlignMode) => void;
  distributeSelection: (mode: DistributeMode) => void;
  nudgeSelection: (dx: number, dy: number) => void;
  /** Bus-drop: duplicate feeder template at canvas position from busbar tap wire. */
  dropFeederAtBusTap: (worldX: number, worldY: number) => boolean;
  /** Clone breaker→load branch on next busbar tap with new designators. */
  duplicateIdenticalFeeder: (breakerId?: string) => boolean;
  isBusDropWireActive: () => boolean;

  addWire: (wire: Omit<Wire, 'id'>) => void;
  updateWire: (id: string, updates: Partial<Wire>) => void;
  removeWire: (id: string) => void;
  /** Live polyline while dragging grips — no history/simulation. */
  setWirePointsLive: (wireId: string, points: number[]) => void;
  /** Finalize grip edit: endpoint reconnect/revert, grid snap, sync, history, sim. */
  commitWireGripEdit: (
    wireId: string,
    draggedVertexIndex: number | null
  ) => void;
  setWireGripVertexIndex: (index: number | null) => void;
  insertWireVertex: (
    wireId: string,
    segmentIndex: number,
    worldX: number,
    worldY: number
  ) => void;
  removeWireVertex: (wireId: string, vertexIndex: number) => void;
  moveWireSegment: (
    wireId: string,
    segmentIndex: number,
    deltaX: number,
    deltaY: number
  ) => void;
  /** Move one vertex to world (x,y) and commit (history + sync + sim). */
  moveWireVertex: (
    wireId: string,
    vertexIndex: number,
    x: number,
    y: number
  ) => void;
  startWire: (componentId: string, pointId: string) => void;
  addWirePoint: (x: number, y: number) => void;
  finishWire: (componentId: string, pointId: string) => void;
  /**
   * Complete the in-progress wire by tapping an existing wire segment (T junction):
   * split the span, insert a junction dot, and attach the branch.
   */
  finishWireOnWireSpan: (
    targetWireId: string,
    segmentIndex: number,
    worldX: number,
    worldY: number
  ) => void;
  cancelWire: () => void;
  /**
   * Remove last committed wire vertex while drawing (Backspace).
   * Keeps wire active if only the start point remains; flips `wireOrientation` back.
   */
  undoLastWirePoint: () => void;

  /** Object snap for wire tool (terminals, wire geometry). F3 / osnap. */
  wireObjectSnapEnabled: boolean;
  /** Grid snap while wiring (F9 / grid). */
  wireGridSnapEnabled: boolean;
  /** Orthogonal segments from last vertex (F8 / ortho). Off = free-angle segments. */
  wireOrthoEnabled: boolean;
  /** When on, terminal-to-terminal finish with no polyline uses auto Manhattan routing. */
  wireAutoRouteEnabled: boolean;
  toggleWireAutoRoute: () => void;
  setWireObjectSnapEnabled: (v: boolean) => void;
  setWireGridSnapEnabled: (v: boolean) => void;
  setWireOrthoEnabled: (v: boolean) => void;
  toggleWireObjectSnap: () => void;
  toggleWireGridSnap: () => void;
  toggleWireOrtho: () => void;
  /** Flip next wire leg axis without adding a vertex (Tab). */
  toggleWireOrientation: () => void;
  /** Per-mode object snap (connection / endpoint / midpoint / intersection). */
  wireSnapModes: WireObjectSnapModes;
  setWireSnapModes: (partial: Partial<WireObjectSnapModes>) => void;
  toggleWireSnapMode: (key: keyof WireObjectSnapModes) => void;
  resetWireSnapModes: () => void;

  /** Sticky stroke / category for the next wire (and live patch while drafting). */
  wireDraftDefaults: {
    color: WireColor | null;
    wireCategory: 'power' | 'control' | 'comm' | null;
    styleLayer: WireStyleLayer | null;
  };
  patchWireDraftStyle: (partial: {
    color?: WireColor | null;
    wireCategory?: 'power' | 'control' | 'comm' | null;
    styleLayer?: WireStyleLayer | null;
  }) => void;

  /** CAD-style wire edit: break = split at click; trim = two vertex grips; extend = click cutter segment. */
  wireCadEditMode: null | 'break' | 'trim' | 'extend';
  /** Which end to lengthen for `extend` (first or last bend toward a crossing). */
  wireCadExtendEnd: 'from' | 'to';
  wireTrimFirstVertexIndex: number | null;
  setWireCadEditMode: (mode: null | 'break' | 'trim' | 'extend') => void;
  setWireCadExtendEnd: (end: 'from' | 'to') => void;
  clearWireCadEditMode: () => void;
  setWireTrimFirstVertexIndex: (index: number | null) => void;

  breakWireAtSpan: (
    wireId: string,
    segmentIndex: number,
    worldX: number,
    worldY: number
  ) => string;
  simplifyWireCollinear: (wireId: string) => string;
  normalizeWireRoute: (wireId: string) => string;
  mergeWiresAtJunction: (junctionComponentId: string) => string;
  trimWireBetweenGrips: (
    wireId: string,
    vertexIndexA: number,
    vertexIndexB: number
  ) => string;
  extendWireToCutterHit: (cutterWireId: string, worldX: number, worldY: number) => string;

  setSelected: (
    id: string | null,
    options?: { clearWireGrip?: boolean }
  ) => void;
  setTool: (tool: ToolMode) => void;
  setZoom: (zoom: number) => void;
  /** Zoom to `zoom` while keeping the world point under (stageX, stageY) fixed; coords match Konva `getPointerPosition()`. */
  setZoomAroundStagePoint: (
    zoom: number,
    stageX: number,
    stageY: number
  ) => void;
  setPan: (x: number, y: number) => void;

  runSimulation: () => void;
  clearCircuit: () => void;
  loadCircuit: (circuit: Circuit) => void;
  /** Normalize and apply a circuit to the editor without changing the project wrapper. */
  hydrateCircuit: (circuit: Circuit) => void;
  saveCircuit: () => void;
  /** Download a CSV wire schedule (numbers, endpoints, tags, style). */
  exportWireScheduleCsv: () => void;
  /** Download a CSV bill of materials grouped by device type and rating. */
  exportBomCsv: () => void;
  /** Download a CSV terminal connection schedule (per-terminal in/out). */
  exportTerminalScheduleCsv: () => void;
  /** Download a CSV cable schedule with persisted wizard sizing per wire. */
  exportCableScheduleCsv: () => void;
  /** Download panel / MCC lineup schedule CSV. */
  exportPanelScheduleCsv: () => void;
  /** Download panel / MCC lineup schedule PDF. Returns error message or null. */
  exportPanelSchedulePdf: () => string | null;
  addReviewCommentAtPoint: (
    worldX: number,
    worldY: number,
    body: string,
    author?: string
  ) => string | null;
  addReviewCommentOnComponent: (
    componentId: string,
    body: string,
    author?: string
  ) => string | null;
  addReviewCommentReply: (
    threadId: string,
    body: string,
    author?: string
  ) => boolean;
  resolveReviewCommentThread: (threadId: string) => void;
  reopenReviewCommentThread: (threadId: string) => void;
  deleteReviewCommentThread: (threadId: string) => void;
  exportReviewCommentsPdf: () => string | null;
  exportReviewCommentsJson: () => string | null;
  /** Export schematic PDF with title block (multi-sheet when configured). */
  exportDrawingPdf: () => Promise<string | null>;
  /** Zip documentation pack: PDFs, schedules, README manifest. */
  exportDocumentationPack: () => Promise<string | null>;
  /** Export single-line diagram PDF (temporarily enables SLD view for capture). */
  exportSldPdf: () => Promise<string | null>;

  undo: () => void;
  redo: () => void;
  pushHistory: (description: string) => void;

  dismissFault: () => void;

  setPhaseImbalanceWarningPercent: (percent: number) => void;

  setContinuityPowerThresholdW: (watts: number) => void;

  setDesignatorScheme: (scheme: DesignatorScheme) => void;
  setDesignatorLocation: (location: string) => void;
  bulkRenumberDesignators: (order: SpatialRenumberOrder) => void;
  applyDesignatorScheme: () => void;

  selectComponents: (ids: string[]) => void;
  focusComponents: (ids: string[]) => boolean;
  focusValidationIssue: (issue: CircuitValidationIssue) => boolean;
  frameViewport: (
    bounds: import('../utils/drawingBounds').WorldBounds
  ) => boolean;
  jumpToLabel: (labelQuery: string) => boolean;
  selectAllOfType: (typeQuery: string) => boolean;
  selectUnwiredComponents: () => boolean;
  selectFaultedComponents: () => boolean;

  setWirePointsLiveBatch: (
    updates: { wireId: string; points: number[] }[]
  ) => void;
  commitWireSegmentBundle: (wireIds: string[]) => void;
  bundleParallelWires: (wireId?: string) => boolean;
  autoRerouteWire: (wireId?: string) => string;

  setCircuitWireLabelsVisible: (visible: boolean) => void;

  setDrawingMetadata: (patch: DrawingMetadataPatch) => void;
  addDrawingSheet: (partial?: Partial<DrawingSheet>) => void;
  addDrawingSheetFromSelection: () => boolean;
  updateDrawingSheet: (id: string, patch: Partial<DrawingSheet>) => void;
  removeDrawingSheet: (id: string) => void;

  commitActiveSheet: () => ElectroProject;
  switchProjectSheet: (sheetId: string) => boolean;
  navigateCrossSheetRef: (raw: string) => boolean;
  addProjectSheet: (name?: string) => string | undefined;
  duplicateProjectSheet: (sheetId: string) => string | null;
  renameProjectSheet: (sheetId: string, name: string) => void;
  removeProjectSheet: (sheetId: string) => boolean;
  setProjectName: (name: string) => void;
  setProjectTitleBlock: (patch: Partial<ProjectTitleBlock>) => void;
  addRevisionHistoryEntry: (entry: RevisionHistoryEntry) => void;
  newProject: (name?: string) => void;
  newProjectFromOrganizationTemplate: (templateId: string) => Promise<string | null>;
  loadOrganizationTemplateFile: (data: unknown) => string | null;
  loadProject: (project: ElectroProject, recentMeta?: import('../types/project').RecentProjectMeta) => void;
  loadProjectFromDocument: (
    data: unknown,
    recentMeta?: import('../types/project').RecentProjectMeta
  ) => boolean;
  loadCircuitAsProject: (circuit: Circuit) => void;
  saveProject: () => void;
  autosaveProject: () => void;
  restoreAutosavedProject: () => boolean;
  discardAutosavedProject: () => void;
  getRecentProjects: () => RecentProjectEntry[];
  getProjectLibrary: () => ComponentMacro[];
  addMacroToProjectLibrary: (
    name: string,
    components: ComponentMacro['components'],
    wires: ComponentMacro['wires']
  ) => ComponentMacro;

  createProjectSnapshot: (label?: string) => Promise<boolean>;
  listStoredSnapshots: () => Promise<ProjectSnapshotSummary[]>;
  restoreProjectSnapshot: (snapshotId: string) => Promise<boolean>;
  deleteProjectSnapshot: (snapshotId: string) => Promise<boolean>;
  renameProjectSnapshot: (snapshotId: string, label: string) => Promise<boolean>;
  compareProjectSnapshot: (
    snapshotId: string
  ) => Promise<
    import('../utils/projectSnapshotDiff').ProjectSnapshotCompareResult | null
  >;

  setProjectLibrary: (library: ComponentMacro[]) => void;
  updateLibraryMacro: (
    macroId: string,
    patch: Partial<
      Pick<ComponentMacro, 'name' | 'description' | 'tags' | 'author'>
    >
  ) => void;
  updateLibraryMacroComponent: (
    macroId: string,
    componentId: string,
    patch: {
      label?: string;
      terminalLabels?: string;
      properties?: Partial<ComponentProperties>;
    }
  ) => void;
  removeLibraryMacro: (macroId: string) => void;
  importGlobalMacrosToProject: () => number;
  exportProjectLibraryPack: (packName?: string) => boolean;
  importProjectLibraryPack: (
    data: unknown,
    mode?: LibraryMergeMode
  ) => boolean;
  installRegistryLibraryPack: (
    entry: import('../utils/libraryPackRegistry').LibraryPackRegistryEntry,
    mode?: LibraryMergeMode
  ) => Promise<string | null>;
  loadProjectPlugin: (data: unknown) => string | null;
  removeProjectPlugin: (pluginId: string) => void;
  addPluginComponent: (
    pluginId: string,
    typeId: string,
    x: number,
    y: number
  ) => boolean;
  loadExamplePlugin: () => Promise<string | null>;
}
