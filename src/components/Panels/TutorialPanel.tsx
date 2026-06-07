import React, { useMemo } from 'react';
import { FiCheck, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { useCircuitStore } from '../../store/circuitStore';
import { useUiStore } from '../../store/uiStore';
import CatalogMetaChips from '../Catalog/CatalogMetaChips';
import Button from '../ui/Button';
import {
  evaluateTutorialStep,
  getGuidedTutorial,
} from '../../utils/guidedTutorials';
import LearningPanelShell from './learning/LearningPanelShell';

type Props = {
  docked?: boolean;
};

const TutorialPanel: React.FC<Props> = ({ docked = false }) => {
  const activeTutorialId = useUiStore((s) => s.activeTutorialId);
  const tutorialStepIndex = useUiStore((s) => s.tutorialStepIndex);
  const advanceTutorialStep = useUiStore((s) => s.advanceTutorialStep);
  const retreatTutorialStep = useUiStore((s) => s.retreatTutorialStep);
  const exitTutorial = useUiStore((s) => s.exitTutorial);
  const pinned = useUiStore((s) => s.learningPanelPinned);
  const minimized = useUiStore((s) => s.learningPanelMinimized);
  const toggleLearningPanelPinned = useUiStore(
    (s) => s.toggleLearningPanelPinned
  );
  const toggleLearningPanelMinimized = useUiStore(
    (s) => s.toggleLearningPanelMinimized
  );
  const setLearningPanelMinimized = useUiStore(
    (s) => s.setLearningPanelMinimized
  );

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
    <LearningPanelShell
      ariaLabel={`Tutorial: ${tutorial.title}`}
      eyebrow="Guided tutorial"
      title={tutorial.title}
      docked={docked}
      pinned={pinned}
      minimized={minimized}
      onTogglePin={toggleLearningPanelPinned}
      onMinimize={toggleLearningPanelMinimized}
      onRestore={() => setLearningPanelMinimized(false)}
      onClose={exitTutorial}
      meta={
        <CatalogMetaChips
          meta={{
            difficulty: tutorial.difficulty,
            estimatedMinutes: tutorial.estimatedMinutes,
            prerequisites: tutorial.prerequisites,
          }}
        />
      }
    >
      <div>
        <div className="mb-1 flex items-center justify-between gap-2 es-typo-caption">
          <span className="text-es-secondary">
            Step {tutorialStepIndex + 1} of {totalSteps}
          </span>
          <span
            className={
              checkpointPassed
                ? 'font-semibold text-es-success'
                : 'text-es-secondary'
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
          className="h-1.5 overflow-hidden rounded-full bg-es-chrome1"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={totalSteps}
          aria-valuenow={tutorialStepIndex + 1}
          aria-label="Tutorial progress"
        >
          <div
            className="h-full bg-es-accent transition-all"
            style={{
              width: `${((tutorialStepIndex + 1) / totalSteps) * 100}%`,
            }}
          />
        </div>
      </div>

      <div>
        <h3 className="es-typo-body font-semibold text-es-bright">
          {step.title}
        </h3>
        <p className="mt-1 es-typo-body-sm leading-relaxed">{step.instruction}</p>
        <p className="mt-2 es-typo-caption leading-relaxed text-es-secondary">
          {step.hint}
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <Button
          variant="secondary"
          onClick={retreatTutorialStep}
          disabled={isFirst}
        >
          <FiChevronLeft aria-hidden /> Back
        </Button>
        {!isLast ? (
          <Button
            variant="primary"
            onClick={advanceTutorialStep}
            disabled={!checkpointPassed}
          >
            Next <FiChevronRight aria-hidden />
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={exitTutorial}
            disabled={!checkpointPassed}
            className="bg-es-success text-white hover:opacity-90"
          >
            Finish <FiCheck aria-hidden />
          </Button>
        )}
      </div>
    </LearningPanelShell>
  );
};

export default TutorialPanel;
