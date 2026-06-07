import type { Circuit, CircuitComponent, Wire } from '../types';
import { effectiveWireDisplayText } from './wireLabelLayout';
import {
  INSTALLATION_METHOD_LABELS,
  type InstallationMethod,
} from './cableSizingWizard';

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function componentRef(c: CircuitComponent | undefined): string {
  if (!c) return '';
  const lab = (c.label ?? '').trim();
  return lab ? `${c.type} (${lab})` : c.type;
}

function terminalLabel(
  circuit: Circuit,
  componentId: string,
  pointId: string
): string {
  const c = circuit.components.find((x) => x.id === componentId);
  const p = c?.connectionPoints.find((x) => x.id === pointId);
  return (p?.label ?? '').trim();
}

function installationLabel(method: string): string {
  if (method in INSTALLATION_METHOD_LABELS) {
    return INSTALLATION_METHOD_LABELS[method as InstallationMethod];
  }
  return method.replace(/_/g, ' ');
}

export type CableScheduleRow = {
  wireNumber: string;
  wireLabel: string;
  displayLabel: string;
  fromComponent: string;
  fromTerminal: string;
  toComponent: string;
  toTerminal: string;
  appliedMm2: string;
  lengthM: string;
  loadKw: string;
  voltageV: string;
  phaseConfig: string;
  powerFactor: string;
  installation: string;
  conductor: string;
  ambientTempC: string;
  circuitsInGroup: string;
  deratingCombinedK: string;
  maxVoltageDropPct: string;
  loadCurrentA: string;
  recommendedMm2: string;
  deratedAmpacityA: string;
  voltageDropV: string;
  voltageDropPct: string;
  wizardSummary: string;
  calculatedAt: string;
  hasWizardData: string;
};

export function buildCableScheduleRows(circuit: Circuit): CableScheduleRow[] {
  return circuit.wires.map((w: Wire) => {
    const fromC = circuit.components.find((c) => c.id === w.fromComponentId);
    const toC = circuit.components.find((c) => c.id === w.toComponentId);
    const cs = w.cableSizing;
    return {
      wireNumber: String(w.wireNumber ?? ''),
      wireLabel: String(w.wireLabel ?? ''),
      displayLabel: effectiveWireDisplayText(w),
      fromComponent: componentRef(fromC),
      fromTerminal: terminalLabel(circuit, w.fromComponentId, w.fromPointId),
      toComponent: componentRef(toC),
      toTerminal: terminalLabel(circuit, w.toComponentId, w.toPointId),
      appliedMm2: String(w.crossSection ?? ''),
      lengthM: cs ? String(cs.distanceM) : '',
      loadKw: cs ? String(cs.loadKw) : '',
      voltageV: cs ? String(cs.voltageV) : '',
      phaseConfig: cs
        ? cs.phaseConfig === 'three_phase'
          ? '3φ'
          : '1φ'
        : '',
      powerFactor: cs ? String(cs.powerFactor) : '',
      installation: cs ? installationLabel(cs.installationMethod) : '',
      conductor: cs ? cs.conductorMaterial : '',
      ambientTempC: cs ? String(cs.ambientTempC) : '',
      circuitsInGroup: cs?.circuitsInGroup != null ? String(cs.circuitsInGroup) : '',
      deratingCombinedK: cs?.deratingCombinedK != null ? String(cs.deratingCombinedK) : '',
      maxVoltageDropPct: cs ? String(cs.maxVoltageDropPct) : '',
      loadCurrentA: cs ? String(cs.loadCurrentA) : '',
      recommendedMm2:
        cs?.recommendedMm2 != null ? String(cs.recommendedMm2) : '',
      deratedAmpacityA:
        cs?.deratedAmpacityA != null ? String(cs.deratedAmpacityA) : '',
      voltageDropV: cs?.voltageDropV != null ? String(cs.voltageDropV) : '',
      voltageDropPct:
        cs?.voltageDropPct != null ? String(cs.voltageDropPct) : '',
      wizardSummary: cs?.summary ?? '',
      calculatedAt: cs?.calculatedAt ?? '',
      hasWizardData: cs ? 'yes' : 'no',
    };
  });
}

const CABLE_SCHEDULE_HEADER: (keyof CableScheduleRow)[] = [
  'wireNumber',
  'wireLabel',
  'displayLabel',
  'fromComponent',
  'fromTerminal',
  'toComponent',
  'toTerminal',
  'appliedMm2',
  'lengthM',
  'loadKw',
  'voltageV',
  'phaseConfig',
  'powerFactor',
  'installation',
  'conductor',
  'ambientTempC',
  'circuitsInGroup',
  'deratingCombinedK',
  'maxVoltageDropPct',
  'loadCurrentA',
  'recommendedMm2',
  'deratedAmpacityA',
  'voltageDropV',
  'voltageDropPct',
  'wizardSummary',
  'calculatedAt',
  'hasWizardData',
];

export function cableScheduleToCsv(circuit: Circuit): string {
  const rows = buildCableScheduleRows(circuit);
  const lines = [
    CABLE_SCHEDULE_HEADER.join(','),
    ...rows.map((r) =>
      CABLE_SCHEDULE_HEADER.map((k) => csvEscape(r[k])).join(',')
    ),
  ];
  return lines.join('\r\n');
}

export function downloadCableScheduleCsv(
  circuit: Circuit,
  baseFileName: string
): void {
  const csv = cableScheduleToCsv(circuit);
  const safe = baseFileName.replace(/[^\w-]+/g, '_').slice(0, 80) || 'circuit';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safe}-cables.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
