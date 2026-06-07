import { describe, expect, it } from 'vitest';
import { scrubSensitiveText } from '../errorReportScrubber';

describe('scrubSensitiveText', () => {
  it('replaces project names', () => {
    const out = scrubSensitiveText('Failed to open Panel-Alpha v2', {
      projectNames: ['Panel-Alpha v2'],
    });
    expect(out).toBe('Failed to open [project-name]');
  });

  it('replaces Windows and Unix paths', () => {
    const out = scrubSensitiveText(
      'at C:\\Users\\alice\\Projects\\site.esim:12\nat /home/bob/drawings/main.json:4'
    );
    expect(out).not.toContain('alice');
    expect(out).not.toContain('/home/bob');
    expect(out).toContain('[path]');
  });

  it('replaces file URLs', () => {
    const out = scrubSensitiveText('load file:///C:/secret/drawing.esim failed');
    expect(out).toBe('load [file-url] failed');
  });
});
