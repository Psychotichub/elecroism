import React, { useCallback, useState } from 'react';
import { useErrorReportingStore } from '../../store/errorReportingStore';
import {
  clearErrorReportQueue,
  flushErrorReportQueue,
} from '../../utils/errorReporting';
import { viteEnvString } from '../../utils/viteEnv';
import { AppIcon, Button, Dialog } from '../ui';

const sentryDsn = viteEnvString('VITE_SENTRY_DSN');
const hasSentryDsn = Boolean(sentryDsn?.trim());

const PrivacySettingsDialog: React.FC = () => {
  const open = useErrorReportingStore((s) => s.settingsOpen);
  const setOpen = useErrorReportingStore((s) => s.setSettingsOpen);
  const optIn = useErrorReportingStore((s) => s.optIn);
  const setOptIn = useErrorReportingStore((s) => s.setOptIn);
  const pendingCount = useErrorReportingStore((s) => s.pendingCount);
  const [flushing, setFlushing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleToggle = useCallback(
    async (enabled: boolean) => {
      setOptIn(enabled);
      setStatus(null);
      if (enabled) {
        setFlushing(true);
        try {
          const sent = await flushErrorReportQueue();
          if (sent > 0) {
            setStatus(`Sent ${sent} queued report${sent === 1 ? '' : 's'}.`);
          }
        } finally {
          setFlushing(false);
        }
      }
    },
    [setOptIn]
  );

  const handleFlush = useCallback(async () => {
    setFlushing(true);
    setStatus(null);
    try {
      const sent = await flushErrorReportQueue();
      if (sent === 0) {
        setStatus(
          hasSentryDsn
            ? 'Nothing to send, or you are offline.'
            : 'No reporting endpoint configured in this build.'
        );
      } else {
        setStatus(`Sent ${sent} report${sent === 1 ? '' : 's'}.`);
      }
    } finally {
      setFlushing(false);
    }
  }, []);

  const handleClearQueue = useCallback(() => {
    clearErrorReportQueue();
    setStatus('Cleared local queue.');
  }, []);

  return (
    <Dialog
      open={open}
      title="Privacy & diagnostics"
      titleId="privacy-settings-title"
      onClose={() => setOpen(false)}
      overlayClassName="z-[200]"
      footer={
        <Button variant="primary" onClick={() => setOpen(false)}>
          Done
        </Button>
      }
    >
      <p className="es-typo-body-sm leading-snug text-es-secondary">
        Help improve ElectroSim by sending anonymous crash reports. Project
        names and file paths are removed before anything leaves your device.
        Reporting is off unless you turn it on below.
      </p>

      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-es-md border border-es-borderSubtle p-3">
        <input
          type="checkbox"
          checked={optIn}
          onChange={(e) => void handleToggle(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          <span className="block es-typo-body-sm font-medium text-es-bright">
            Send crash reports
          </span>
          <span className="mt-1 block es-typo-caption leading-snug text-es-secondary">
            Includes error message, stack trace, and which UI area failed. No
            circuit data or drawing content is uploaded.
          </span>
        </span>
      </label>

      {optIn ? (
        <div className="mt-4 rounded-es-md border border-es-borderSubtle p-3 es-typo-caption">
          <p className="text-es-secondary">
            {hasSentryDsn
              ? 'Reports are sent to the configured diagnostics endpoint when online.'
              : 'This build has no remote endpoint configured; reports stay in a local queue until one is set.'}
          </p>
          <p className="mt-2 text-es-bright">
            Queued reports: {pendingCount}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={flushing || pendingCount === 0}
              onClick={() => void handleFlush()}
            >
              <AppIcon
                id="redo"
                size="inline"
                className={flushing ? 'animate-spin' : ''}
              />
              Send queued now
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pendingCount === 0}
              onClick={handleClearQueue}
            >
              Clear queue
            </Button>
          </div>
          {status ? (
            <p className="mt-2 text-es-secondary" role="status">
              {status}
            </p>
          ) : null}
        </div>
      ) : null}
    </Dialog>
  );
};

export default PrivacySettingsDialog;
