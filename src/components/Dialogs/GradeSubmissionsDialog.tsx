import React, { useState } from 'react';
import { useUiStore } from '../../store/uiStore';
import type { GradedSubmissionRow } from '../../types/assignment';
import {
  downloadGradeReportCsv,
  gradeSubmissions,
  parseSubmissionDocument,
  SUBMISSION_FILE_ACCEPT,
} from '../../utils/assignmentMode';
import { readProjectFileAsText } from '../../utils/projectOpen';
import { AppIcon, Button, Dialog, PanelDataTable } from '../ui';

const GradeSubmissionsDialog: React.FC = () => {
  const open = useUiStore((s) => s.gradeSubmissionsOpen);
  const setOpen = useUiStore((s) => s.setGradeSubmissionsOpen);
  const [rows, setRows] = useState<GradedSubmissionRow[]>([]);
  const [skipped, setSkipped] = useState(0);

  const handleClose = () => {
    setOpen(false);
    setRows([]);
    setSkipped(0);
  };

  const handlePickFiles = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = SUBMISSION_FILE_ACCEPT;
    input.multiple = true;
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files?.length) return;
      const submissions = [];
      let bad = 0;
      for (const file of Array.from(files)) {
        try {
          const text = await readProjectFileAsText(file);
          const doc = parseSubmissionDocument(JSON.parse(text) as unknown);
          if (doc) submissions.push(doc);
          else bad += 1;
        } catch {
          bad += 1;
        }
      }
      setRows(gradeSubmissions(submissions));
      setSkipped(bad);
    };
    input.click();
  };

  const handleDownloadCsv = () => {
    if (rows.length === 0) return;
    const title = rows[0]?.assignmentTitle ?? 'assignment';
    downloadGradeReportCsv(rows, title);
  };

  const avg =
    rows.length > 0
      ? Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length)
      : 0;

  return (
    <Dialog
      open={open}
      title="Grade submission files"
      titleId="grade-submissions-title"
      onClose={handleClose}
      maxWidth="lg"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose}>
            Close
          </Button>
          <Button
            variant="primary"
            onClick={handleDownloadCsv}
            disabled={rows.length === 0}
          >
            <AppIcon id="download" size="inline" />
            Download CSV report
          </Button>
        </>
      }
    >
      <p className="es-typo-body-sm text-es-secondary">
        Import student <code className="es-typo-caption">.esubmit</code> files.
        Answers are auto-graded against the simulation engine (same rules as
        challenge mode).
      </p>
      <Button
        type="button"
        variant="secondary"
        className="mt-3"
        onClick={handlePickFiles}
      >
        Select submission files…
      </Button>
      {rows.length > 0 ? (
        <div className="mt-3 space-y-2">
          <p className="es-typo-body-sm text-es-bright">
            {rows.length} graded · class average {avg}%
            {skipped > 0 ? ` · ${skipped} file(s) skipped` : ''}
          </p>
          <PanelDataTable minWidth={360}>
            <thead className="es-table-sticky-head">
              <tr>
                <th>Student</th>
                <th className="es-table-num">Score</th>
                <th>Correct</th>
                <th>Answer</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.studentName}-${i}`}>
                  <td className="font-medium">{r.studentName}</td>
                  <td className="es-table-num">{r.score}%</td>
                  <td>{r.correct ? 'Yes' : 'No'}</td>
                  <td
                    className="max-w-[12rem] truncate es-typo-caption text-es-secondary"
                    title={r.answer}
                  >
                    {r.answer}
                  </td>
                </tr>
              ))}
            </tbody>
          </PanelDataTable>
        </div>
      ) : null}
    </Dialog>
  );
};

export default GradeSubmissionsDialog;
