import React from 'react';
import type { ComponentPanelDescription } from '../../../utils/componentPanelInfo';
import ComponentHelpPopover from './ComponentHelpPopover';
import { cn } from '../../ui/cn';

export type SelectionHeaderStatus = {
  energized?: boolean;
  faultCount?: number;
  tripped?: boolean;
};

type Props = {
  label: string;
  typeName: string;
  layerLabel: string;
  status: SelectionHeaderStatus;
  helpInfo?: ComponentPanelDescription | null;
};

const SelectionHeaderCard: React.FC<Props> = ({
  label,
  typeName,
  layerLabel,
  status,
  helpInfo,
}) => {
  const { energized, faultCount = 0, tripped = false } = status;

  return (
    <div
      className="es-selection-header-card"
      data-testid="selection-header-card"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate es-typo-title-sm text-es-bright">{label}</p>
        <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
          <p className="truncate es-typo-body-sm text-es-secondary">{typeName}</p>
          {helpInfo ? <ComponentHelpPopover info={helpInfo} /> : null}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="rounded-full border border-es-borderSubtle px-2 py-0.5 es-typo-caption text-es-secondary">
          {layerLabel}
        </span>
        <div className="flex items-center gap-1.5">
          {energized !== undefined ? (
            <span
              className={cn(
                'rounded-full px-2 py-0.5 es-typo-caption font-medium',
                energized
                  ? 'bg-es-success/15 text-es-success'
                  : 'bg-es-chrome2 text-es-secondary'
              )}
            >
              {energized ? 'Energized' : 'Off'}
            </span>
          ) : null}
          {tripped ? (
            <span className="rounded-full bg-es-error/15 px-2 py-0.5 es-typo-caption font-medium text-es-error">
              Tripped
            </span>
          ) : null}
          {faultCount > 0 ? (
            <span className="rounded-full bg-es-warning/15 px-2 py-0.5 es-typo-caption font-medium text-es-warning es-tabular-nums">
              {faultCount} fault{faultCount > 1 ? 's' : ''}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default SelectionHeaderCard;
