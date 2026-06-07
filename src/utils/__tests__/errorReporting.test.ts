/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCircuitStore } from '../../store/circuitStore';
import { useErrorReportingStore } from '../../store/errorReportingStore';
import {
  captureErrorReport,
  clearErrorReportQueue,
  configureErrorReporting,
  flushErrorReportQueue,
  getQueuedErrorReports,
  resetErrorReportingForTests,
} from '../errorReporting';

const QUEUE_KEY = 'electroism.errorReporting.queue.v1';
const OPT_IN_KEY = 'electroism.errorReporting.optIn.v1';

describe('errorReporting', () => {
  beforeEach(() => {
    localStorage.clear();
    useErrorReportingStore.setState({ optIn: false, pendingCount: 0 });
    useCircuitStore.getState().clearCircuit();
    useCircuitStore.setState({
      circuit: {
        ...useCircuitStore.getState().circuit,
        name: 'Secret Panel 42',
      },
      project: {
        ...useCircuitStore.getState().project,
        name: 'Client Site Alpha',
      },
    });
    configureErrorReporting({
      isOnline: () => true,
      getDsn: () => 'https://key@o1.ingest.sentry.io/2',
      isOptIn: () => useErrorReportingStore.getState().optIn,
      onQueueChange: (count) =>
        useErrorReportingStore.getState().setPendingCount(count),
    });
  });

  afterEach(() => {
    resetErrorReportingForTests();
    clearErrorReportQueue();
    localStorage.clear();
  });

  it('does not queue when opt-in is disabled', async () => {
    await captureErrorReport({
      kind: 'react',
      message: 'Secret Panel 42 failed at C:\\drawings\\site.esim',
    });
    expect(getQueuedErrorReports()).toHaveLength(0);
  });

  it('scrubs project names and paths before queueing', async () => {
    useErrorReportingStore.getState().setOptIn(true);
    configureErrorReporting({
      fetchImpl: vi.fn().mockResolvedValue({ ok: false }),
    });

    await captureErrorReport({
      kind: 'window',
      message: 'Secret Panel 42 failed at C:\\drawings\\site.esim',
      stack: 'Error\n    at C:\\Users\\me\\site.esim:10',
    });

    const queued = getQueuedErrorReports();
    expect(queued).toHaveLength(1);
    expect(queued[0]?.message).not.toContain('Secret Panel 42');
    expect(queued[0]?.message).toContain('[project-name]');
    expect(queued[0]?.stack).toContain('[path]');
    expect(useErrorReportingStore.getState().pendingCount).toBe(1);
  });

  it('sends immediately when online and keeps failures queued', async () => {
    useErrorReportingStore.getState().setOptIn(true);
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    configureErrorReporting({ fetchImpl });

    await captureErrorReport({
      kind: 'react',
      message: 'boom',
      area: 'Toolbar',
    });

    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(getQueuedErrorReports()).toHaveLength(0);

    fetchImpl.mockResolvedValueOnce({ ok: false });
    await captureErrorReport({
      kind: 'react',
      message: 'offline later',
    });
    expect(getQueuedErrorReports()).toHaveLength(1);
  });

  it('flushes queued reports when back online', async () => {
    useErrorReportingStore.getState().setOptIn(true);
    localStorage.setItem(OPT_IN_KEY, '1');
    localStorage.setItem(
      QUEUE_KEY,
      JSON.stringify([
        {
          id: 'a',
          capturedAt: Date.now(),
          kind: 'window',
          message: 'queued',
        },
      ])
    );

    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    configureErrorReporting({ fetchImpl });

    const sent = await flushErrorReportQueue();
    expect(sent).toBe(1);
    expect(getQueuedErrorReports()).toHaveLength(0);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });
});
