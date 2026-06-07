/** Optional per-step overrides for sequence simulations (ATS, etc.). */
export type SimulateOverrides = {
  /** Force main contactor pickup on/off regardless of coil fixpoint. */
  forcedContactorPickup?: ReadonlyMap<string, boolean>;
  /** Elapsed milliseconds since the previous simulation (battery charge / discharge). */
  simStepMs?: number;
  /** Elapsed ms on the ATS sequence clock (selector AUTO + atsController). */
  atsSequenceTimeMs?: number;
};
