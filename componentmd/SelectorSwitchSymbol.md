SelectorSwitchSymbol
=====================

Summary
-------
SelectorSwitchSymbol renders a three-position rotary selector (OFF / AUTO / MANUAL). The pointer rotates to indicate position and the label colours show the active position.

Location
--------
src/components/Components/SelectorSwitchSymbol.tsx

Props
-----
- component: CircuitComponent — reads `properties.selectorPosition` to determine pointer position.
- nodeResult?: NodeResult
- onSelect: () => void
- onDragEnd: (x: number, y: number) => void
- onCycle?: () => void — called on double-click to cycle positions.
- showConnectionPoints: boolean
- selected: boolean

Behavior
--------
- Pointer angle mapping: OFF -> -90°, AUTO -> 135°, MANUAL -> 45°.
- Shows 'OFF', 'AUTO', 'MAN' labels arranged around the dial. Energized state adds a highlight.

Potential Issues / Things To Verify
----------------------------------
- Pointer math uses cosine/sine of degrees converted to radians; this is straightforward but verify label alignment if you change sizes.
- Doc only in this pass; confirm in the running app after nearby code changes.

Testing Notes
-------------
- Update component.properties.selectorPosition and verify the pointer rotates and label colours update appropriately.


Real Life Feature, Working Principle, and Design
------------------------------------------------
A selector switch is a rotary mechanical switch used to choose between multiple control states (e.g., Auto/Off/Manual). It routes control voltage to different logic paths depending on the cam position.
