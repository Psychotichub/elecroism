TwoWaySwitchSymbol
====================

Summary
-------
SPDT (single-pole double-throw) maintained two-way switch symbol rendered with Konva. Shows COM, T1, and T2 terminals and visually indicates which throw is active. Supports clicking, double-clicking (toggle), dragging, selection outline, and optional connection point rendering.

Location
--------
src/components/Components/TwoWaySwitchSymbol.tsx

Props
-----
- component: CircuitComponent — model for the switch; `state === 'on'` maps to COM–T1, otherwise COM–T2.
- nodeResult?: NodeResult — used to display energized visuals.
- onToggle?: () => void — called on double-click to flip the switch.
- onSelect: () => void — click handler.
- onDragEnd: (x: number, y: number) => void — drag end handler.
- showConnectionPoints: boolean — render terminal connection point circles.
- selected: boolean — render selection outline when true.

Behavior
--------
- Renders a rectangular body, terminal lines and terminal spheres (COM, T1, T2).
- Visual styling (stroke, fill, line weights, dashed vs solid) reflect the active throw and energized state.
- Double-click calls onToggle if provided.

Potential Issues / Things To Verify
----------------------------------
- Doc only in this pass; confirm in the running app after nearby code changes.
- The component assumes connectionPoints are present on the `component` model and positions them where expected; verify that the circuit model's `createConnectionPoints` aligns with this symbol's expectations.
- Ensure onToggle side effects (e.g., updating the store) are implemented where this component is used.

Testing Notes
-------------
- Verify visual states by toggling component.state between 'on' and 'off' and by energizing the node in the simulation.
- Confirm double-click triggers onToggle and that dragging works as expected.
