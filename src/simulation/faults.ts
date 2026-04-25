import type { FaultEvent, CircuitComponent } from '../types';

export function checkOverload(
  component: CircuitComponent,
  currentA: number
): FaultEvent | null {
  if (
    (component.type === 'mcb' || component.type === 'overload_relay') &&
    component.properties.ratingAmps &&
    currentA > component.properties.ratingAmps
  ) {
    return {
      id: crypto.randomUUID(),
      type: 'overload',
      affectedComponentId: component.id,
      message: `${component.label}: ${currentA.toFixed(1)}A exceeds ${component.properties.ratingAmps}A rating`,
      severity: 'critical',
      timestamp: Date.now(),
    };
  }
  return null;
}

export function checkShortCircuit(
  component: CircuitComponent,
  currentA: number
): FaultEvent | null {
  if (currentA > 1000) {
    return {
      id: crypto.randomUUID(),
      type: 'short_circuit',
      affectedComponentId: component.id,
      message: `Short circuit at ${component.label}`,
      severity: 'critical',
      timestamp: Date.now(),
    };
  }
  return null;
}

export function checkEarthFault(
  component: CircuitComponent,
  leakageMA: number
): FaultEvent | null {
  if (
    component.type === 'rcd' &&
    component.properties.rcdSensitivity &&
    leakageMA > component.properties.rcdSensitivity
  ) {
    return {
      id: crypto.randomUUID(),
      type: 'earth_fault',
      affectedComponentId: component.id,
      message: `Earth leakage ${leakageMA}mA exceeds ${component.properties.rcdSensitivity}mA sensitivity`,
      severity: 'critical',
      timestamp: Date.now(),
    };
  }
  return null;
}
