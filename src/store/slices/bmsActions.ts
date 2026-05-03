/**
 * BMS actions slice for circuitStore.
 *
 * Handles ACB and motorized MCCB BMS remote close/open commands
 * with full interlock validation and audit logging.
 */

import type { BmsSimLogEntry } from '../../types';
import { v4 as uuid } from 'uuid';
import type { CircuitStoreSet, CircuitStoreGet } from './sliceTypes';

const BMS_SIM_LOG_CAP = 80;

function appendBmsSimLog(
  set: CircuitStoreSet,
  entry: Omit<BmsSimLogEntry, 'id' | 'ts'>
) {
  set((state: { bmsSimLog: BmsSimLogEntry[] }) => ({
    bmsSimLog: [
      { ...entry, id: uuid(), ts: Date.now() },
      ...state.bmsSimLog,
    ].slice(0, BMS_SIM_LOG_CAP),
  }));
}

export function createBmsActions(set: CircuitStoreSet, get: CircuitStoreGet) {
  return {
    clearBmsSimLog: () => set({ bmsSimLog: [] }),

    clearBmsSimLogForDevice: (deviceId: string) =>
      set((s: { bmsSimLog: BmsSimLogEntry[] }) => ({
        bmsSimLog: s.bmsSimLog.filter((e: BmsSimLogEntry) => e.deviceId !== deviceId),
      })),

    acbBmsClosePulse: (id: string) => {
      const comp = get().circuit.components.find((c: { id: string }) => c.id === id);
      if (!comp || comp.type !== 'air_circuit_breaker') return;
      const p = comp.properties;
      const base = { deviceId: id, label: comp.label, deviceKind: 'ACB' as const, command: 'ACB close (CC)' };
      if (!p.acbBmsEnabled) { appendBmsSimLog(set, { ...base, ok: false, detail: 'BMS is disabled on this breaker — enable BMS in properties.' }); return; }
      if (p.acbBmsUvrEnergized === false) { appendBmsSimLog(set, { ...base, ok: false, detail: 'UVR not energized — closing coil interlock blocks close.' }); return; }
      if (p.acbBmsSpringCharged === false) { appendBmsSimLog(set, { ...base, ok: false, detail: 'Spring not charged — motor-charge or spring feedback required before close.' }); return; }
      if (comp.state === 'tripped' || comp.state === 'fault') {
        appendBmsSimLog(set, { ...base, ok: false, detail: comp.state === 'tripped' ? 'Breaker is tripped — reset protection before remote close.' : 'Breaker fault state — clear fault before remote close.' });
        return;
      }
      if (comp.state === 'on') { appendBmsSimLog(set, { ...base, ok: true, detail: 'Command accepted — main contacts already closed (no change).' }); return; }
      get().updateComponent(id, { state: 'on' });
      appendBmsSimLog(set, { ...base, ok: true, detail: 'Close coil pulse accepted — mains closed.' });
      get().pushHistory('BMS ACB closing coil (CC pulse)');
    },

    acbBmsShuntOpen: (id: string) => {
      const comp = get().circuit.components.find((c: { id: string }) => c.id === id);
      if (!comp || comp.type !== 'air_circuit_breaker') return;
      const base = { deviceId: id, label: comp.label, deviceKind: 'ACB' as const, command: 'ACB shunt trip' };
      if (!comp.properties.acbBmsEnabled) { appendBmsSimLog(set, { ...base, ok: false, detail: 'BMS is disabled on this breaker.' }); return; }
      if (comp.state !== 'on') {
        appendBmsSimLog(set, { ...base, ok: false, detail: comp.state === 'tripped' ? 'Already tripped — shunt open not applied (use reset).' : 'Main contacts already open — shunt trip not applicable.' });
        return;
      }
      get().updateComponent(id, { state: 'off' });
      appendBmsSimLog(set, { ...base, ok: true, detail: 'Shunt trip accepted — mains opened.' });
      get().pushHistory('BMS ACB shunt trip (remote open)');
    },

    mccbBmsMotorClosePulse: (id: string) => {
      const comp = get().circuit.components.find((c: { id: string }) => c.id === id);
      if (!comp || (comp.type !== 'motorized_mccb' && comp.type !== 'four_pole_motorized_mccb')) return;
      const p = comp.properties;
      const base = { deviceId: id, label: comp.label, deviceKind: 'mMCCB' as const, command: 'mMCCB motor close' };
      if (!p.mccbBmsEnabled) { appendBmsSimLog(set, { ...base, ok: false, detail: 'BMS is disabled on this breaker.' }); return; }
      if (p.mccbBmsCtrlVoltageOk === false) { appendBmsSimLog(set, { ...base, ok: false, detail: 'Control voltage not OK — motor close blocked.' }); return; }
      if (p.mccbBmsMotorReady === false) { appendBmsSimLog(set, { ...base, ok: false, detail: 'Motor / mechanism not ready — close blocked.' }); return; }
      if (comp.state === 'tripped' || comp.state === 'fault') {
        appendBmsSimLog(set, { ...base, ok: false, detail: comp.state === 'tripped' ? 'Breaker is tripped — reset before remote close.' : 'Fault state — clear before remote close.' });
        return;
      }
      if (comp.state === 'on') { appendBmsSimLog(set, { ...base, ok: true, detail: 'Command accepted — contacts already closed (no change).' }); return; }
      get().updateComponent(id, { state: 'on' });
      appendBmsSimLog(set, { ...base, ok: true, detail: 'Motor close accepted — mains closed.' });
      get().pushHistory('BMS mMCCB motor close (remote ON)');
    },

    mccbBmsShuntOpen: (id: string) => {
      const comp = get().circuit.components.find((c: { id: string }) => c.id === id);
      if (!comp || (comp.type !== 'motorized_mccb' && comp.type !== 'four_pole_motorized_mccb')) return;
      const base = { deviceId: id, label: comp.label, deviceKind: 'mMCCB' as const, command: 'mMCCB shunt open' };
      if (!comp.properties.mccbBmsEnabled) { appendBmsSimLog(set, { ...base, ok: false, detail: 'BMS is disabled on this breaker.' }); return; }
      if (comp.state !== 'on') {
        appendBmsSimLog(set, { ...base, ok: false, detail: comp.state === 'tripped' ? 'Already tripped — shunt open not applied (use reset).' : 'Contacts already open — shunt open not applicable.' });
        return;
      }
      get().updateComponent(id, { state: 'off' });
      appendBmsSimLog(set, { ...base, ok: true, detail: 'Shunt open accepted — mains opened.' });
      get().pushHistory('BMS mMCCB shunt trip (remote OFF)');
    },
  };
}
