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
- Animations depend on Konva.Animation and call getLayer() on the referenced groups. If a group is not attached to a layer when the Animation is created this will throw. The code uses returned refs from Konva and the component is rendered inside ScaledSymbolInner which should provide a layer; in practice this is usually safe but verify in runtimes where the symbol may be rendered outside a Konva layer.
- Colors and sizes are hard-coded; if theming or scaling is needed, adjust properties on the component model (label font size, offsets are supported already).
- No changes were made to code — this file documents the component and lists verifications.

Testing Notes
-------------
- Place the component on the canvas and toggle energized state via the simulation to confirm the lamp glow, motor/fan rotation and selection outline behave as expected.

Implementation Notes / Required Modifications
-------------------------------------------
- Risk: Konva.Animation is constructed with motorRef.current.getLayer()/fanRef.current.getLayer()/glowRef.current.getLayer(). If the Konva node exists but is not yet attached to a layer getLayer() returns null and Konva.Animation may throw. This can happen if the symbol is rendered outside the main canvas or due to timing during mount.
- Recommendation: guard animation creation by checking `node.getLayer()` is non-null before constructing the animation, or start animations in a `requestAnimationFrame`/`setTimeout(..., 0)` after mount, or listen for the node's 'layer' to become available and start animations there. This is a small defensive change.
