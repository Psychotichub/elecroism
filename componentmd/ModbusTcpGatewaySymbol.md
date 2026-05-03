ModbusTcpGatewaySymbol
======================

Summary
-------
ModbusTcpGatewaySymbol renders a Modbus/TCP to RTU gateway device symbol, showing IP/port and terminal stubs for power, RS485, Ethernet and shielding terminals. Terminal labels are coloured according to heuristics.

Location
--------
src/components/Components/ModbusTcpGatewaySymbol.tsx

Props
-----
- component: CircuitComponent — reads gatewayIp and gatewayPort properties and connectionPoints.
- nodeResult?: NodeResult
- onSelect: () => void
- onDragEnd: (x: number, y: number) => void
- showConnectionPoints: boolean
- selected: boolean

Behavior
--------
- Terminal stub directions are computed by which side of the body the connection point is closest to. Terminal text is drawn as an index number and coloured by type (PWR_, RS485_, ETH, SHIELD/FG heuristics).

Potential Issues / Things To Verify
----------------------------------
- Terminal label colour heuristic checks for prefixes and substrings; adjust if your naming differs.
- Doc only in this pass; confirm in the running app after nearby code changes.

Testing Notes
-------------
- Verify terminal indices and colours for your gateway components and that IP/port properties render as expected.
