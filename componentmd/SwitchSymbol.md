SwitchSymbol
=============

Summary
-------
SwitchSymbol renders a single-pole single-throw (SPST) switch or a push-button variant. It supports momentary behavior (push button) and latching behavior (switch), displays IN/OUT terminals, and reflects energized state.

Location
--------
src/components/Components/SwitchSymbol.tsx

Props
-----
- component: CircuitComponent
- nodeResult?: NodeResult
- onToggle?: () => void — for latching switches called on double-click
- onPushChange?: (pressed: boolean) => void — for momentary push buttons on pointer down/up
- variant?: 'switch' | 'push_button'
- tool?: ToolMode — push behavior only when tool === 'select'
- onSelect: () => void
- onDragEnd: (x: number, y: number) => void
- showConnectionPoints: boolean
- selected: boolean

Behavior
--------
- For push buttons, pressing and releasing triggers onPushChange (momentary). For latching switches, double-click toggles via onToggle.
- Visuals show closed vs open blade position and color indicates energized state.

Potential Issues / Things To Verify
----------------------------------
- The component listens for global pointerup/pointercancel events when pressed to ensure release is detected even if pointer leaves the control. This is correct but verify interactions in touch scenarios.
- Doc only in this pass; confirm in the running app after nearby code changes.

Testing Notes
-------------
- Test both variants (switch and push_button) with the select tool. Confirm that onPushChange true/false are emitted properly on pointerdown/up and that double-click toggles latching switches.


Real Life Feature, Working Principle, and Design
------------------------------------------------
A basic electrical switch mechanically makes or breaks the continuity of a circuit. When the contacts are closed, current flows with minimal resistance; when open, the air gap provides infinite resistance, stopping the flow.
