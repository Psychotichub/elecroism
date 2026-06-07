/** Optional per-step overrides for sequence simulations (ATS, etc.). */
export type SimulateOverrides = {
  /** Force main contactor pickup on/off regardless of coil fixpoint. */
  forcedContactorPickup?: ReadonlyMap<string, boolean>;
};
