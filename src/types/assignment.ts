import type { Circuit } from './index';

export const ASSIGNMENT_FILE_VERSION = '1.0';
export const SUBMISSION_FILE_VERSION = '1.0';

/** Instructor-distributed challenge snapshot — no solution hints. */
export type AssignmentFileDocument = {
  kind: 'electrosim-assignment';
  version: typeof ASSIGNMENT_FILE_VERSION;
  id: string;
  /** Internal id for the grading pipeline (not shown in the student UI). */
  challengeId: string;
  title: string;
  scenario: string;
  question: string;
  targetLabel: string;
  circuit: Circuit;
  courseName?: string;
  instructorNotes?: string;
  dueDate?: string;
  exportedAt: string;
  locked: true;
};

/** Student hand-in file produced after submitting a diagnosis. */
export type SubmissionFileDocument = {
  kind: 'electrosim-submission';
  version: typeof SUBMISSION_FILE_VERSION;
  assignmentId: string;
  challengeId: string;
  assignmentTitle: string;
  studentName: string;
  studentId?: string;
  answer: string;
  submittedAt: string;
};

export type GradedSubmissionRow = {
  studentName: string;
  studentId: string;
  assignmentTitle: string;
  assignmentId: string;
  answer: string;
  correct: boolean;
  score: number;
  feedback: string;
  submittedAt: string;
};

/** In-memory session opened from an assignment file (student-facing fields only). */
export type AssignmentSession = {
  assignmentId: string;
  challengeId: string;
  title: string;
  scenario: string;
  question: string;
  targetLabel: string;
  courseName?: string;
  dueDate?: string;
};
