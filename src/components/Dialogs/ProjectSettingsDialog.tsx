import React, { useCallback, useState } from 'react';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import { useUiStore } from '../../store/uiStore';
import { useCircuitStore } from '../../store/circuitStore';
import type {
  ProjectTitleBlock,
  RevisionHistoryEntry,
} from '../../types/project';
import { resolvedProjectTitleBlock } from '../../utils/projectTitleBlock';
import { Button, Dialog, Input } from '../ui';

const emptyRevisionRow = (): RevisionHistoryEntry => ({
  revision: '',
  date: new Date().toLocaleDateString(),
  description: '',
});

type FormProps = {
  initial: ProjectTitleBlock;
  formId: string;
  onSave: (draft: ProjectTitleBlock) => void;
};

const ProjectSettingsForm: React.FC<FormProps> = ({
  initial,
  formId,
  onSave,
}) => {
  const [draft, setDraft] = useState<ProjectTitleBlock>({
    ...initial,
    revisionHistory: [...(initial.revisionHistory ?? [])],
  });

  const updateField = useCallback(
    (key: keyof ProjectTitleBlock, value: string) => {
      setDraft((d) => ({ ...d, [key]: value }));
    },
    []
  );

  const updateHistory = useCallback(
    (index: number, patch: Partial<RevisionHistoryEntry>) => {
      setDraft((d) => {
        const history = [...(d.revisionHistory ?? [])];
        history[index] = { ...history[index], ...patch };
        return { ...d, revisionHistory: history };
      });
    },
    []
  );

  const addHistoryRow = useCallback(() => {
    setDraft((d) => ({
      ...d,
      revisionHistory: [...(d.revisionHistory ?? []), emptyRevisionRow()],
    }));
  }, []);

  const removeHistoryRow = useCallback((index: number) => {
    setDraft((d) => ({
      ...d,
      revisionHistory: (d.revisionHistory ?? []).filter((_, i) => i !== index),
    }));
  }, []);

  const recordCurrentRevision = useCallback(() => {
    const entry: RevisionHistoryEntry = {
      revision: draft.revision?.trim() || 'A',
      date: new Date().toLocaleDateString(),
      description: 'Issue update',
      drawnBy: draft.drawnBy,
      checkedBy: draft.checkedBy,
      approvedBy: draft.approvedBy,
    };
    setDraft((d) => ({
      ...d,
      revisionHistory: [...(d.revisionHistory ?? []), entry],
    }));
  }, [draft]);

  const field = (
    id: string,
    label: string,
    value: string | undefined,
    onChange: (v: string) => void,
    placeholder?: string
  ) => (
    <div className="es-form-field">
      <label htmlFor={id} className="es-typo-label text-es-secondary">
        {label}
      </label>
      <Input
        id={id}
        type="text"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="es-typo-body-sm"
      />
    </div>
  );

  return (
    <form
      id={formId}
      onSubmit={(e) => {
        e.preventDefault();
        onSave(draft);
      }}
    >
      <p className="mb-3 es-typo-body-sm leading-snug text-es-secondary">
        These fields apply to every sheet in the project and appear on exported
        PDF title blocks, including revision history (last four entries shown).
      </p>

      {draft.logoUrl ? (
        <div className="mb-3 flex items-center gap-3 rounded-es-md border border-es-borderSubtle p-2">
          <img
            src={draft.logoUrl}
            alt=""
            className="h-10 w-10 shrink-0 object-contain"
          />
          <div className="min-w-0">
            <p className="es-typo-body-sm font-semibold text-es-bright">
              {draft.brandName || 'Organization brand'}
            </p>
            <p className="truncate es-typo-caption text-es-secondary">
              {draft.logoUrl}
            </p>
          </div>
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-2 gap-3">
        {field('ps-brand', 'Brand / organization', draft.brandName, (v) =>
          updateField('brandName', v)
        )}
        {field('ps-logo', 'Logo URL', draft.logoUrl, (v) =>
          updateField('logoUrl', v), '/templates/your-logo.svg')}
        {field('ps-client', 'Client / site', draft.client, (v) =>
          updateField('client', v)
        )}
        {field('ps-drawing', 'Drawing number', draft.drawingNumber, (v) =>
          updateField('drawingNumber', v)
        )}
        {field('ps-rev', 'Revision', draft.revision, (v) =>
          updateField('revision', v)
        )}
        {field('ps-scale', 'Scale', draft.scale, (v) =>
          updateField('scale', v), 'NTS')}
        {field('ps-drawn', 'Drawn by', draft.drawnBy, (v) =>
          updateField('drawnBy', v)
        )}
        {field('ps-checked', 'Checked by', draft.checkedBy, (v) =>
          updateField('checkedBy', v)
        )}
        {field('ps-approved', 'Approved by', draft.approvedBy, (v) =>
          updateField('approvedBy', v)
        )}
      </div>

      <div className="mb-2 flex items-center justify-between">
        <span className="es-typo-label uppercase text-es-secondary">
          Revision history
        </span>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={recordCurrentRevision}
          >
            Record current rev
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={addHistoryRow}>
            <FiPlus aria-hidden />
            Add row
          </Button>
        </div>
      </div>

      {(draft.revisionHistory ?? []).length === 0 ? (
        <p className="es-typo-caption text-es-secondary">
          No revision records yet. Use &quot;Record current rev&quot; when
          issuing a new drawing revision.
        </p>
      ) : (
        <div className="space-y-2">
          {(draft.revisionHistory ?? []).map((row, index) => (
            <div
              key={`rev-${index}`}
              className="grid grid-cols-[3rem_5.5rem_1fr_4rem_4rem_4rem_auto] items-end gap-1 rounded-es-md border border-es-borderSubtle p-2"
            >
              <Input
                type="text"
                value={row.revision}
                onChange={(e) =>
                  updateHistory(index, { revision: e.target.value })
                }
                placeholder="Rev"
                className="es-typo-caption"
                title="Revision"
              />
              <Input
                type="text"
                value={row.date}
                onChange={(e) => updateHistory(index, { date: e.target.value })}
                placeholder="Date"
                className="es-typo-caption"
                title="Date"
              />
              <Input
                type="text"
                value={row.description}
                onChange={(e) =>
                  updateHistory(index, { description: e.target.value })
                }
                placeholder="Description"
                className="es-typo-caption"
                title="Description"
              />
              <Input
                type="text"
                value={row.drawnBy ?? ''}
                onChange={(e) =>
                  updateHistory(index, { drawnBy: e.target.value })
                }
                placeholder="Drawn"
                className="es-typo-caption"
                title="Drawn by"
              />
              <Input
                type="text"
                value={row.checkedBy ?? ''}
                onChange={(e) =>
                  updateHistory(index, { checkedBy: e.target.value })
                }
                placeholder="Chk"
                className="es-typo-caption"
                title="Checked by"
              />
              <Input
                type="text"
                value={row.approvedBy ?? ''}
                onChange={(e) =>
                  updateHistory(index, { approvedBy: e.target.value })
                }
                placeholder="App"
                className="es-typo-caption"
                title="Approved by"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeHistoryRow(index)}
                title="Remove row"
                aria-label="Remove revision row"
                className="text-es-error"
              >
                <FiTrash2 size={14} />
              </Button>
            </div>
          ))}
        </div>
      )}

    </form>
  );
};

const PROJECT_SETTINGS_FORM_ID = 'project-settings-form';

const ProjectSettingsDialog: React.FC = () => {
  const open = useUiStore((s) => s.projectSettingsOpen);
  const setOpen = useUiStore((s) => s.setProjectSettingsOpen);
  const project = useCircuitStore((s) => s.project);
  const circuit = useCircuitStore((s) => s.circuit);
  const setProjectTitleBlock = useCircuitStore((s) => s.setProjectTitleBlock);

  const handleSave = useCallback(
    (draft: ProjectTitleBlock) => {
      setProjectTitleBlock(draft);
      setOpen(false);
    },
    [setProjectTitleBlock, setOpen]
  );

  const initial = resolvedProjectTitleBlock(project, circuit);
  const formKey = `${project.updatedAt}-${circuit.updatedAt}`;

  return (
    <Dialog
      open={open}
      title="Project settings — title block"
      titleId="project-settings-title"
      onClose={() => setOpen(false)}
      maxWidth="lg"
      overlayClassName="z-[200]"
      className="max-h-[90vh]"
      footer={
        <>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" form={PROJECT_SETTINGS_FORM_ID} variant="primary">
            Save to all sheets
          </Button>
        </>
      }
    >
      <ProjectSettingsForm
        key={formKey}
        formId={PROJECT_SETTINGS_FORM_ID}
        initial={initial}
        onSave={handleSave}
      />
    </Dialog>
  );
};

export default ProjectSettingsDialog;
