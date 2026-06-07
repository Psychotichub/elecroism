import { v4 as uuid } from 'uuid';
import { CircuitEngine } from '../simulation/engine';
import type { Circuit } from '../types';
import type {
  AssignmentFileDocument,
  AssignmentSession,
  GradedSubmissionRow,
  SubmissionFileDocument,
} from '../types/assignment';
import {
  ASSIGNMENT_FILE_VERSION,
  SUBMISSION_FILE_VERSION,
} from '../types/assignment';
import {
  buildChallengeQuiz,
  gradeChallengeAnswer,
} from './quizChallengeRuntime';
import { getQuizChallenge, type QuizChallenge } from './quizChallenges';

export const ASSIGNMENT_FILE_ACCEPT = '.eassign,.json';
export const SUBMISSION_FILE_ACCEPT = '.esubmit,.json';

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function isAssignmentFileName(name: string): boolean {
  return name.toLowerCase().endsWith('.eassign');
}

export function isSubmissionFileName(name: string): boolean {
  return name.toLowerCase().endsWith('.esubmit');
}

export function buildAssignmentDocument(
  challenge: QuizChallenge,
  options?: {
    courseName?: string;
    dueDate?: string;
    instructorNotes?: string;
  }
): AssignmentFileDocument {
  return {
    kind: 'electrosim-assignment',
    version: ASSIGNMENT_FILE_VERSION,
    id: uuid(),
    challengeId: challenge.id,
    title: challenge.title,
    scenario: challenge.scenario,
    question: challenge.question,
    targetLabel: challenge.targetLabel,
    circuit: structuredClone(challenge.build()),
    courseName: options?.courseName?.trim() || undefined,
    dueDate: options?.dueDate?.trim() || undefined,
    instructorNotes: options?.instructorNotes?.trim() || undefined,
    exportedAt: new Date().toISOString(),
    locked: true,
  };
}

export function parseAssignmentDocument(
  data: unknown
): AssignmentFileDocument | null {
  if (!data || typeof data !== 'object') return null;
  const doc = data as Record<string, unknown>;
  if (doc.kind !== 'electrosim-assignment') return null;
  if (doc.version !== ASSIGNMENT_FILE_VERSION) return null;
  if (typeof doc.id !== 'string' || typeof doc.challengeId !== 'string') {
    return null;
  }
  if (
    typeof doc.title !== 'string' ||
    typeof doc.scenario !== 'string' ||
    typeof doc.question !== 'string' ||
    typeof doc.targetLabel !== 'string'
  ) {
    return null;
  }
  if (!doc.circuit || typeof doc.circuit !== 'object') return null;
  if (doc.locked !== true) return null;
  return doc as AssignmentFileDocument;
}

export function assignmentToSession(
  doc: AssignmentFileDocument
): AssignmentSession {
  return {
    assignmentId: doc.id,
    challengeId: doc.challengeId,
    title: doc.title,
    scenario: doc.scenario,
    question: doc.question,
    targetLabel: doc.targetLabel,
    courseName: doc.courseName,
    dueDate: doc.dueDate,
  };
}

export function parseSubmissionDocument(
  data: unknown
): SubmissionFileDocument | null {
  if (!data || typeof data !== 'object') return null;
  const doc = data as Record<string, unknown>;
  if (doc.kind !== 'electrosim-submission') return null;
  if (doc.version !== SUBMISSION_FILE_VERSION) return null;
  if (typeof doc.assignmentId !== 'string') return null;
  if (typeof doc.challengeId !== 'string') return null;
  if (typeof doc.assignmentTitle !== 'string') return null;
  if (typeof doc.studentName !== 'string' || !doc.studentName.trim()) {
    return null;
  }
  if (typeof doc.answer !== 'string') return null;
  if (typeof doc.submittedAt !== 'string') return null;
  return doc as SubmissionFileDocument;
}

export function buildSubmissionDocument(params: {
  assignment: AssignmentSession;
  studentName: string;
  studentId?: string;
  answer: string;
}): SubmissionFileDocument {
  return {
    kind: 'electrosim-submission',
    version: SUBMISSION_FILE_VERSION,
    assignmentId: params.assignment.assignmentId,
    challengeId: params.assignment.challengeId,
    assignmentTitle: params.assignment.title,
    studentName: params.studentName.trim(),
    studentId: params.studentId?.trim() || undefined,
    answer: params.answer.trim(),
    submittedAt: new Date().toISOString(),
  };
}

export function downloadAssignmentFile(doc: AssignmentFileDocument) {
  const safe =
    doc.title.replace(/[^\w-]+/g, '_').slice(0, 60) || 'assignment';
  downloadJson(`${safe}.eassign`, doc);
}

export function downloadSubmissionFile(doc: SubmissionFileDocument) {
  const safe =
    doc.studentName.replace(/[^\w-]+/g, '_').slice(0, 40) || 'submission';
  const stamp = doc.submittedAt.slice(0, 10);
  downloadJson(`${safe}-${stamp}.esubmit`, doc);
}

const engine = new CircuitEngine();

export function gradeSubmission(
  submission: SubmissionFileDocument
): GradedSubmissionRow | null {
  const challenge = getQuizChallenge(submission.challengeId);
  if (!challenge) return null;

  const circuit = challenge.build();
  const simulationResult = engine.simulate(circuit);
  const quiz = buildChallengeQuiz(challenge, circuit, simulationResult);
  const grade = gradeChallengeAnswer(
    challenge,
    submission.answer,
    quiz.engineExplanation,
    quiz.correctAnswer
  );

  return {
    studentName: submission.studentName,
    studentId: submission.studentId ?? '',
    assignmentTitle: submission.assignmentTitle,
    assignmentId: submission.assignmentId,
    answer: submission.answer,
    correct: grade.correct,
    score: grade.score,
    feedback: grade.feedback,
    submittedAt: submission.submittedAt,
  };
}

export function gradeSubmissions(
  submissions: SubmissionFileDocument[]
): GradedSubmissionRow[] {
  const rows: GradedSubmissionRow[] = [];
  for (const submission of submissions) {
    const row = gradeSubmission(submission);
    if (row) rows.push(row);
  }
  return rows;
}

const GRADE_HEADER: (keyof GradedSubmissionRow)[] = [
  'studentName',
  'studentId',
  'assignmentTitle',
  'assignmentId',
  'answer',
  'correct',
  'score',
  'feedback',
  'submittedAt',
];

export function gradedSubmissionsToCsv(rows: GradedSubmissionRow[]): string {
  const lines = [
    GRADE_HEADER.join(','),
    ...rows.map((r) =>
      GRADE_HEADER.map((k) => csvEscape(String(r[k]))).join(',')
    ),
  ];
  return lines.join('\r\n');
}

export function downloadGradeReportCsv(
  rows: GradedSubmissionRow[],
  baseFileName: string
) {
  const csv = gradedSubmissionsToCsv(rows);
  const safe = baseFileName.replace(/[^\w-]+/g, '_').slice(0, 60) || 'grades';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safe}-report.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function openAssignmentDocument(
  doc: AssignmentFileDocument,
  actions: {
    loadCircuit: (circuit: Circuit) => void;
    runSimulation: () => void;
    setSelected: (id: string | null) => void;
    startAssignment: (session: AssignmentSession) => void;
    setLearningMode: (on: boolean) => void;
  }
): boolean {
  const session = assignmentToSession(doc);
  actions.loadCircuit(structuredClone(doc.circuit));
  actions.runSimulation();
  const target = doc.circuit.components.find(
    (c) => c.label === doc.targetLabel
  );
  if (target) actions.setSelected(target.id);
  actions.setLearningMode(true);
  actions.startAssignment(session);
  return true;
}
