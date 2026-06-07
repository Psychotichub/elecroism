import { describe, expect, it, vi } from 'vitest';
import { parseSentryDsn, sendSentryError } from '../sentryTransport';

describe('sentryTransport', () => {
  it('parses a valid DSN', () => {
    const parsed = parseSentryDsn(
      'https://abc123@o123456.ingest.sentry.io/789'
    );
    expect(parsed).toEqual({
      publicKey: 'abc123',
      host: 'o123456.ingest.sentry.io',
      projectId: '789',
    });
  });

  it('returns null for invalid DSN', () => {
    expect(parseSentryDsn('not-a-dsn')).toBeNull();
  });

  it('posts a scrubbed payload to the Sentry store endpoint', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    const ok = await sendSentryError(
      'https://key@o1.ingest.sentry.io/2',
      {
        eventId: '11111111-2222-3333-4444-555555555555',
        timestamp: '2026-06-07T12:00:00.000Z',
        message: 'Canvas blew up',
        stack: 'Error: Canvas blew up\n    at [path]:1',
        area: 'Canvas',
      },
      fetchImpl
    );
    expect(ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://o1.ingest.sentry.io/api/2/store/');
    expect(init.method).toBe('POST');
    const headers = init.headers as Record<string, string>;
    expect(headers['X-Sentry-Auth']).toContain('sentry_key=key');
    const body = JSON.parse(String(init.body)) as { message: string; tags: { area: string } };
    expect(body.message).toBe('Canvas blew up');
    expect(body.tags.area).toBe('Canvas');
  });
});
