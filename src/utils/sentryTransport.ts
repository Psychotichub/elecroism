export type ParsedSentryDsn = {
  publicKey: string;
  host: string;
  projectId: string;
};

export type SentryErrorPayload = {
  eventId: string;
  timestamp: string;
  message: string;
  stack?: string;
  area?: string;
  componentStack?: string;
  release?: string;
};

/** Parse a Sentry DSN (`https://key@host/project`). */
export function parseSentryDsn(dsn: string): ParsedSentryDsn | null {
  try {
    const url = new URL(dsn);
    const publicKey = decodeURIComponent(url.username);
    const projectId = url.pathname.replace(/^\//, '');
    if (!publicKey || !projectId || !url.host) return null;
    return { publicKey, host: url.host, projectId };
  } catch {
    return null;
  }
}

function sentryStoreUrl(parsed: ParsedSentryDsn): string {
  return `https://${parsed.host}/api/${parsed.projectId}/store/`;
}

function sentryAuthHeader(parsed: ParsedSentryDsn): string {
  const ts = Math.floor(Date.now() / 1000);
  return `Sentry sentry_version=7, sentry_timestamp=${ts}, sentry_key=${parsed.publicKey}, sentry_client=electroism/1.0`;
}

function stackFrames(stack: string | undefined) {
  if (!stack) return undefined;
  const lines = stack.split('\n').slice(1);
  const frames = lines
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/at\s+(.*?)(?:\s+\((.*)\))?$/);
      return {
        filename: match?.[2] ?? match?.[1] ?? line,
        function: match?.[1] ?? '?',
      };
    });
  return frames.length ? { frames: frames.reverse() } : undefined;
}

export async function sendSentryError(
  dsn: string,
  payload: SentryErrorPayload,
  fetchImpl: typeof fetch = fetch
): Promise<boolean> {
  const parsed = parseSentryDsn(dsn);
  if (!parsed) return false;

  const body = {
    event_id: payload.eventId.replace(/-/g, ''),
    timestamp: payload.timestamp,
    platform: 'javascript',
    level: 'error',
    message: payload.message,
    release: payload.release,
    tags: payload.area ? { area: payload.area } : undefined,
    extra: payload.componentStack
      ? { componentStack: payload.componentStack }
      : undefined,
    exception: {
      values: [
        {
          type: 'Error',
          value: payload.message,
          stacktrace: stackFrames(payload.stack),
        },
      ],
    },
  };

  const response = await fetchImpl(sentryStoreUrl(parsed), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Sentry-Auth': sentryAuthHeader(parsed),
    },
    body: JSON.stringify(body),
  });

  return response.ok;
}
