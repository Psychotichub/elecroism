import React, { useMemo } from 'react';
import { FiCheck, FiChevronLeft, FiChevronRight, FiX } from 'react-icons/fi';
import { useCircuitStore } from '../../store/circuitStore';
import { useThemeStore, themeColors } from '../../store/themeStore';
import { useUiStore } from '../../store/uiStore';
import CatalogMetaChips from '../Catalog/CatalogMetaChips';
import {
  evaluateTutorialStep,
  getGuidedTutorial,
} from '../../utils/guidedTutorials';

const TutorialPanel: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  const tc = themeColors[theme];
  const activeTutorialId = useUiStore((s) => s.activeTutorialId);
  const tutorialStepIndex = useUiStore((s) => s.tutorialStepIndex);
  const advanceTutorialStep = useUiStore((s) => s.advanceTutorialStep);
  const retreatTutorialStep = useUiStore((s) => s.retreatTutorialStep);
  const exitTutorial = useUiStore((s) => s.exitTutorial);

  const circuit = useCircuitStore((s) => s.circuit);
  const simulationResult = useCircuitStore((s) => s.simulationResult);

  const tutorial = activeTutorialId
    ? getGuidedTutorial(activeTutorialId)
    : undefined;

  const step = tutorial?.steps[tutorialStepIndex];
  const totalSteps = tutorial?.steps.length ?? 0;

  const checkpointPassed = useMemo(() => {
    if (!tutorial || !step) return false;
    return evaluateTutorialStep(tutorial, tutorialStepIndex, {
      circuit,
      simulationResult,
    });
  }, [tutorial, tutorialStepIndex, step, circuit, simulationResult]);

  if (!tutorial || !step) return null;

  const isFirst = tutorialStepIndex === 0;
  const isLast = tutorialStepIndex >= totalSteps - 1;

  return (
    <aside
      className={`fixed bottom-14 left-4 z-50 w-[22rem] max-w-[calc(100vw-2rem)] rounded-lg border shadow-xl ${tc.border} ${tc.panel} ${tc.text}`}
      aria-label={`Tutorial: ${tutorial.title}`}
    >
      <div
        className={`flex items-start justify-between gap-2 border-b px-3 py-2 ${tc.border}`}
      >
        <div className="min-w-0">
          <p className={`text-[10px] font-semibold uppercase tracking-wide ${tc.textMuted}`}>
            Guided tutorial
          </p>
          <h2 className={`truncate text-sm font-bold ${tc.textBright}`}>
            {tutorial.title}
          </h2>
          <CatalogMetaChips
            meta={{
              difficulty: tutorial.difficulty,
              estimatedMinutes: tutorial.estimatedMinutes,
              prerequisites: tutorial.prerequisites,
            }}
            className="mt-1"
          />
        </div>
        <button
          type="button"
          onClick={exitTutorial}
          aria-label="Exit tutorial"
          className={`shrink-0 rounded p-1 ${tc.itemHover} ${tc.textMuted} focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}
        >
          <FiX aria-hidden />
        </button>
      </div>

      <div className="space-y-3 px-3 py-3">
        <div>
          <div className="mb-1 flex items-center justify-between gap-2 text-[10px]">
            <span className={tc.textMuted}>
              Step {tutorialStepIndex + 1} of {totalSteps}
            </span>
            <span
              className={
                checkpointPassed ? 'font-semibold text-emerald-500' : tc.textMuted
              }
            >
              {checkpointPassed ? (
                <span className="inline-flex items-center gap-1">
                  <FiCheck aria-hidden /> Checkpoint
                </span>
              ) : (
                'In progress'
              )}
            </span>
          </div>
          <div
            className={`h-1.5 overflow-hidden rounded-full ${theme === 'light' ? 'bg-gray-200' : 'bg-black/30'}`}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={totalSteps}
            aria-valuenow={tutorialStepIndex + 1}
            aria-label="Tutorial progress"
          >
            <div
              className="h-full bg-blue-600 transition-all"
              style={{
                width: `${((tutorialStepIndex + 1) / totalSteps) * 100}%`,
              }}
            />
          </div>
        </div>

        <div>
          <h3 className={`text-xs font-semibold ${tc.textBright}`}>{step.title}</h3>
          <p className="mt-1 text-[11px] leading-relaxed">{step.instruction}</p>
          <p className={`mt-2 text-[10px] leading-relaxed ${tc.textMuted}`}>
            {step.hint}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={retreatTutorialStep}
            disabled={isFirst}
            className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] ${tc.btnBg} ${tc.btnText} disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}
          >
            <FiChevronLeft aria-hidden /> Back
          </button>
          {!isLast ? (
            <button
              type="button"
              onClick={advanceTutorialStep}
              disabled={!checkpointPassed}
              className="inline-flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-[11px] font-semibold text-white disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              Next <FiChevronRight aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              onClick={exitTutorial}
              disabled={!checkpointPassed}
              className="inline-flex items-center gap-1 rounded bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              Finish <FiCheck aria-hidden />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};

export default TutorialPanel;
