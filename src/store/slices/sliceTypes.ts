import type { CircuitStore } from '../circuitStoreTypes';

export type CircuitStoreSet = (
  partial:
    | Partial<CircuitStore>
    | ((state: CircuitStore) => Partial<CircuitStore>)
) => void;

export type CircuitStoreGet = () => CircuitStore;
