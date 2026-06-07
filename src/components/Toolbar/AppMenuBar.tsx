import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppIcon } from '../ui';
import { useCircuitStore } from '../../store/circuitStore';
import { useUiStore } from '../../store/uiStore';
import { useThemeStore } from '../../store/themeStore';
import type { Theme } from '../../store/themeStore';
import { EXAMPLE_CIRCUITS } from '../../examples/exampleCircuits';
import { listGuidedTutorials } from '../../utils/guidedTutorials';
import { getQuizChallenge, listQuizChallenges } from '../../utils/quizChallenges';
import { resolveChallengeTarget } from '../../utils/quizChallengeRuntime';
import { listCircuitTemplates } from '../../utils/circuitTemplates';
import type { AlignMode, DistributeMode } from '../../utils/componentAlignment';
import {
  menuActionNode,
  type MenuAction,
  type MenuNode,
} from '../../menu/buildMenuNodes';
import { useShortcutStore } from '../../store/shortcutStore';
import { listRecentProjects } from '../../utils/projectPersistence';
import {
  ASSIGNMENT_FILE_ACCEPT,
  openAssignmentDocument,
  parseAssignmentDocument,
} from '../../utils/assignmentMode';
import { openRecentProject, readProjectFileAsText } from '../../utils/projectOpen';
import ExportAssignmentDialog from '../Dialogs/ExportAssignmentDialog';
import { BUNDLED_ORGANIZATION_TEMPLATES } from '../../templates/bundledOrganizationTemplates';
import { parseOrganizationTemplate } from '../../utils/organizationTemplates';
import { cn } from '../ui/cn';
import type { SemanticIconId } from '../../design/icons';

function MenuItemLabel({
  label,
  iconId,
}: {
  label: string;
  iconId?: SemanticIconId;
}) {
  return (
    <span className="es-menu-item-leading">
      {iconId ? (
        <span className="es-icon-inline shrink-0 text-es-secondary">
          <AppIcon id={iconId} size="inline" />
        </span>
      ) : null}
      <span className="truncate">{label}</span>
    </span>
  );
}

interface MenuDropdownProps {
  label: string;
  nodes: MenuNode[];
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}

const MenuDropdown: React.FC<MenuDropdownProps> = ({
  label,
  nodes,
  open,
  onOpen,
  onClose,
}) => (
  <div className="relative">
    <button
      type="button"
      role="menuitem"
      aria-haspopup="menu"
      aria-expanded={open}
      onClick={() => (open ? onClose() : onOpen())}
      onMouseEnter={() => onOpen()}
      className={cn('es-menu-trigger', open && 'es-menu-trigger-open')}
    >
      {label}
    </button>
    {open ? (
      <MenuPanel nodes={nodes} onClose={onClose} className="left-0 top-full" />
    ) : null}
  </div>
);

interface MenuPanelProps {
  nodes: MenuNode[];
  onClose: () => void;
  className?: string;
}

const MenuPanel: React.FC<MenuPanelProps> = ({
  nodes,
  onClose,
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
      className={cn('es-menu-panel', className)}
      onMouseLeave={() => setOpenSubmenu(null)}
    >
      {nodes.map((node, i) => {
        if (node.kind === 'separator') {
          return <div key={`sep-${i}`} className="es-menu-separator" />;
        }
        if (node.kind === 'heading') {
          return (
            <div key={`head-${i}`} className="es-menu-heading">
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
                className="es-menu-item"
              >
                <MenuItemLabel label={node.label} iconId={node.iconId} />
                <span className="es-icon-inline shrink-0 text-es-secondary">
                  <AppIcon id="chevron-right" size="inline" />
                </span>
              </button>
              {openSubmenu === i ? (
                <MenuPanel
                  nodes={node.children}
                  onClose={onClose}
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
            className={cn(
              'es-menu-item',
              action.checked && 'es-menu-item-checked'
            )}
          >
            <MenuItemLabel
              label={`${action.checked ? '✓ ' : ''}${action.label}`}
              iconId={action.iconId}
            />
            {action.shortcut ? (
              <span className="es-menu-shortcut">{action.shortcut}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
};

const AppMenuBar: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const uiDensity = useUiStore((s) => s.uiDensity);
  const setUiDensity = useUiStore((s) => s.setUiDensity);
  const showSheetTabBar = useUiStore((s) => s.showSheetTabBar);
  const toggleShowSheetTabBar = useUiStore((s) => s.toggleShowSheetTabBar);
  const shortcutBindings = useShortcutStore((s) => s.bindings);
  const barRef = useRef<HTMLElement>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const startTutorial = useUiStore((s) => s.startTutorial);
  const startChallenge = useUiStore((s) => s.startChallenge);
  const startAssignment = useUiStore((s) => s.startAssignment);
  const setLearningMode = useUiStore((s) => s.setLearningMode);
  const setGradeSubmissionsOpen = useUiStore((s) => s.setGradeSubmissionsOpen);
  const [exportAssignmentOpen, setExportAssignmentOpen] = useState(false);
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const propertyCollapsed = useUiStore((s) => s.propertyPanelCollapsed);
  const { connectionIntegrityOverlay, arcFlashBadges, sldViewMode } = useUiStore();

  useCircuitStore((s) => s.project.updatedAt);

  const {
    clearCircuit,
    loadCircuit,
    runSimulation,
    circuit,
    selectedId,
    wireObjectSnapEnabled,
    wireGridSnapEnabled,
    wireOrthoEnabled,
    wireSnapModes,
    setWireObjectSnapEnabled,
    setWireSnapModes,
    toggleWireSnapMode,
    wireAutoRouteEnabled,
    insertCircuitTemplate,
    newProjectFromOrganizationTemplate,
    loadOrganizationTemplateFile,
    saveSelectionAsMacro,
    insertMacro,
    listMacros,
    alignSelection,
    distributeSelection,
    setSelected,
  } = useCircuitStore();

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

  const handleOpenAssignmentFile = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = ASSIGNMENT_FILE_ACCEPT;
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await readProjectFileAsText(file);
        const doc = parseAssignmentDocument(JSON.parse(text) as unknown);
        if (!doc) {
          window.alert('Invalid assignment file.');
          return;
        }
        openAssignmentDocument(doc, {
          loadCircuit,
          runSimulation,
          setSelected,
          startAssignment,
          setLearningMode,
        });
      } catch {
        window.alert('Could not open assignment file.');
      }
    };
    input.click();
  }, [loadCircuit, runSimulation, setLearningMode, setSelected, startAssignment]);

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
            if (t.initialCircuit) loadCircuit(t.initialCircuit());
            else if (t.clearOnStart) clearCircuit();
            setLearningMode(true);
            startTutorial(t.id);
          },
        },
      })),
    }));
  }, [clearCircuit, loadCircuit, setLearningMode, startTutorial]);

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

  const classroomNodes: MenuNode[] = useMemo(
    () => [
      {
        kind: 'action',
        action: {
          label: 'Open assignment file…',
          onClick: handleOpenAssignmentFile,
        },
      },
      {
        kind: 'action',
        action: {
          label: 'Export challenge as assignment…',
          onClick: () => setExportAssignmentOpen(true),
        },
      },
      {
        kind: 'action',
        action: {
          label: 'Grade submissions…',
          onClick: () => setGradeSubmissionsOpen(true),
        },
      },
    ],
    [handleOpenAssignmentFile, setGradeSubmissionsOpen]
  );

  const handleLoadOrgTemplateFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.orgtemplate.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string) as unknown;
          const registerErr = loadOrganizationTemplateFile(data);
          if (registerErr) {
            window.alert(registerErr);
            return;
          }
          const parsed = parseOrganizationTemplate(data);
          if (!parsed) {
            window.alert('Template file is missing required fields.');
            return;
          }
          void newProjectFromOrganizationTemplate(parsed.id).then((createErr) => {
            if (createErr) window.alert(createErr);
          });
        } catch {
          window.alert('Could not parse organization template file.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const orgTemplateNodes: MenuNode[] = [
    ...BUNDLED_ORGANIZATION_TEMPLATES.map((t) => ({
      kind: 'action' as const,
      action: {
        label: t.name,
        onClick: () => {
          void newProjectFromOrganizationTemplate(t.id).then((err) => {
            if (err) window.alert(err);
          });
        },
      },
    })),
    { kind: 'separator' as const },
    {
      kind: 'action' as const,
      action: {
        label: 'Load template file…',
        onClick: handleLoadOrgTemplateFile,
      },
    },
  ];

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

  void shortcutBindings;

  const appearanceNodes: MenuNode[] = useMemo(() => {
    const themeOption = (value: Theme, label: string): MenuNode => ({
      kind: 'action',
      action: {
        label,
        checked: theme === value,
        onClick: () => setTheme(value),
      },
    });
    return [
      { kind: 'heading', label: 'Theme' },
      themeOption('dark', 'Dark'),
      themeOption('light', 'Light'),
      themeOption('high-contrast', 'High contrast'),
      { kind: 'separator' },
      { kind: 'heading', label: 'Density' },
      {
        kind: 'action',
        action: {
          label: 'Default',
          checked: uiDensity === 'default',
          onClick: () => setUiDensity('default'),
        },
      },
      {
        kind: 'action',
        action: {
          label: 'Comfortable',
          checked: uiDensity === 'comfortable',
          onClick: () => setUiDensity('comfortable'),
        },
      },
      { kind: 'separator' },
      { kind: 'heading', label: 'Layout' },
      {
        kind: 'action',
        action: {
          label: 'Show sheet tab bar',
          checked: showSheetTabBar,
          onClick: () => toggleShowSheetTabBar(),
        },
      },
    ];
  }, [
    theme,
    uiDensity,
    showSheetTabBar,
    setTheme,
    setUiDensity,
    toggleShowSheetTabBar,
  ]);

  const buildRecentMenuNodes = (): MenuNode[] => {
    const recent = listRecentProjects();
    if (recent.length === 0) {
      return [{ kind: 'heading', label: 'No recent projects' }];
    }
    return recent.map((entry) => ({
      kind: 'action' as const,
      action: {
        label: entry.displayName ?? entry.name,
        onClick: () => {
          void openRecentProject(entry).then((result) => {
            if (!result.ok) window.alert(result.error ?? 'Could not open project.');
          });
        },
      },
    }));
  };

  const menus: { id: string; label: string; nodes: MenuNode[] }[] = [
    {
      id: 'file',
      label: 'File',
      nodes: [
        menuActionNode('new'),
        { kind: 'submenu', label: 'New from template', children: orgTemplateNodes },
        menuActionNode('open'),
        { kind: 'submenu', label: 'Open Recent', children: buildRecentMenuNodes() },
        menuActionNode('save'),
        menuActionNode('project-settings'),
        menuActionNode('get-library-packs'),
        { kind: 'separator' },
        menuActionNode('export-png'),
        menuActionNode('export-pdf'),
        menuActionNode('coordination-pdf'),
        menuActionNode('export-documentation-pack'),
        menuActionNode('export-wire-csv'),
        menuActionNode('export-bom-csv'),
        menuActionNode('export-terminal-csv'),
        menuActionNode('export-cable-csv'),
        menuActionNode('export-panel-schedule-csv'),
        menuActionNode('export-panel-schedule-pdf'),
        menuActionNode('export-review-comments-pdf'),
        menuActionNode('export-review-comments-json'),
        menuActionNode('export-sld-pdf'),
      ],
    },
    {
      id: 'edit',
      label: 'Edit',
      nodes: [
        menuActionNode('undo'),
        menuActionNode('redo'),
        { kind: 'separator' },
        menuActionNode('cut'),
        menuActionNode('copy'),
        menuActionNode('paste'),
        menuActionNode('select-all'),
        { kind: 'separator' },
        menuActionNode('rotate'),
        { kind: 'submenu', label: `Align${canAlign ? ` (${selectedCount})` : ''}`, children: alignNodes },
        { kind: 'submenu', label: `Distribute${canDistribute ? ` (${selectedCount})` : ''}`, children: distributeNodes },
      ],
    },
    {
      id: 'insert',
      label: 'Insert',
      nodes: [
        { kind: 'submenu', label: 'Examples', iconId: 'examples', children: exampleSubmenus },
        {
          kind: 'submenu',
          label: 'Learning',
          iconId: 'learning',
          children: [
            {
              kind: 'submenu',
              label: 'Tutorials',
              iconId: 'tutorial',
              children: tutorialSubmenus,
            },
            {
              kind: 'submenu',
              label: 'Challenges',
              iconId: 'challenge',
              children: challengeSubmenus,
            },
            {
              kind: 'submenu',
              label: 'Classroom',
              iconId: 'assignment',
              children: classroomNodes,
            },
          ],
        },
        { kind: 'submenu', label: 'Starter templates', iconId: 'starter', children: starterNodes },
        { kind: 'submenu', label: 'Macros', iconId: 'macro', children: macroNodes },
      ],
    },
    {
      id: 'view',
      label: 'View',
      nodes: [
        menuActionNode('zoom-in'),
        menuActionNode('zoom-out'),
        menuActionNode('fit-screen'),
        { kind: 'separator' },
        menuActionNode('toggle-wire-labels', {
          checked: circuit.wireLabelsVisible !== false,
        }),
        menuActionNode('toggle-connection-overlay', {
          checked: connectionIntegrityOverlay,
        }),
        menuActionNode('toggle-arc-flash', { checked: arcFlashBadges }),
        { kind: 'separator' },
        menuActionNode('toggle-object-snap', {
          checked: wireObjectSnapEnabled,
        }),
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
        menuActionNode('toggle-ortho', { checked: wireOrthoEnabled }),
        menuActionNode('toggle-grid-snap', { checked: wireGridSnapEnabled }),
        menuActionNode('toggle-auto-route', { checked: wireAutoRouteEnabled }),
        { kind: 'separator' },
        menuActionNode('toggle-sld-view', { checked: sldViewMode }),
        { kind: 'separator' },
        { kind: 'submenu', label: 'Appearance', children: appearanceNodes },
      ],
    },
    {
      id: 'simulate',
      label: 'Simulate',
      nodes: [menuActionNode('run-simulation')],
    },
    {
      id: 'window',
      label: 'Window',
      nodes: [
        menuActionNode('toggle-sidebar', {
          label: sidebarCollapsed ? 'Show component palette' : 'Hide component palette',
        }),
        menuActionNode('toggle-inspector', {
          label: propertyCollapsed ? 'Show inspector' : 'Hide inspector',
        }),
        { kind: 'separator' },
        menuActionNode('command-palette'),
        { kind: 'separator' },
        menuActionNode('shortcut-settings'),
        menuActionNode('privacy-settings'),
      ],
    },
  ];

  return (
    <>
      <nav
        ref={barRef}
        aria-label="Application menu"
        className="es-menu-bar"
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
          />
        ))}
        <div className="flex-1" />
        <span className="pr-1 es-typo-caption text-es-secondary">
          ⚡ ElectroSim
        </span>
      </nav>
      {exportAssignmentOpen ? (
        <ExportAssignmentDialog onClose={() => setExportAssignmentOpen(false)} />
      ) : null}
    </>
  );
};

export default AppMenuBar;
