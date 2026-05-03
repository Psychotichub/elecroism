EStopSymbol
===========

Summary
-------
EStopSymbol renders an emergency stop mushroom head with a yellow placard. Clicking or double-clicking toggles selection and onToggle can be used to latch/unlatch the head.

Location
--------
src/components/Components/EStopSymbol.tsx

Props
-----
- component: CircuitComponent — uses component.state to determine pressed (latched) state.
- nodeResult?: NodeResult
- onSelect: () => void
- onDragEnd: (x: number, y: number) => void
- onToggle?: () => void — called on double-click to latch/unlatch
- showConnectionPoints: boolean
- selected: boolean

Behavior
--------
- A pressed (latched) state is represented by component.state === 'off'. The head colour and label change to indicate the latched/pressed vs released state.

Potential Issues / Things To Verify
----------------------------------
- No code changes were made.

Testing Notes
-------------
- Verify that onToggle or double-click behavior is wired up in the parent and that the pressed visual state matches component.state.
