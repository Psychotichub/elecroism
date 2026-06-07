import React from 'react';
import type { CircuitValidationSeverity } from '../../utils/circuitDesignValidation';
import type { SemanticIconId } from '../../design/icons';
import AppIcon from './AppIcon';
import { cn } from './cn';

const SEVERITY_CLASS: Record<CircuitValidationSeverity, string> = {
  error: 'es-validation-issue-error',
  warning: 'es-validation-issue-warning',
  info: 'es-validation-issue-info',
};

const SEVERITY_ICON: Record<CircuitValidationSeverity, SemanticIconId> = {
  error: 'validation-error',
  warning: 'validation-warning',
  info: 'validation-info',
};

const SEVERITY_ICON_COLOR: Record<CircuitValidationSeverity, string> = {
  error: 'text-es-error',
  warning: 'text-es-warning',
  info: 'text-es-accent',
};

type Props = {
  severity: CircuitValidationSeverity;
  message: React.ReactNode;
  focusLabel?: string;
  onFocus?: () => void;
  disabled?: boolean;
  hint?: React.ReactNode;
  className?: string;
};

const ValidationIssueRow: React.FC<Props> = ({
  severity,
  message,
  focusLabel,
  onFocus,
  disabled = false,
  hint,
  className,
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onFocus}
    data-testid="validation-issue-row"
    data-severity={severity}
    className={cn(
      'es-validation-issue-row es-focus-ring',
      SEVERITY_CLASS[severity],
      disabled && 'es-validation-issue-disabled',
      className
    )}
  >
    <span className={cn('es-validation-issue-icon', SEVERITY_ICON_COLOR[severity])}>
      <AppIcon id={SEVERITY_ICON[severity]} size="inline" />
    </span>
    <span className="es-validation-issue-body">
      <span className="es-validation-issue-message es-typo-body-sm text-es-primary">
        {message}
      </span>
      {focusLabel ? (
        <span className="es-validation-issue-focus es-typo-caption text-es-secondary">
          {focusLabel}
        </span>
      ) : null}
      {hint ? (
        <span className="es-validation-issue-hint es-typo-caption text-es-primary">
          {hint}
        </span>
      ) : null}
    </span>
  </button>
);

export default ValidationIssueRow;
