import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FiChevronDown, FiTarget } from 'react-icons/fi';
import { useCircuitStore } from '../../store/circuitStore';
import { useThemeStore, themeColors } from '../../store/themeStore';
import { useUiStore } from '../../store/uiStore';
import { getQuizChallenge, listQuizChallenges } from '../../utils/quizChallenges';
import { resolveChallengeTarget } from '../../utils/quizChallengeRuntime';

const ChallengeDropdown: React.FC<{ inactiveClassName: string }> = ({
  inactiveClassName,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const theme = useThemeStore((s) => s.theme);
  const tc = themeColors[theme];
  const loadCircuit = useCircuitStore((s) => s.loadCircuit);
  const runSimulation = useCircuitStore((s) => s.runSimulation);
  const setSelected = useCircuitStore((s) => s.setSelected);
  const startChallenge = useUiStore((s) => s.startChallenge);
  const setLearningMode = useUiStore((s) => s.setLearningMode);
  const activeChallengeId = useUiStore((s) => s.activeChallengeId);

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
    (challengeId: string) => {
      const challenge = getQuizChallenge(challengeId);
      if (!challenge) return;
      const circuit = challenge.build();
      loadCircuit(circuit);
      runSimulation();
      const target = resolveChallengeTarget(circuit, challenge.targetLabel);
      if (target) setSelected(target.id);
      setLearningMode(true);
      startChallenge(challengeId);
      setOpen(false);
    },
    [loadCircuit, runSimulation, setLearningMode, setSelected, startChallenge]
  );

  const grouped = listQuizChallenges().reduce(
    (acc, c) => {
      (acc[c.category] ??= []).push(c);
      return acc;
    },
    {} as Record<string, ReturnType<typeof listQuizChallenges>>
  );

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        title="Fault diagnosis challenges — graded by the simulation engine"
        className={`flex items-center gap-1 rounded px-2 py-1.5 text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
          activeChallengeId
            ? 'bg-amber-600 text-white'
            : inactiveClassName
        }`}
      >
        <FiTarget aria-hidden />
        <span className="hidden lg:inline">Challenges</span>
        <FiChevronDown className="opacity-70" aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute left-0 top-full z-50 mt-1 min-w-[18rem] rounded-md border py-1 shadow-lg ${tc.border} ${theme === 'dark' ? 'bg-zinc-800/95' : 'bg-white/95'} backdrop-blur`}
        >
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <div
                className={`px-3 py-1 text-[10px] font-semibold uppercase tracking-wide ${tc.textMuted}`}
              >
                {category}
              </div>
              {items.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="menuitem"
                  onClick={() => handleStart(c.id)}
                  className={`block w-full px-3 py-2 text-left text-xs ${tc.text} ${tc.itemHover} focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500`}
                >
                  <span className="font-semibold">{c.title}</span>
                  <span className={`mt-0.5 block text-[10px] ${tc.textMuted}`}>
                    {c.scenario}
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

export default ChallengeDropdown;
