import React, { useState } from 'react';
import {
  buildAssignmentDocument,
  downloadAssignmentFile,
} from '../../utils/assignmentMode';
import { listQuizChallenges } from '../../utils/quizChallenges';
import { Button, Dialog, Input, Select } from '../ui';

type Props = {
  onClose: () => void;
  initialChallengeId?: string;
};

const ExportAssignmentDialog: React.FC<Props> = ({
  onClose,
  initialChallengeId,
}) => {
  const challenges = listQuizChallenges();
  const [challengeId, setChallengeId] = useState(
    initialChallengeId ?? challenges[0]?.id ?? ''
  );
  const [courseName, setCourseName] = useState('');
  const [dueDate, setDueDate] = useState('');

  const handleExport = () => {
    const challenge = challenges.find((c) => c.id === challengeId);
    if (!challenge) return;
    const doc = buildAssignmentDocument(challenge, {
      courseName,
      dueDate,
    });
    downloadAssignmentFile(doc);
    onClose();
  };

  return (
    <Dialog
      open
      title="Export classroom assignment"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleExport}
            disabled={!challengeId}
          >
            Download .eassign
          </Button>
        </>
      }
    >
      <p className="text-es-body-sm text-es-secondary">
        Creates a locked <code className="text-es-caption">.eassign</code> file
        with the fault scenario and circuit snapshot. Solution keywords and
        distractors are omitted.
      </p>
      <label className="mt-3 block">
        <span className="es-typo-label text-es-secondary">Challenge</span>
        <Select
          value={challengeId}
          onChange={(e) => setChallengeId(e.target.value)}
          className="mt-1"
        >
          {challenges.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </Select>
      </label>
      <label className="mt-3 block">
        <span className="es-typo-label text-es-secondary">
          Course name (optional)
        </span>
        <Input
          type="text"
          value={courseName}
          onChange={(e) => setCourseName(e.target.value)}
          placeholder="e.g. ELEC 201 — Motor control"
          className="mt-1"
        />
      </label>
      <label className="mt-3 block">
        <span className="es-typo-label text-es-secondary">
          Due date (optional)
        </span>
        <Input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="mt-1"
        />
      </label>
    </Dialog>
  );
};

export default ExportAssignmentDialog;
