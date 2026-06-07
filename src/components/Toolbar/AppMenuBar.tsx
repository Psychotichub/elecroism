import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiChevronRight } from 'react-icons/fi';
import { useCircuitStore } from '../../store/circuitStore';
import { useUiStore } from '../../store/uiStore';
import { useThemeStore, themeColors, themeLabel } from '../../store/themeStore';
import { exportToPNG } from '../../utils/export';
import { EXAMPLE_CIRCUITS } from '../../examples/exampleCircuits';
import { listGuidedTutorials } from '../../utils/guidedTutorials';
import { getQuizChallenge, listQuizChallenges } from '../../utils/quizChallenges';
import { resolveChallengeTarget } from '../../utils/quizChallengeRuntime';
import { listCircuitTemplates } from '../../utils/circuitTemplates';
import type { AlignMode, DistributeMode } from '../../utils/componentAlignment';
import { fitToScreen, openProjectFile } from '../../hooks/useGlobalEditorShortcuts';

type MenuAction = {
  label: string;
  shortcut?: string;
  disabled?: boolean;
  checked?: boolean;
  onClick?: () => void;
};

type MenuNode =
  | { kind: 'action'; action: MenuAction }
  | { kind: 'separator' }
  | { kind: 'heading'; label: string }
  | { kind: 'submenu'; label: string; children: MenuNode[] };

interface MenuDropdownProps {
  label: string;
  nodes: MenuNode[];
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  tc: (typeof themeColors)['dark'];
}

const MenuDropdown: React.FC<MenuDropdownProps> = ({
  label,
  nodes,
  open,
  onOpen,
  onClose,
  tc,
}) => (
  <div className="relative">
    <button
      type="button"
      role="menuitem"
      aria-haspopup="menu"
      aria-expanded={open}
      onClick={() => (open ? onClose() : onOpen())}
      onMouseEnter={() => onOpen()}
      className={`rounded px-2.5 py-0.5 text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
        open ? `${tc.itemHover} ${tc.textBright}` : `${tc.text} ${tc.itemHover}`
      }`}
    >
      {label}
    </button>
    {open ? (
      <MenuPanel nodes={nodes} onClose={onClose} tc={tc} className="left-0 top-full" />
    ) : null}
  </div>
);

interface MenuPanelProps {
  nodes: MenuNode[];
  onClose: () => void;
  tc: (typeof themeColors)['dark'];
  className?: string;
}

const MenuPanel: React.FC<MenuPanelProps> = ({
  nodes,
  onClose,
  tc,
  className = '',
}) => {
  const [openSubmenu, setOpenSubmenu] = useState<number | null>(null);

  const runAction = (action: MenuAction) => {
    if (action.disabled || !action.onClick) return;
    action.onClick();
    onClose();
  };

  return (
    <div
      role="menu"
      className={`absolute z-50 mt-0.5 min-w-[11rem] rounded border py-1 shadow-lg ${tc.border} ${tc.panel} ${className}`}
      onMouseLeave={() => setOpenSubmenu(null)}
    >
      {nodes.map((node, i) => {
        if (node.kind === 'separator') {
          return <div key={`sep-${i}`} className={`my-1 border-t ${tc.border}`} />;
        }
        if (node.kind === 'heading') {
          return (
            <div
              key={`head-${i}`}
              className={`px-3 py-1 text-[9px] font-semibold uppercase tracking-wide ${tc.textMuted}`}
            >
              {node.label}
            </div>
          );
        }
        if (node.kind === 'submenu') {
          return (
            <div
              key={`sub-${i}`}
              className="relative"
              onMouseEnter={() => setOpenSubmenu(i)}
            >
              <button
                type="button"
                role="menuitem"
                aria-haspopup="menu"
                className={`flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-xs ${tc.text} ${tc.itemHover}`}
              >
                <span>{node.label}</span>
                <FiChevronRight size={12} className={tc.textMuted} />
              </button>
              {openSubmenu === i ? (
                <MenuPanel
                  nodes={node.children}
                  onClose={onClose}
                  tc={tc}
                  nested
                  className="left-full top-0 ml-0.5 max-h-80 overflow-y-auto"
                />
              ) : null}
            </div>
          );
        }
        const { action } = node;
        return (
          <button
            key={`act-${i}`}
            type="button"
            role="menuitem"
            disabled={action.disabled}
            onClick={() => runAction(action)}
            className={`flex w-full items-center justify-between gap-4 px-3 py-1.5 text-left text-xs disabled:opacity-40 ${tc.text} ${tc.itemHover} ${
              action.checked ? 'font-semibold' : ''
            }`}
          >
            <span>
              {action.checked ? '✓ ' : ''}
              {action.label}
            </span>
            {action.shortcut ? (
              <span className={`text-[10px] ${tc.textMuted}`}>{action.shortcut}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
};

const AppMenuBar: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  const tc = themeColors[theme];
  const barRef = useRef<HTMLElement>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const konvaStage = useUiStore((s) => s.konvaStage);
  const startTutorial = useUiStore((s) => s.startTutorial);
  const startChallenge = useUiStore((s) => s.startChallenge);
  const setLearningMode = useUiStore((s) => s.setLearningMode);
  const setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebarCollapsed = useUiStore((s) => s.toggleSidebarCollapsed);
  const propertyCollapsed = useUiStore((s) => s.propertyPanelCollapsed);
  const togglePropertyPanelCollapsed = useUiStore(
    (s) => s.togglePropertyPanelCollapsed
  );
  const {
    connectionIntegrityOverlay,
    toggleConnectionIntegrityOverlay,
    arcFlashBadges,
    toggleArcFlashBadges,
  } = useUiStore();

  const {
    clearCircuit,
    saveCircuit,
    loadCircuit,
    undo,
    redo,
    setZoom,
    circuit,
    selectedId,
    runSimulation,
    wireObjectSnapEnabled,
    wireGridSnapEnabled,
    wireOrthoEnabled,
    wireSnapModes,
    setWireObjectSnapEnabled,
    setWireSnapModes,
    toggleWireObjectSnap,
    toggleWireGridSnap,
    toggleWireOrtho,
    toggleWireSnapMode,
    wireAutoRouteEnabled,
    toggleWireAutoRoute,
    setCircuitWireLabelsVisible,
    exportWireScheduleCsv,
    exportBomCsv,
    exportTerminalScheduleCsv,
    exportCableScheduleCsv,
    exportDrawingPdf,
    insertCircuitTemplate,
    saveSelectionAsMacro,
    insertMacro,
    listMacros,
    alignSelection,
    distributeSelection,
    setSelected,
  } = useCircuitStore();

  const handleExportPNG = useCallback(() => {
    if (!konvaStage) return;
    exportToPNG(konvaStage, `${circuit.name}.png`);
  }, [circuit.name, konvaStage]);

  const handleExportPdf = useCallback(async () => {
    const err = await exportDrawingPdf();
    if (err) alert(err);
  }, [exportDrawingPdf]);

  const selectedCount = useMemo(
    () =>
      circuit.components.filter((c) => c.selected || c.id === selectedId).length,
    [circuit.components, selectedId]
  );

  const canAlign = selectedCount >= 2;
  const canDistribute = selectedCount >= 3;

  const handleSaveMacro = () => {
    const name = window.prompt('Macro name (e.g. DOL starter)');
    if (!name?.trim()) return;
    if (!saveSelectionAsMacro(name.trim())) {
      window.alert('Select one or more components on the canvas first.');
    }
  };

  const handleStartChallenge = useCallback(
    (challengeId: string) => {
      const challenge = getQuizChallenge(challengeId);
      if (!challenge) return;
      const built = challenge.build();
      loadCircuit(built);
      runSimulation();
      const target = resolveChallengeTarget(built, challenge.targetLabel);
      if (target) setSelected(target.id);
      setLearningMode(true);
      startChallenge(challengeId);
    },
    [loadCircuit, runSimulation, setLearningMode, setSelected, startChallenge]
  );

  useEffect(() => {
    if (!openMenu) return;
    const onPointerDown = (e: MouseEvent) => {
      if (barRef.current?.contains(e.target as Node)) return;
      setOpenMenu(null);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenu(null);
    };
    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [openMenu]);

  const exampleSubmenus: MenuNode[] = useMemo(() => {
    const grouped = EXAMPLE_CIRCUITS.reduce(
      (acc, entry) => {
        (acc[entry.category] ??= []).push(entry);
        return acc;
      },
      {} as Record<string, typeof EXAMPLE_CIRCUITS>
    );
    return Object.entries(grouped).map(([category, entries]) => ({
      kind: 'submenu' as const,
      label: category,
      children: entries.map((entry) => ({
        kind: 'action' as const,
        action: {
          label: entry.name,
          onClick: () => loadCircuit(entry.build()),
        },
      })),
    }));
  }, [loadCircuit]);

  const tutorialSubmenus: MenuNode[] = useMemo(() => {
    const grouped = listGuidedTutorials().reduce(
      (acc, t) => {
        (acc[t.category] ??= []).push(t);
        return acc;
      },
      {} as Record<string, ReturnType<typeof listGuidedTutorials>>
    );
    return Object.entries(grouped).map(([category, entries]) => ({
      kind: 'submenu' as const,
      label: category,
      children: entries.map((t) => ({
        kind: 'action' as const,
        action: {
          label: t.title,
          onClick: () => {
            if (t.clearOnStart) clearCircuit();
            setLearningMode(true);
            startTutorial(t.id);
          },
        },
      })),
    }));
  }, [clearCircuit, setLearningMode, startTutorial]);

  const challengeSubmenus: MenuNode[] = useMemo(() => {
    const grouped = listQuizChallenges().reduce(
      (acc, c) => {
        (acc[c.category] ??= []).push(c);
        return acc;
      },
      {} as Record<string, ReturnType<typeof listQuizChallenges>>
    );
    return Object.entries(grouped).map(([category, entries]) => ({
      kind: 'submenu' as const,
      label: category,
      children: entries.map((c) => ({
        kind: 'action' as const,
        action: {
          label: c.title,
          onClick: () => handleStartChallenge(c.id),
        },
      })),
    }));
  }, [handleStartChallenge]);

  const starterNodes: MenuNode[] = listCircuitTemplates().map((t) => ({
    kind: 'action',
    action: {
      label: t.name,
      onClick: () => insertCircuitTemplate(t.id),
    },
  }));

  const savedMacros = listMacros();
  const macroNodes: MenuNode[] = [
    {
      kind: 'action',
      action: { label: 'Save selection as macro…', onClick: handleSaveMacro },
    },
    { kind: 'separator' },
    ...(savedMacros.length === 0
      ? [{ kind: 'heading' as const, label: 'No saved macros' }]
      : savedMacros.map((m) => ({
          kind: 'action' as const,
          action: {
            label: m.name,
            onClick: () => insertMacro(m.id),
          },
        }))),
  ];

  const alignNodes: MenuNode[] = (
    [
      ['left', 'Align left'],
      ['right', 'Align right'],
      ['top', 'Align top'],
      ['bottom', 'Align bottom'],
      ['centerH', 'Center horizontal'],
      ['centerV', 'Center vertical'],
    ] satisfies [AlignMode, string][]
  ).map(([mode, label]) => ({
    kind: 'action' as const,
    action: {
      label,
      disabled: !canAlign,
      onClick: () => alignSelection(mode),
    },
  }));

  const distributeNodes: MenuNode[] = (
    [
      ['horizontal', 'Even horizontal spacing'],
      ['vertical', 'Even vertical spacing'],
      ['spacingH', `Snap horizontal (${circuit.gridSize})`],
      ['spacingV', `Snap vertical (${circuit.gridSize})`],
    ] satisfies [DistributeMode, string][]
  ).map(([mode, label]) => ({
    kind: 'action' as const,
    action: {
      label,
      disabled: !canDistribute,
      onClick: () => distributeSelection(mode),
    },
  }));

  const menus: { id: string; label: string; nodes: MenuNode[] }[] = [
    {
      id: 'file',
      label: 'File',
      nodes: [
        { kind: 'action', action: { label: 'New', shortcut: 'Ctrl+N', onClick: clearCircuit } },
        { kind: 'action', action: { label: 'Open…', shortcut: 'Ctrl+O', onClick: openProjectFile } },
        { kind: 'action', action: { label: 'Save', shortcut: 'Ctrl+S', onClick: saveCircuit } },
        { kind: 'separator' },
        { kind: 'action', action: { label: 'Export PNG…', onClick: handleExportPNG } },
        { kind: 'action', action: { label: 'Export PDF…', onClick: () => void handleExportPdf() } },
        { kind: 'action', action: { label: 'Wire schedule CSV', onClick: exportWireScheduleCsv } },
        { kind: 'action', action: { label: 'BOM CSV', onClick: exportBomCsv } },
        { kind: 'action', action: { label: 'Terminal schedule CSV', onClick: exportTerminalScheduleCsv } },
        { kind: 'action', action: { label: 'Cable schedule CSV', onClick: exportCableScheduleCsv } },
      ],
    },
    {
      id: 'edit',
      label: 'Edit',
      nodes: [
        { kind: 'action', action: { label: 'Undo', shortcut: 'Ctrl+Z', onClick: undo } },
        { kind: 'action', action: { label: 'Redo', shortcut: 'Ctrl+Y', onClick: redo } },
        { kind: 'separator' },
        {
          kind: 'action',
          action: {
            label: 'Cut',
            shortcut: 'Ctrl+X',
            onClick: () => useCircuitStore.getState().cutSelection(),
          },
        },
        {
          kind: 'action',
          action: {
            label: 'Copy',
            shortcut: 'Ctrl+C',
            onClick: () => useCircuitStore.getState().copySelection(),
          },
        },
        {
          kind: 'action',
          action: {
            label: 'Paste',
            shortcut: 'Ctrl+V',
            onClick: () => useCircuitStore.getState().pasteSelection(),
          },
        },
        {
          kind: 'action',
          action: {
            label: 'Select all',
            shortcut: 'Ctrl+A',
            onClick: () => {
              const { circuit: liveCircuit } = useCircuitStore.getState();
              useCircuitStore.setState({
                selectedId: null,
                circuit: {
                  ...liveCircuit,
                  components: liveCircuit.components.map((c) => ({
                    ...c,
                    selected: true,
                  })),
                },
              });
            },
          },
        },
        { kind: 'separator' },
        {
          kind: 'action',
          action: {
            label: 'Rotate selection',
            shortcut: 'R',
            onClick: () => {
              const { selectedId: sid, rotateComponent } = useCircuitStore.getState();
              if (sid) rotateComponent(sid);
            },
          },
        },
        { kind: 'submenu', label: `Align${canAlign ? ` (${selectedCount})` : ''}`, children: alignNodes },
        { kind: 'submenu', label: `Distribute${canDistribute ? ` (${selectedCount})` : ''}`, children: distributeNodes },
      ],
    },
    {
      id: 'insert',
      label: 'Insert',
      nodes: [
        { kind: 'submenu', label: 'Examples', children: exampleSubmenus },
        { kind: 'submenu', label: 'Tutorials', children: tutorialSubmenus },
        { kind: 'submenu', label: 'Challenges', children: challengeSubmenus },
        { kind: 'submenu', label: 'Starter templates', children: starterNodes },
        { kind: 'submenu', label: 'Macros', children: macroNodes },
      ],
    },
    {
      id: 'view',
      label: 'View',
      nodes: [
        { kind: 'action', action: { label: 'Zoom in', shortcut: '+', onClick: () => setZoom(circuit.zoom * 1.2) } },
        { kind: 'action', action: { label: 'Zoom out', shortcut: '-', onClick: () => setZoom(circuit.zoom / 1.2) } },
        { kind: 'action', action: { label: 'Fit to screen', shortcut: 'F', onClick: fitToScreen } },
        { kind: 'separator' },
        {
          kind: 'action',
          action: {
            label: 'Wire labels',
            checked: circuit.wireLabelsVisible !== false,
            onClick: () =>
              setCircuitWireLabelsVisible(circuit.wireLabelsVisible === false),
          },
        },
        {
          kind: 'action',
          action: {
            label: 'Connection integrity overlay',
            checked: connectionIntegrityOverlay,
            onClick: toggleConnectionIntegrityOverlay,
          },
        },
        {
          kind: 'action',
          action: {
            label: 'Arc-flash badges',
            checked: arcFlashBadges,
            onClick: toggleArcFlashBadges,
          },
        },
        { kind: 'separator' },
        {
          kind: 'action',
          action: {
            label: 'Object snap',
            shortcut: 'F3',
            checked: wireObjectSnapEnabled,
            onClick: toggleWireObjectSnap,
          },
        },
        {
          kind: 'action',
          action: {
            label: 'Snap connections (C)',
            checked: wireObjectSnapEnabled && wireSnapModes.connection,
            onClick: () => {
              if (!wireObjectSnapEnabled) {
                setWireObjectSnapEnabled(true);
                setWireSnapModes({ connection: true });
              } else {
                toggleWireSnapMode('connection');
              }
            },
          },
        },
        {
          kind: 'action',
          action: {
            label: 'Snap endpoints (E)',
            checked: wireObjectSnapEnabled && wireSnapModes.endpoint,
            onClick: () => {
              if (!wireObjectSnapEnabled) {
                setWireObjectSnapEnabled(true);
                setWireSnapModes({ endpoint: true });
              } else {
                toggleWireSnapMode('endpoint');
              }
            },
          },
        },
        {
          kind: 'action',
          action: {
            label: 'Snap midpoints (M)',
            checked: wireObjectSnapEnabled && wireSnapModes.midpoint,
            onClick: () => {
              if (!wireObjectSnapEnabled) {
                setWireObjectSnapEnabled(true);
                setWireSnapModes({ midpoint: true });
              } else {
                toggleWireSnapMode('midpoint');
              }
            },
          },
        },
        {
          kind: 'action',
          action: {
            label: 'Snap intersections (X)',
            checked: wireObjectSnapEnabled && wireSnapModes.intersection,
            onClick: () => {
              if (!wireObjectSnapEnabled) {
                setWireObjectSnapEnabled(true);
                setWireSnapModes({ intersection: true });
              } else {
                toggleWireSnapMode('intersection');
              }
            },
          },
        },
        {
          kind: 'action',
          action: {
            label: 'Ortho mode',
            shortcut: 'F8',
            checked: wireOrthoEnabled,
            onClick: toggleWireOrtho,
          },
        },
        {
          kind: 'action',
          action: {
            label: 'Grid snap',
            shortcut: 'F9',
            checked: wireGridSnapEnabled,
            onClick: toggleWireGridSnap,
          },
        },
        {
          kind: 'action',
          action: {
            label: 'Auto-route wires',
            checked: wireAutoRouteEnabled,
            onClick: toggleWireAutoRoute,
          },
        },
        { kind: 'separator' },
        {
          kind: 'action',
          action: {
            label: `Theme: ${themeLabel(theme)}`,
            onClick: () => useThemeStore.getState().cycleTheme(),
          },
        },
      ],
    },
    {
      id: 'simulate',
      label: 'Simulate',
      nodes: [
        { kind: 'action', action: { label: 'Run simulation', onClick: runSimulation } },
      ],
    },
    {
      id: 'window',
      label: 'Window',
      nodes: [
        {
          kind: 'action',
          action: {
            label: sidebarCollapsed ? 'Show component palette' : 'Hide component palette',
            onClick: toggleSidebarCollapsed,
          },
        },
        {
          kind: 'action',
          action: {
            label: propertyCollapsed ? 'Show inspector' : 'Hide inspector',
            onClick: togglePropertyPanelCollapsed,
          },
        },
        { kind: 'separator' },
        {
          kind: 'action',
          action: {
            label: 'Command palette',
            shortcut: 'Ctrl+K',
            onClick: () => setCommandPaletteOpen(true),
          },
        },
      ],
    },
  ];

  return (
    <nav
      ref={barRef}
      aria-label="Application menu"
      className={`flex h-7 shrink-0 select-none items-center gap-0.5 border-b px-2 ${tc.toolbar} ${tc.border}`}
      role="menubar"
    >
      {menus.map((menu) => (
        <MenuDropdown
          key={menu.id}
          label={menu.label}
          nodes={menu.nodes}
          open={openMenu === menu.id}
          onOpen={() => setOpenMenu(menu.id)}
          onClose={() => setOpenMenu(null)}
          tc={tc}
        />
      ))}
      <div className="flex-1" />
      <span className={`pr-1 text-[10px] ${tc.textMuted}`}>⚡ ElectroSim</span>
    </nav>
  );
};

export default AppMenuBar;
