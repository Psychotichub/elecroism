import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppIcon } from '../ui';
import { useCircuitStore } from '../../store/circuitStore';
import { useThemeStore, themeColors } from '../../store/themeStore';
import { useUiStore } from '../../store/uiStore';
import CatalogMetaChips from '../Catalog/CatalogMetaChips';
import { listGuidedTutorials } from '../../utils/guidedTutorials';

const TutorialDropdown: React.FC<{ inactiveClassName: string }> = ({
  inactiveClassName,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const theme = useThemeStore((s) => s.theme);
  const tc = themeColors[theme];
  const clearCircuit = useCircuitStore((s) => s.clearCircuit);
  const loadCircuit = useCircuitStore((s) => s.loadCircuit);
  const startTutorial = useUiStore((s) => s.startTutorial);
  const setLearningMode = useUiStore((s) => s.setLearningMode);
  const activeTutorialId = useUiStore((s) => s.activeTutorialId);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleStart = useCallback(
    (tutorialId: string) => {
      const tutorial = listGuidedTutorials().find((t) => t.id === tutorialId);
      if (!tutorial) return;
      if (tutorial.initialCircuit) {
        loadCircuit(tutorial.initialCircuit());
      } else if (tutorial.clearOnStart) {
        clearCircuit();
      }
      setLearningMode(true);
      startTutorial(tutorialId);
      setOpen(false);
    },
    [clearCircuit, loadCircuit, setLearningMode, startTutorial]
  );

  const grouped = listGuidedTutorials().reduce(
    (acc, t) => {
      (acc[t.category] ??= []).push(t);
      return acc;
    },
    {} as Record<string, ReturnType<typeof listGuidedTutorials>>
  );

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        title="Step-by-step guided tutorials"
        className={`flex items-center gap-1 rounded px-2 py-1.5 text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
          activeTutorialId
            ? 'bg-blue-600 text-white'
            : inactiveClassName
        }`}
      >
        <span className="es-icon-toolbar">
          <AppIcon id="tutorial" />
        </span>
        <span className="hidden lg:inline">Tutorials</span>
        <span className="es-icon-inline opacity-70">
          <AppIcon id="chevron-down" size="inline" />
        </span>
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute left-0 top-full z-50 mt-1 min-w-[16rem] rounded-md border py-1 shadow-lg ${tc.border} ${theme === 'dark' ? 'bg-zinc-800/95' : 'bg-white/95'} backdrop-blur`}
        >
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <div
                className={`px-3 py-1 text-[10px] font-semibold uppercase tracking-wide ${tc.textMuted}`}
              >
                {category}
              </div>
              {items.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="menuitem"
                  onClick={() => handleStart(t.id)}
                  className={`block w-full px-3 py-2 text-left text-xs ${tc.text} ${tc.itemHover} focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500`}
                >
                  <span className="font-semibold">{t.title}</span>
                  <CatalogMetaChips
                    meta={{
                      difficulty: t.difficulty,
                      estimatedMinutes: t.estimatedMinutes,
                      prerequisites: t.prerequisites,
                    }}
                    className="mt-1"
                  />
                  <span className={`mt-1 block text-[10px] ${tc.textMuted}`}>
                    {t.description}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TutorialDropdown;
