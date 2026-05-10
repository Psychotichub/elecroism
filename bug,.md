# Project Bug Audit

## Audit summary
- `npm run lint`: PASS
- `npm test`: PASS (15/15)
- `npm run build`: PASS
- Status: Bugs 1, 2, and 3 implemented and verified.

---

## Bug 1: Build is broken by unused React imports

### Problem
`npm run build` fails with `TS6133` because `React` is imported but unused in multiple editor files.

### Affected files
- `src/components/Panels/propertyPanel/editors/CommEditors.tsx`
- `src/components/Panels/propertyPanel/editors/ControlEditors.tsx`
- `src/components/Panels/propertyPanel/editors/LoadEditors.tsx`
- `src/components/Panels/propertyPanel/editors/MeteringEditors.tsx`
- `src/components/Panels/propertyPanel/editors/MotorizedBreakerEditors.tsx`
- `src/components/Panels/propertyPanel/editors/ProtectionEditors.tsx`
- `src/components/Panels/propertyPanel/editors/SwitchEditors.tsx`
- `src/components/Panels/propertyPanel/editors/ThreePhaseEditors.tsx`

### Why this is a bug
- CI/build pipeline is blocked.
- App cannot produce production artifacts until TypeScript compile succeeds.

### Solution
- Remove unused `import React from 'react';` from the files above, or use type-only imports where required.

---

## Bug 2: Build is broken by implicit `any` in component action callbacks

### Problem
`npm run build` fails with `TS7006` in `src/store/slices/componentActions.ts` because callback params like `(c)` and `(w)` are inferred as `any`.

### Why this is a bug
- Type safety is broken in a core store slice.
- Build cannot complete; this is a release-blocking issue.

### Solution
- Add explicit types for callback params and any untyped state callback args.
- Prefer strongly typed callback signatures such as:
  - `(c: CircuitComponent) => ...`
  - `(w: Wire) => ...`
- If needed, tighten `CircuitStoreSet` / `CircuitStoreGet` typings in `sliceTypes` so state callbacks infer correctly.

---

## Bug 3: Busbar canvas extension is one-way only

### Problem
Busbar can be grown from canvas (`+` on left/right) but not shrunk from canvas.

### Why this is a bug
- Users can overshoot length and must switch to property panel to correct.
- On-canvas editing is incomplete and inconsistent with "adjust from symbol" workflow.

### Affected files
- `src/components/Components/BusbarSymbol.tsx`
- `src/components/Canvas/CircuitCanvas.tsx`

### Solution
1. Add `onShrinkLeft` and `onShrinkRight` props in `BusbarSymbol`.
2. Render `-` controls next to existing `+` controls on both sides.
3. Wire them in `CircuitCanvas`:
   - `onShrinkLeft={() => adjustBusbarSide('left', -1)}`
   - `onShrinkRight={() => adjustBusbarSide('right', -1)}`
4. Keep existing `1..40` clamp and connection-point ID-by-position preservation.

---

## Recommended fix order
1. Fix Build Bug 1 (unused imports) and Bug 2 (implicit any) first to restore release pipeline.
2. Fix Bug 3 to complete busbar UX.

---

## Resolution notes
- **Bug 1 fixed** by removing unused `React` imports from the listed property editor files.
- **Bug 2 fixed** by adding explicit callback parameter types in `src/store/slices/componentActions.ts` (including `CircuitComponent` and `Wire`).
- **Bug 3 fixed** by adding `-` shrink controls and handlers:
  - `onShrinkLeft` / `onShrinkRight` in `src/components/Components/BusbarSymbol.tsx`
  - wiring to `adjustBusbarSide(..., -1)` in `src/components/Canvas/CircuitCanvas.tsx`
- Verification after implementation:
  - `npm run lint` PASS
  - `npm run build` PASS
