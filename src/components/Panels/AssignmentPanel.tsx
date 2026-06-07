import React from 'react';
import { FiBookOpen, FiDownload, FiX } from 'react-icons/fi';
import { useThemeStore, themeColors } from '../../store/themeStore';
import { useUiStore } from '../../store/uiStore';
import {
  buildSubmissionDocument,
  downloadSubmissionFile,
} from '../../utils/assignmentMode';

const AssignmentPanel: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  const tc = themeColors[theme];
  const assignment = useUiStore((s) => s.activeAssignment);
  const studentName = useUiStore((s) => s.assignmentStudentName);
  const studentId = useUiStore((s) => s.assignmentStudentId);
  const freeText = useUiStore((s) => s.assignmentFreeText);
  const submitted = useUiStore((s) => s.assignmentSubmitted);
  const exitAssignment = useUiStore((s) => s.exitAssignment);
  const setStudentName = useUiStore((s) => s.setAssignmentStudentName);
  const setStudentId = useUiStore((s) => s.setAssignmentStudentId);
  const setFreeText = useUiStore((s) => s.setAssignmentFreeText);
  const markSubmitted = useUiStore((s) => s.markAssignmentSubmitted);

  if (!assignment) return null;

  const handleSubmit = () => {
    markSubmitted();
  };

  const handleDownload = () => {
    const doc = buildSubmissionDocument({
      assignment,
      studentName,
      studentId,
      answer: freeText,
    });
    downloadSubmissionFile(doc);
  };

  return (
    <aside
      className={`fixed bottom-14 right-4 z-50 w-[22rem] max-w-[calc(100vw-2rem)] rounded-lg border shadow-xl ${tc.border} ${tc.panel} ${tc.text}`}
      aria-label={`Assignment: ${assignment.title}`}
    >
      <div
        className={`flex items-start justify-between gap-2 border-b px-3 py-2 ${tc.border}`}
      >
        <div className="min-w-0">
          <p
            className={`text-[10px] font-semibold uppercase tracking-wide ${tc.textMuted}`}
          >
            Classroom assignment
          </p>
          <h2 className={`truncate text-sm font-bold ${tc.textBright}`}>
            {assignment.title}
          </h2>
          {assignment.courseName ? (
            <p className={`mt-0.5 text-[10px] ${tc.textMuted}`}>
              {assignment.courseName}
              {assignment.dueDate ? ` · due ${assignment.dueDate}` : ''}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={exitAssignment}
          aria-label="Exit assignment"
          className={`shrink-0 rounded p-1 ${tc.itemHover} ${tc.textMuted} focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}
        >
          <FiX aria-hidden />
        </button>
      </div>

      <div className="space-y-3 px-3 py-3">
        <p className="text-[11px] leading-relaxed">{assignment.scenario}</p>
        <p className={`text-xs font-semibold ${tc.textBright}`}>
          <FiBookOpen className="mr-1 inline opacity-70" aria-hidden />
          {assignment.question}
        </p>

        {!submitted ? (
          <>
            <label className="block">
              <span className={`text-[10px] ${tc.textMuted}`}>Your name</span>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Student name"
                className={`mt-1 w-full rounded border px-2 py-1 text-[11px] ${tc.inputBorder} ${tc.inputBg} ${tc.inputText} focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}
              />
            </label>
            <label className="block">
              <span className={`text-[10px] ${tc.textMuted}`}>
                Student ID (optional)
              </span>
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="ID or email"
                className={`mt-1 w-full rounded border px-2 py-1 text-[11px] ${tc.inputBorder} ${tc.inputBg} ${tc.inputText} focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}
              />
            </label>
            <label className="block">
              <span className={`text-[10px] ${tc.textMuted}`}>Diagnosis</span>
              <textarea
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                rows={3}
                placeholder="Describe the root cause in your own words"
                className={`mt-1 w-full rounded border px-2 py-1 text-[11px] ${tc.inputBorder} ${tc.inputBg} ${tc.inputText} focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}
              />
            </label>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!studentName.trim() || !freeText.trim()}
              className="w-full rounded bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              Submit assignment
            </button>
            <p className={`text-[10px] ${tc.textMuted}`}>
              Hints and model answers are hidden. Your instructor will grade
              exported submission files.
            </p>
          </>
        ) : (
          <div
            className={`rounded border px-3 py-2 text-[11px] leading-relaxed border-emerald-600/50 bg-emerald-950/40 text-emerald-200`}
            role="status"
          >
            <p className="font-semibold">Submitted</p>
            <p className="mt-1">
              Download your submission file and send it to your instructor.
              Scores are not shown in assignment mode.
            </p>
            <button
              type="button"
              onClick={handleDownload}
              className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded bg-emerald-700 px-3 py-1.5 text-[11px] font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <FiDownload aria-hidden />
              Download submission (.esubmit)
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default AssignmentPanel;
