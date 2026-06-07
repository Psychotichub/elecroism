import { describe, expect, it } from 'vitest';
import {
  commitCircuitToProject,
  createEmptyProject,
  deserializeProjectFile,
  projectFromSingleCircuit,
  serializeProject,
} from '../projectPersistence';
import { makeCircuit, makeComponent } from '../../simulation/__tests__/testHelpers';

describe('projectPersistence', () => {
  it('creates a project with one default sheet', () => {
    const project = createEmptyProject('Test');
    expect(project.name).toBe('Test');
    expect(project.sheets).toHaveLength(1);
    expect(project.activeSheetId).toBe(project.sheets[0].id);
  });

  it('round-trips project file v2', () => {
    const project = createEmptyProject('Round trip');
    project.sheets[0].circuit.components.push(
      makeComponent('mcb', { label: 'Q1' })
    );
    const doc = serializeProject(project);
    const loaded = deserializeProjectFile(doc);
    expect(loaded?.name).toBe('Round trip');
    expect(loaded?.sheets[0].circuit.components).toHaveLength(1);
  });

  it('round-trips project title block in file document', () => {
    const project = createEmptyProject('Title block');
    project.titleBlock = {
      client: 'Client Co',
      drawingNumber: 'DWG-1',
      revision: 'A',
      scale: '1:50',
      revisionHistory: [
        { revision: 'A', date: '2026-06-07', description: 'First issue' },
      ],
    };
    const loaded = deserializeProjectFile(serializeProject(project));
    expect(loaded?.titleBlock?.client).toBe('Client Co');
    expect(loaded?.titleBlock?.revisionHistory).toHaveLength(1);
  });

  it('imports legacy esim v1 documents', () => {
    const circuit = makeCircuit([makeComponent('mcb', { label: 'Q1' })], []);
    const legacy = {
      version: '1.0',
      name: 'Legacy',
      created: circuit.createdAt,
      circuit: {
        components: circuit.components,
        wires: circuit.wires,
      },
    };
    const project = deserializeProjectFile(legacy);
    expect(project?.sheets).toHaveLength(1);
    expect(project?.sheets[0].circuit.components).toHaveLength(1);
  });

  it('commits active circuit into the active sheet', () => {
    const project = createEmptyProject();
    const circuit = {
      ...project.sheets[0].circuit,
      components: [makeComponent('motor', { label: 'M1' })],
    };
    const next = commitCircuitToProject(project, circuit);
    const active = next.sheets.find((s) => s.id === next.activeSheetId);
    expect(active?.circuit.components).toHaveLength(1);
  });

  it('wraps a single circuit as a one-sheet project', () => {
    const circuit = makeCircuit([makeComponent('mcb')], []);
    circuit.name = 'Feeder A';
    const project = projectFromSingleCircuit(circuit);
    expect(project.sheets[0].name).toBe('Feeder A');
  });
});
