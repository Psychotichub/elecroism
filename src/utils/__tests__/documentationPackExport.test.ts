import { describe, expect, it } from 'vitest';
import { createEmptyCircuit } from '../../store/circuitDefaults';
import { makeComponent, makeCircuit, wire } from '../../simulation/__tests__/testHelpers';
import {
  buildDocumentationPackManifest,
  formatDocumentationPackReadme,
} from '../documentationPackExport';

describe('documentationPackExport', () => {
  it('lists all schedule files in manifest', () => {
    const circuit = createEmptyCircuit();
    circuit.name = 'MCC-01';
    const manifest = buildDocumentationPackManifest(circuit, null, circuit.name);
    const names = manifest.filter((e) => e.included).map((e) => e.fileName);
    expect(names).toContain('MCC-01-drawing.pdf');
    expect(names).toContain('MCC-01-wire-schedule.csv');
    expect(names).toContain('MCC-01-bom.csv');
    expect(names).toContain('MCC-01-terminal-schedule.csv');
    expect(names).toContain('MCC-01-cable-schedule.csv');
  });

  it('skips coordination PDF when no protection devices', () => {
    const circuit = createEmptyCircuit();
    circuit.components.push(makeComponent('lamp', { label: 'L1' }));
    const manifest = buildDocumentationPackManifest(circuit, null, 'Test');
    const coord = manifest.find((e) => e.fileName.endsWith('-coordination-study.pdf'));
    expect(coord?.included).toBe(false);
    expect(coord?.skipReason).toMatch(/protection devices/i);
  });

  it('includes coordination PDF when MCB present', () => {
    const src = makeComponent('power_source', { state: 'on' });
    const mcb = makeComponent('mcb', { label: 'Q1', state: 'on' });
    const circuit = makeCircuit([src, mcb], [wire(src, 'L_OUT', mcb, '1')]);
    const manifest = buildDocumentationPackManifest(circuit, null, 'Test');
    const coord = manifest.find((e) => e.fileName.endsWith('-coordination-study.pdf'));
    expect(coord?.included).toBe(true);
  });

  it('formats README with timestamp and contents', () => {
    const manifest = buildDocumentationPackManifest(
      createEmptyCircuit(),
      null,
      'Demo'
    );
    const text = formatDocumentationPackReadme(
      'Site A',
      'Sheet 1',
      '2026-06-07T12:00:00.000Z',
      manifest
    );
    expect(text).toContain('ElectroSim — Documentation pack');
    expect(text).toContain('Project: Site A');
    expect(text).toContain('Active sheet: Sheet 1');
    expect(text).toContain('Exported: 2026-06-07T12:00:00.000Z');
    expect(text).toContain('Contents');
    expect(text).toContain('wire-schedule.csv');
  });
});
