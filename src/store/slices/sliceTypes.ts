/**
 * Shared types for Zustand store slices.
 *
 * Each slice receives `set` and `get` from the parent `create()` call,
 * typed against the full store interface. We use `any` here intentionally
 * to avoid circular imports between slices and the main store definition.
 * The actual type safety is enforced at the spread site in circuitStore.ts.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export type CircuitStoreSet = (
  partial:
    | Partial<any>
    | ((state: any) => Partial<any>)
) => void;

export type CircuitStoreGet = () => any;
