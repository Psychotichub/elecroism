/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
import React, { useMemo } from 'react';
import { FiCheck, FiTarget } from 'react-icons/fi';
import { useCircuitStore } from '../../store/circuitStore';
import { useUiStore } from '../../store/uiStore';
import CatalogMetaChips from '../Catalog/CatalogMetaChips';
import Button from '../ui/Button';
import Textarea from '../ui/Textarea';
import { getQuizChallenge } from '../../utils/quizChallenges';
import {
  buildChallengeQuiz,
  gradeChallengeAnswer,
} from '../../utils/quizChallengeRuntime';
import { cn } from '../ui/cn';
import LearningPanelShell from './learning/LearningPanelShell';

type Props = {
  docked?: boolean;
};

const ChallengePanel: React.FC<Props> = ({ docked = false }) => {
  const activeAssignment = useUiStore((s) => s.activeAssignment);
  const activeChallengeId = useUiStore((s) => s.activeChallengeId);
  const challengeSelectedOption = useUiStore((s) => s.challengeSelectedOption);
  const challengeFreeText = useUiStore((s) => s.challengeFreeText);
  const challengeSubmitted = useUiStore((s) => s.challengeSubmitted);
  const challengeGrade = useUiStore((s) => s.challengeGrade);
  const exitChallenge = useUiStore((s) => s.exitChallenge);
  const setChallengeSelectedOption = useUiStore(
    (s) => s.setChallengeSelectedOption
  );
  const setChallengeFreeText = useUiStore((s) => s.setChallengeFreeText);
  const setChallengeGrade = useUiStore((s) => s.setChallengeGrade);
  const markChallengeSubmitted = useUiStore((s) => s.markChallengeSubmitted);
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

  const challenge = activeChallengeId
    ? getQuizChallenge(activeChallengeId)
    : undefined;

  const quiz = useMemo(() => {
    if (!challenge) return null;
    return buildChallengeQuiz(challenge, circuit, simulationResult);
  }, [challenge, circuit, simulationResult]);

  if (activeAssignment || !challenge || !quiz) return null;

  const handleSubmit = () => {
    const answer =
      challengeFreeText.trim() || challengeSelectedOption?.trim() || '';
    const grade = gradeChallengeAnswer(
      challenge,
      answer,
      quiz.engineExplanation,
      quiz.correctAnswer
    );
    setChallengeGrade(grade);
    markChallengeSubmitted();
  };

  return (
    <LearningPanelShell
      ariaLabel={`Challenge: ${challenge.title}`}
      eyebrow="Challenge mode"
      title={challenge.title}
      docked={docked}
      pinned={pinned}
      minimized={minimized}
      onTogglePin={toggleLearningPanelPinned}
      onMinimize={toggleLearningPanelMinimized}
      onRestore={() => setLearningPanelMinimized(false)}
      onClose={exitChallenge}
      meta={
        <CatalogMetaChips
          meta={{
            difficulty: challenge.difficulty,
            estimatedMinutes: challenge.estimatedMinutes,
            prerequisites: challenge.prerequisites,
          }}
        />
      }
    >
      <p className="es-typo-body-sm leading-relaxed">{challenge.scenario}</p>
      <p className="es-typo-body font-semibold text-es-bright">
        <FiTarget className="mr-1 inline opacity-70" aria-hidden />
        {challenge.question}
      </p>

      {!challengeSubmitted ? (
        <>
          <fieldset className="space-y-1.5">
            <legend className="sr-only">Diagnosis options</legend>
            {quiz.options.map((option) => (
              <label
                key={option}
                className={cn(
                  'flex cursor-pointer items-start gap-2 rounded-es-sm border border-es-borderSubtle px-2 py-1.5 es-typo-body-sm',
                  challengeSelectedOption === option &&
                    'border-es-accent bg-es-accentMuted'
                )}
              >
                <input
                  type="radio"
                  name="challenge-option"
                  className="mt-0.5"
                  checked={challengeSelectedOption === option}
                  onChange={() => setChallengeSelectedOption(option)}
                />
                <span>{option}</span>
              </label>
            ))}
          </fieldset>
          <label className="block">
            <span className="es-typo-caption text-es-secondary">
              Or type your diagnosis
            </span>
            <Textarea
              value={challengeFreeText}
              onChange={(e) => setChallengeFreeText(e.target.value)}
              rows={2}
              placeholder="e.g. Q1 is OFF — circuit open upstream"
              className="mt-1"
            />
          </label>
          <Button
            variant="primary"
            className="w-full"
            onClick={handleSubmit}
            disabled={!challengeSelectedOption && !challengeFreeText.trim()}
          >
            Submit diagnosis
          </Button>
        </>
      ) : (
        <div
          className={cn(
            'rounded-es-sm border px-3 py-2 es-typo-body-sm leading-relaxed',
            challengeGrade?.correct
              ? 'border-es-success bg-es-success/10 text-es-success'
              : 'border-es-warning bg-es-warning/10 text-es-warning'
          )}
          role="status"
        >
          <p className="font-semibold">
            {challengeGrade?.correct ? (
              <span className="inline-flex items-center gap-1">
                <FiCheck aria-hidden /> Correct ({challengeGrade.score}%)
              </span>
            ) : (
              `Incorrect (${challengeGrade?.score ?? 0}%)`
            )}
          </p>
          <p className="mt-1">{challengeGrade?.feedback}</p>
          {quiz.engineExplanation ? (
            <p className="mt-2 es-typo-caption text-es-secondary">
              Reference: {quiz.engineExplanation}
            </p>
          ) : null}
        </div>
      )}

      {challengeSubmitted ? (
        <Button variant="secondary" className="w-full" onClick={exitChallenge}>
          Close challenge
        </Button>
      ) : (
        <p className="es-typo-caption text-es-secondary">
          Inspect the canvas and Properties panel. Hints are hidden until you
          submit.
        </p>
      )}
    </LearningPanelShell>
  );
};

export default ChallengePanel;
