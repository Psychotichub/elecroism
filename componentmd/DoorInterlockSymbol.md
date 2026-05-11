DoorInterlockSymbol
===================

Summary
-------
DoorInterlockSymbol renders a door/mechanical interlock control symbol. Closed state (`component.state === 'on'`) shows a closed contact; open shows an angled break. Displays a small energetic LED when the node is energized.

Location
--------
src/components/Components/DoorInterlockSymbol.tsx

Props
-----
- component: CircuitComponent
- nodeResult?: NodeResult
- onToggle: () => void — called on double-click
- onSelect: () => void
- onDragEnd: (x: number, y: number) => void
- showConnectionPoints: boolean
- selected: boolean

Behavior
--------
- Renders different line/shape depending on `component.type` (mechanical_interlock vs door interlock) and `component.state`.

Potential Issues / Things To Verify
----------------------------------
- Doc only in this pass; confirm in the running app after nearby code changes.

Testing Notes
-------------
- Verify caption changes for mechanical_interlock and door types, and that onToggle is wired by the parent.


Real Life Feature, Working Principle, and Design
------------------------------------------------
A door interlock is a safety mechanism that prevents an electrical panel from being opened while the power is on, or automatically disconnects power when the door is opened. It ensures operator safety by mechanically linking the main switch to the enclosure door.
