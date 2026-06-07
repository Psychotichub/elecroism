import React, { useMemo } from 'react';
import { FiExternalLink } from 'react-icons/fi';
import { useCircuitStore } from '../../store/circuitStore';
import { useThemeStore, themeColors } from '../../store/themeStore';
import { collectBacklinksToSheet } from '../../utils/crossSheetNavigation';

const CrossSheetBacklinksSection: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  const tc = themeColors[theme];
  const project = useCircuitStore((s) => s.project);
  const navigateCrossSheetRef = useCircuitStore((s) => s.navigateCrossSheetRef);
  const setSelected = useCircuitStore((s) => s.setSelected);
  const switchProjectSheet = useCircuitStore((s) => s.switchProjectSheet);

  const backlinks = useMemo(
    () => collectBacklinksToSheet(project, project.activeSheetId),
    [project]
  );

  if (backlinks.length === 0) return null;

  return (
    <section
      className={`rounded-md border px-2.5 py-2 ${tc.border} ${theme === 'dark' ? 'bg-black/20' : 'bg-white/70'}`}
    >
      <h3 className={`mb-1 text-[10px] font-semibold uppercase tracking-wide ${tc.textMuted}`}>
        References to this sheet
      </h3>
      <ul className="space-y-1">
        {backlinks.map((link, i) => (
          <li key={`${link.fromSheetId}-${link.parsed.raw}-${i}`}>
            <button
              type="button"
              className={`flex w-full items-start gap-1.5 rounded px-1.5 py-1 text-left text-[11px] ${tc.text} ${tc.itemHover}`}
              onClick={() => {
                if (link.fromSheetId !== project.activeSheetId) {
                  switchProjectSheet(link.fromSheetId);
                }
                if (link.componentId) {
                  setSelected(link.componentId);
                }
              }}
            >
              <FiExternalLink size={12} className="mt-0.5 shrink-0 text-sky-400" />
              <span>
                <span className="font-medium">{link.parsed.raw}</span>
                <span className={`block text-[10px] ${tc.textMuted}`}>
                  from {link.fromSheetName}
                  {link.componentLabel ? ` · ${link.componentLabel}` : ''}
                </span>
              </span>
            </button>
            <button
              type="button"
              className={`ml-5 text-[10px] text-sky-500 hover:underline`}
              onClick={() => navigateCrossSheetRef(link.parsed.raw)}
            >
              Go to target
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default CrossSheetBacklinksSection;
