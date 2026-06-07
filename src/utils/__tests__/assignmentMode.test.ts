import { describe, expect, it } from 'vitest';
import { getQuizChallenge } from '../quizChallenges';
import {
  ASSIGNMENT_FILE_VERSION,
  SUBMISSION_FILE_VERSION,
} from '../../types/assignment';
import {
  assignmentToSession,
  buildAssignmentDocument,
  buildSubmissionDocument,
  gradeSubmission,
  gradedSubmissionsToCsv,
  parseAssignmentDocument,
  parseSubmissionDocument,
} from '../assignmentMode';

describe('assignmentMode', () => {
  const challenge = getQuizChallenge('dol-mcb-off')!;

  it('builds assignment files without solution hints', () => {
    const doc = buildAssignmentDocument(challenge, {
      courseName: 'ELEC 201',
    });
    const raw = JSON.stringify(doc);
    expect(raw).not.toContain('acceptedKeywords');
    expect(raw).not.toContain('distractors');
    expect(doc.kind).toBe('electrosim-assignment');
    expect(doc.version).toBe(ASSIGNMENT_FILE_VERSION);
    expect(doc.locked).toBe(true);
    expect(doc.circuit.components.length).toBeGreaterThan(0);
  });

  it('round-trips assignment and submission documents', () => {
    const assignment = buildAssignmentDocument(challenge);
    expect(parseAssignmentDocument(assignment)).toEqual(assignment);

    const session = assignmentToSession(assignment);
    const submission = buildSubmissionDocument({
      assignment: session,
      studentName: 'Alex Kim',
      studentId: 'A123',
      answer: 'Q1 is OFF — circuit open upstream.',
    });
    expect(parseSubmissionDocument(submission)).toEqual(submission);
    expect(submission.version).toBe(SUBMISSION_FILE_VERSION);
  });

  it('grades correct and incorrect submissions', () => {
    const assignment = buildAssignmentDocument(challenge);
    const session = assignmentToSession(assignment);

    const correct = buildSubmissionDocument({
      assignment: session,
      studentName: 'Alex',
      answer: 'Q1 is OFF — circuit open upstream.',
    });
    const wrong = buildSubmissionDocument({
      assignment: session,
      studentName: 'Sam',
      answer: 'Motor winding failed.',
    });

    expect(gradeSubmission(correct)?.correct).toBe(true);
    expect(gradeSubmission(correct)?.score).toBeGreaterThanOrEqual(90);
    expect(gradeSubmission(wrong)?.correct).toBe(false);
  });

  it('produces a CSV grade report', () => {
    const assignment = buildAssignmentDocument(challenge);
    const session = assignmentToSession(assignment);
    const row = gradeSubmission(
      buildSubmissionDocument({
        assignment: session,
        studentName: 'Alex',
        answer: 'Q1 is OFF — circuit open upstream.',
      })
    )!;
    const csv = gradedSubmissionsToCsv([row]);
    expect(csv).toContain('studentName');
    expect(csv).toContain('Alex');
    expect(csv).toContain('score');
  });
});
