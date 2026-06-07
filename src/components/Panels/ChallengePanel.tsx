import React, { useMemo } from 'react';
import { FiCheck, FiTarget, FiX } from 'react-icons/fi';
import { useCircuitStore } from '../../store/circuitStore';
import { useThemeStore, themeColors } from '../../store/themeStore';
import { useUiStore } from '../../store/uiStore';
import CatalogMetaChips from '../Catalog/CatalogMetaChips';
import { getQuizChallenge } from '../../utils/quizChallenges';
import {
  buildChallengeQuiz,
  gradeChallengeAnswer,
} from '../../utils/quizChallengeRuntime';

const ChallengePanel: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  const tc = themeColors[theme];
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
    <aside
      className={`fixed bottom-14 right-4 z-50 w-[22rem] max-w-[calc(100vw-2rem)] rounded-lg border shadow-xl ${tc.border} ${tc.panel} ${tc.text}`}
      aria-label={`Challenge: ${challenge.title}`}
    >
      <div
        className={`flex items-start justify-between gap-2 border-b px-3 py-2 ${tc.border}`}
      >
        <div className="min-w-0">
          <p
            className={`text-[10px] font-semibold uppercase tracking-wide ${tc.textMuted}`}
          >
            Challenge mode
          </p>
          <h2 className={`truncate text-sm font-bold ${tc.textBright}`}>
            {challenge.title}
          </h2>
          <CatalogMetaChips
            meta={{
              difficulty: challenge.difficulty,
              estimatedMinutes: challenge.estimatedMinutes,
              prerequisites: challenge.prerequisites,
            }}
            className="mt-1"
          />
        </div>
        <button
          type="button"
          onClick={exitChallenge}
          aria-label="Exit challenge"
          className={`shrink-0 rounded p-1 ${tc.itemHover} ${tc.textMuted} focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}
        >
          <FiX aria-hidden />
        </button>
      </div>

      <div className="space-y-3 px-3 py-3">
        <p className="text-[11px] leading-relaxed">{challenge.scenario}</p>
        <p className={`text-xs font-semibold ${tc.textBright}`}>
          <FiTarget className="mr-1 inline opacity-70" aria-hidden />
          {challenge.question}
        </p>

        {!challengeSubmitted ? (
          <>
            <fieldset className="space-y-1.5">
              <legend className={`sr-only`}>Diagnosis options</legend>
              {quiz.options.map((option) => (
                <label
                  key={option}
                  className={`flex cursor-pointer items-start gap-2 rounded border px-2 py-1.5 text-[11px] ${tc.border} ${
                    challengeSelectedOption === option
                      ? 'border-blue-500 bg-blue-600/10'
                      : ''
                  }`}
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
              <span className={`text-[10px] ${tc.textMuted}`}>
                Or type your diagnosis
              </span>
              <textarea
                value={challengeFreeText}
                onChange={(e) => setChallengeFreeText(e.target.value)}
                rows={2}
                placeholder="e.g. Q1 is OFF — circuit open upstream"
                className={`mt-1 w-full rounded border px-2 py-1 text-[11px] ${tc.inputBorder} ${tc.inputBg} ${tc.inputText} focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}
              />
            </label>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!challengeSelectedOption && !challengeFreeText.trim()}
              className="w-full rounded bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              Submit diagnosis
            </button>
          </>
        ) : (
          <div
            className={`rounded border px-3 py-2 text-[11px] leading-relaxed ${
              challengeGrade?.correct
                ? 'border-emerald-600/50 bg-emerald-950/40 text-emerald-200'
                : 'border-amber-600/50 bg-amber-950/40 text-amber-200'
            }`}
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
              <p className={`mt-2 text-[10px] ${tc.textMuted}`}>
                Reference: {quiz.engineExplanation}
              </p>
            ) : null}
          </div>
        )}

        {challengeSubmitted ? (
          <button
            type="button"
            onClick={exitChallenge}
            className={`w-full rounded px-3 py-1.5 text-[11px] ${tc.btnBg} ${tc.btnText} focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}
          >
            Close challenge
          </button>
        ) : (
          <p className={`text-[10px] ${tc.textMuted}`}>
            Inspect the canvas and Properties panel. Hints are hidden until you
            submit.
          </p>
        )}
      </div>
    </aside>
  );
};

export default ChallengePanel;
