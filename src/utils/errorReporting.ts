import { useCircuitStore } from '../store/circuitStore';
import { useErrorReportingStore } from '../store/errorReportingStore';
import { viteEnvString } from './viteEnv';
import { scrubSensitiveText } from './errorReportScrubber';
import { sendSentryError } from './sentryTransport';

export type ErrorReportKind = 'react' | 'window' | 'unhandledrejection';

export type ErrorReportInput = {
  kind: ErrorReportKind;
  message: string;
  stack?: string;
  area?: string;
  componentStack?: string;
};

export type QueuedErrorReport = ErrorReportInput & {
  id: string;
  capturedAt: number;
};

const QUEUE_KEY = 'electroism.errorReporting.queue.v1';
const MAX_QUEUE = 25;

type ErrorReportingDeps = {
  fetchImpl: typeof fetch;
  isOnline: () => boolean;
  getDsn: () => string | undefined;
  isOptIn: () => boolean;
  onQueueChange: (count: number) => void;
};

let deps: ErrorReportingDeps = {
  fetchImpl: fetch,
  isOnline: () =>
    typeof navigator !== 'undefined' ? navigator.onLine !== false : true,
  getDsn: () => viteEnvString('VITE_SENTRY_DSN'),
  isOptIn: () => useErrorReportingStore.getState().optIn,
  onQueueChange: (count) =>
    useErrorReportingStore.getState().setPendingCount(count),
};

let initialized = false;

export function configureErrorReporting(
  overrides: Partial<ErrorReportingDeps>
): void {
  deps = { ...deps, ...overrides };
}

function scrubContext() {
  const { circuit, project } = useCircuitStore.getState();
  const names = [circuit.name, project?.name].filter(
    (n): n is string => typeof n === 'string' && n.trim().length > 0
  );
  return { projectNames: names };
}

function scrubReport(input: ErrorReportInput): ErrorReportInput {
  const ctx = scrubContext();
  return {
    ...input,
    message: scrubSensitiveText(input.message, ctx),
    stack: input.stack ? scrubSensitiveText(input.stack, ctx) : undefined,
    componentStack: input.componentStack
      ? scrubSensitiveText(input.componentStack, ctx)
      : undefined,
  };
}

function loadQueue(): QueuedErrorReport[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueuedErrorReport[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedErrorReport[]): void {
  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    deps.onQueueChange(queue.length);
  } catch {
    // ignore
  }
}

function syncPendingCount(): void {
  deps.onQueueChange(loadQueue().length);
}

function enqueue(report: QueuedErrorReport): void {
  const queue = loadQueue();
  queue.push(report);
  while (queue.length > MAX_QUEUE) queue.shift();
  saveQueue(queue);
}

async function transmit(report: QueuedErrorReport): Promise<boolean> {
  const dsn = deps.getDsn()?.trim();
  if (!dsn) return false;
  return sendSentryError(
    dsn,
    {
      eventId: report.id,
      timestamp: new Date(report.capturedAt).toISOString(),
      message: report.message,
      stack: report.stack,
      area: report.area,
      componentStack: report.componentStack,
      release: `electroism@${import.meta.env.VITE_APP_VERSION ?? '0.0.0'}`,
    },
    deps.fetchImpl
  );
}

/** Attempt to upload queued reports (newest first, stops on first failure). */
export async function flushErrorReportQueue(): Promise<number> {
  if (!deps.isOptIn()) return 0;
  const dsn = deps.getDsn()?.trim();
  if (!dsn || !deps.isOnline()) return 0;

  const queue = loadQueue();
  if (queue.length === 0) return 0;

  const remaining: QueuedErrorReport[] = [];
  let sent = 0;

  for (let i = 0; i < queue.length; i++) {
    const report = queue[i];
    if (!report) continue;
    try {
      if (await transmit(report)) {
        sent += 1;
      } else {
        remaining.push(...queue.slice(i));
        break;
      }
    } catch {
      remaining.push(...queue.slice(i));
      break;
    }
  }

  saveQueue(remaining);
  return sent;
}

/** Capture a scrubbed error report when the user has opted in. */
export async function captureErrorReport(input: ErrorReportInput): Promise<void> {
  if (!deps.isOptIn()) return;

  const scrubbed = scrubReport(input);
  const report: QueuedErrorReport = {
    ...scrubbed,
    id: crypto.randomUUID(),
    capturedAt: Date.now(),
  };

  const dsn = deps.getDsn()?.trim();
  if (dsn && deps.isOnline()) {
    try {
      const ok = await transmit(report);
      if (ok) return;
    } catch {
      // fall through to queue
    }
  }

  enqueue(report);
}

export function getQueuedErrorReports(): QueuedErrorReport[] {
  return loadQueue();
}

export function clearErrorReportQueue(): void {
  saveQueue([]);
}

function onWindowError(event: ErrorEvent): void {
  void captureErrorReport({
    kind: 'window',
    message: event.message || 'Unhandled error',
    stack: event.error instanceof Error ? event.error.stack : undefined,
  });
}

function onUnhandledRejection(event: PromiseRejectionEvent): void {
  const reason: unknown = event.reason;
  void captureErrorReport({
    kind: 'unhandledrejection',
    message:
      reason instanceof Error
        ? reason.message
        : typeof reason === 'string'
          ? reason
          : 'Unhandled promise rejection',
    stack: reason instanceof Error ? reason.stack : undefined,
  });
}

function onOnline(): void {
  void flushErrorReportQueue();
}

/** Register global listeners once per renderer session. */
export function initErrorReporting(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  syncPendingCount();
  window.addEventListener('error', onWindowError);
  window.addEventListener('unhandledrejection', onUnhandledRejection);
  window.addEventListener('online', onOnline);
}

/** Test helper — tear down listeners and reset init flag. */
export function resetErrorReportingForTests(): void {
  if (typeof window === 'undefined') return;
  window.removeEventListener('error', onWindowError);
  window.removeEventListener('unhandledrejection', onUnhandledRejection);
  window.removeEventListener('online', onOnline);
  initialized = false;
}
