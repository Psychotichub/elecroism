LoadSymbol
===========

Summary
-------
LoadSymbol renders a generic load symbol (lamp, motor, heater, fan, etc.) on the Konva canvas. It reacts visually to simulation state (energized) and supports simple animations for motors, fans and lamp glow.

Location
--------
src/components/Components/LoadSymbol.tsx

Props
-----
- component: CircuitComponent — component model from the circuit store.
- nodeResult?: NodeResult — optional simulation result for the component's node.
- onSelect: () => void — click handler.
- onDragEnd: (x: number, y: number) => void — called when dragging ends.
- showConnectionPoints: boolean — whether to render connection point circles.
- selected: boolean — whether the component is selected (renders selection outline).

Behavior
--------
- Renders a circle with fill color derived from component type and energized state.
- For lamps, renders a glow circle and an animated subtle opacity shimmer when energized.
- For motors and cooling fans, rotates an inner group to simulate motion when energized.
- Shows label and power text, and optionally connection points.

Potential Issues / Things To Verify
----------------------------------
- **Konva layer:** Animations start only if `node.getLayer()` is non-null (`startLayerAnimation` helper). If the symbol is not on a Stage layer yet, motion/glow simply does not start until a later energize cycle — no throw.
- **Theming:** Colors and sizes are hard-coded; use component `labelFontSize` / offsets where supported for labels.

Testing Notes
-------------
- Place the component on the canvas and toggle energized state via the simulation to confirm the lamp glow, motor/fan rotation and selection outline behave as expected.

Implementation Notes / Required Modifications
-------------------------------------------
- Motor, fan, and lamp effects use `startKonvaLayerAnimation` from `src/utils/konvaLayerAnimation.ts` (layer guard). Reuse that helper for any new animated sub-symbols.
