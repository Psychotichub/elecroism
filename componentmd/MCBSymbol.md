MCBSymbol
=========

Summary
-------
MCBSymbol renders a miniature circuit breaker (MCB) symbol with support for 1-pole and 2-pole variants (auto-detected from properties or connection point labels). It indicates on/tripped states, rating and trip curve.

Location
--------
src/components/Components/MCBSymbol.tsx

Props
-----
- component: CircuitComponent — reads properties.poles and rating/tripCurve.
- nodeResult?: NodeResult
- onToggle: () => void — called on double-click when not tripped.
- onSelect: () => void
- onDragEnd: (x: number, y: number) => void
- showConnectionPoints: boolean
- selected: boolean

Behavior
--------
- Detects 2-pole variants by properties.poles === 2 or by connection point labels containing 'IN_L'.
- Renders one or two handle rectangles, displays rating/trip curve, and shows a flashing red indicator when tripped.

Potential Issues / Things To Verify
----------------------------------
- Tripped-state flash: implemented with `useTripFlash` (`src/hooks/useTripFlash.ts`) — ref-backed interval cleanup for Strict Mode and rapid trip/reset.

Testing Notes
-------------
- Verify 2P vs 1P rendering and tripped flashing.

Implementation Notes / Required Modifications
-------------------------------------------
- Trip flash uses `useTripFlash(isTripped, 500)` from `src/hooks/useTripFlash.ts`.
