import { describe, expect, it } from 'vitest';
import {
  firstProjectFile,
  isExternalProjectFileDrag,
  isProjectFileName,
} from '../projectOpen';

describe('projectOpen', () => {
  it('recognizes project file extensions', () => {
    expect(isProjectFileName('feeder.eproj')).toBe(true);
    expect(isProjectFileName('legacy.esim')).toBe(true);
    expect(isProjectFileName('backup.json')).toBe(true);
    expect(isProjectFileName('notes.txt')).toBe(false);
  });

  it('picks the first project file from a list', () => {
    const files = [
      new File(['{}'], 'readme.txt', { type: 'text/plain' }),
      new File(['{}'], 'panel.eproj', { type: 'application/json' }),
    ];
    expect(firstProjectFile(files)?.name).toBe('panel.eproj');
  });

  it('detects external file drags but not palette drags', () => {
    const fileDrag = {
      dataTransfer: {
        types: ['Files'],
        items: [],
        files: { length: 0 },
      },
      preventDefault: () => undefined,
    } as unknown as DragEvent;
    expect(isExternalProjectFileDrag(fileDrag)).toBe(true);

    const paletteDrag = {
      dataTransfer: {
        types: ['Files', 'componentType'],
        items: [],
        files: { length: 0 },
      },
      preventDefault: () => undefined,
    } as unknown as DragEvent;
    expect(isExternalProjectFileDrag(paletteDrag)).toBe(false);
  });
});
