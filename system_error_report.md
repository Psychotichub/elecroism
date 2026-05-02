# Single Phase, Three Phase, and BMS Error Report

Date checked: 2026-05-01

## Checks Run

- `npm run build` failed.
- `npm run lint` passed with no reported lint errors.

## Summary

The project currently has one build-blocking TypeScript error in the simulation engine. Because this prevents the app from compiling, it affects the single-phase, three-phase, and BMS systems globally.

I also found one BMS logic issue in the motorized MCCB interlock handling. It does not stop TypeScript compilation, but it can make the simulation behave incorrectly.

## Error 1: Build Failure in Simulation Engine

Affected systems:

- Single-phase simulation
- Three-phase simulation
- BMS simulation

File:

- `src/simulation/engine.ts`

Location:

- Function: `validateContactorOverloadFaults`
- Around line 2416

Error:

```text
src/simulation/engine.ts(2416,21): error TS2304: Cannot find name 'circuit'.
```

Cause:

`validateContactorOverloadFaults` loops through `circuit.components`, but the function does not receive `circuit` as a parameter and there is no local `circuit` variable inside the function.

Current pattern:

```ts
private validateContactorOverloadFaults(
  seriesPathCurrents: Map<string, number>,
  contactorPickup: Set<string>,
  wallMs: number
): FaultEvent[] {
  const out: FaultEvent[] = [];
  for (const c of circuit.components) {
    // ...
  }
}
```

Solution:

Pass the current `Circuit` into the function and update the call site.

Recommended call site change around line 323:

```ts
faults.push(
  ...this.validateContactorOverloadFaults(
    circuit,
    seriesPathCurrents,
    contactorPickup,
    wallMs
  )
);
```

Recommended function signature change:

```ts
private validateContactorOverloadFaults(
  circuit: Circuit,
  seriesPathCurrents: Map<string, number>,
  contactorPickup: Set<string>,
  wallMs: number
): FaultEvent[] {
  const out: FaultEvent[] = [];
  for (const c of circuit.components) {
    // existing logic
  }
  return out;
}
```

Expected result after solution:

- `npm run build` should pass this TypeScript stage.
- Single-phase, three-phase, and BMS code can compile again.
- Contactor overload validation can inspect all circuit components safely.

## Error 2: BMS Motorized MCCB Interlock Logic Is Too Aggressive

Affected system:

- BMS system
- Motorized MCCB
- Four-pole motorized MCCB

Files:

- `src/simulation/engine.ts`
- `src/store/circuitStore.ts`
- `src/types/index.ts`

Location:

- `src/simulation/engine.ts`, function `mainBreakerBmsInterlockOpen`, around lines 2052-2068

Current behavior:

```ts
return Boolean(
  p.mccbBmsEnabled &&
    (p.mccbBmsCtrlVoltageOk === false ||
      p.mccbBmsMotorReady === false)
);
```

Problem:

`mccbBmsMotorReady === false` is treated as a reason to force the main contacts open in the simulation.

This conflicts with the property description in `src/types/index.ts`, which says:

```ts
/** Mechanism ready (spring charged / ready) - motor close pulse ignored if false. */
mccbBmsMotorReady?: boolean;
```

The close pulse logic in `src/store/circuitStore.ts` already handles this correctly:

```ts
if (p.mccbBmsMotorReady === false) return;
```

So `mccbBmsMotorReady` should block a remote close command, but it should not automatically open an already-closed MCCB.

Solution:

Keep `mccbBmsCtrlVoltageOk === false` as an interlock if the intended behavior is to simulate loss of control supply opening the main contacts, but remove `mccbBmsMotorReady === false` from `mainBreakerBmsInterlockOpen`.

Recommended change:

```ts
return Boolean(
  p.mccbBmsEnabled &&
    p.mccbBmsCtrlVoltageOk === false
);
```

Expected result after solution:

- BMS motor close still fails when the motor mechanism is not ready.
- An already-closed motorized MCCB does not incorrectly appear open only because the motor-ready feedback is false.
- Simulation behavior matches the property documentation.

## Single-Phase System Status

No single-phase-specific TypeScript or lint error was found during this check.

However, the single-phase system is still affected by the global build failure in `src/simulation/engine.ts`. Until Error 1 is fixed, the application cannot compile successfully.

## Three-Phase System Status

The three-phase system is directly affected by Error 1 because the new contactor overload validation includes:

- `three_phase_contactor`
- `four_phase_contactor`

The function is intended to validate unsafe current through contactors, but it cannot compile until `circuit` is passed in.

## BMS System Status

The BMS system has two findings:

1. It is affected by the global build failure from Error 1.
2. It has the motorized MCCB interlock behavior issue described in Error 2.

## Verification After Fixes

After applying the recommended code changes, run:

```bash
npm run build
npm run lint
```

Success criteria:

- Build exits with code `0`.
- Lint exits with code `0`.
- Motorized MCCB BMS close pulse remains blocked when `mccbBmsMotorReady` is false.
- An already-closed motorized MCCB is not forced open only by `mccbBmsMotorReady === false`.
