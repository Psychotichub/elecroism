PowerAuxSymbol
==============

Summary
-------
PowerAuxSymbol is a catch-all symbol set for auxiliary/power-related hardware: UPS, DC battery backups, coils, transformers, busbar supports, enclosures and other non-load items. It picks titles, subtitles and accent colours from the component type and properties.

Location
--------
src/components/Components/PowerAuxSymbol.tsx

Props
-----
- component: CircuitComponent — determines the visual representation via component.type and properties.
- nodeResult?: NodeResult
- onSelect: () => void
- onDragEnd: (x: number, y: number) => void
- showConnectionPoints: boolean
- selected: boolean

Behavior
--------
- Many component types are supported with stringly-typed title and subtitle derivations (e.g., 'UPS', 'SHUNT TRIP', 'CT', 'VT', 'DIN', 'PQA', etc.).
- Some types render small illustrative marks (coil waves for trip/closing coils, CT/VT rings, THD trace for power quality analyzer).

Potential Issues / Things To Verify
----------------------------------
- The large conditional chain mapping component.type → title/subtitle/accentColor is verbose but straightforward. If you add new types, update this mapping.
- Doc only in this pass; confirm in the running app after nearby code changes.

Testing Notes
-------------
- Inspect each relevant component type (ups_module, shunt_trip_coil, current_transformer, power_quality_analyzer, etc.) to confirm correct title/subtitle and accent colours.


Real Life Feature, Working Principle, and Design
------------------------------------------------
Auxiliary contacts are mechanically linked to the main poles of a switch or contactor. They open or close simultaneously with the main contacts and are used for control logic, interlocking, or status indication without carrying the main load current.
