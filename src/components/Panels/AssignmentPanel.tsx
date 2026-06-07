import React from 'react';
import { FiBookOpen, FiDownload } from 'react-icons/fi';
import { useUiStore } from '../../store/uiStore';
import {
  buildSubmissionDocument,
  downloadSubmissionFile,
} from '../../utils/assignmentMode';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import LearningPanelShell from './learning/LearningPanelShell';

type Props = {
  docked?: boolean;
};

const AssignmentPanel: React.FC<Props> = ({ docked = false }) => {
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
    <LearningPanelShell
      ariaLabel={`Assignment: ${assignment.title}`}
      eyebrow="Classroom assignment"
      title={assignment.title}
      docked={docked}
      pinned={pinned}
      minimized={minimized}
      onTogglePin={toggleLearningPanelPinned}
      onMinimize={toggleLearningPanelMinimized}
      onRestore={() => setLearningPanelMinimized(false)}
      onClose={exitAssignment}
      meta={
        assignment.courseName ? (
          <p className="es-typo-caption text-es-secondary">
            {assignment.courseName}
            {assignment.dueDate ? ` · due ${assignment.dueDate}` : ''}
          </p>
        ) : undefined
      }
    >
      <p className="es-typo-body-sm leading-relaxed">{assignment.scenario}</p>
      <p className="es-typo-body font-semibold text-es-bright">
        <FiBookOpen className="mr-1 inline opacity-70" aria-hidden />
        {assignment.question}
      </p>

      {!submitted ? (
        <>
          <label className="block es-form-field">
            <span className="es-typo-caption text-es-secondary">Your name</span>
            <Input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="Student name"
              className="mt-1"
            />
          </label>
          <label className="block es-form-field">
            <span className="es-typo-caption text-es-secondary">
              Student ID (optional)
            </span>
            <Input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="ID or email"
              className="mt-1"
            />
          </label>
          <label className="block es-form-field">
            <span className="es-typo-caption text-es-secondary">Diagnosis</span>
            <Textarea
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              rows={3}
              placeholder="Describe the root cause in your own words"
              className="mt-1"
            />
          </label>
          <Button
            variant="primary"
            className="w-full"
            onClick={handleSubmit}
            disabled={!studentName.trim() || !freeText.trim()}
          >
            Submit assignment
          </Button>
          <p className="es-typo-caption text-es-secondary">
            Hints and model answers are hidden. Your instructor will grade
            exported submission files.
          </p>
        </>
      ) : (
        <div
          className="rounded-es-sm border border-es-success bg-es-success/10 px-3 py-2 es-typo-body-sm leading-relaxed text-es-success"
          role="status"
        >
          <p className="font-semibold">Submitted</p>
          <p className="mt-1">
            Download your submission file and send it to your instructor.
            Scores are not shown in assignment mode.
          </p>
          <Button
            variant="primary"
            className="mt-2 w-full bg-es-success text-white hover:opacity-90"
            onClick={handleDownload}
          >
            <FiDownload aria-hidden />
            Download submission (.esubmit)
          </Button>
        </div>
      )}
    </LearningPanelShell>
  );
};

export default AssignmentPanel;
