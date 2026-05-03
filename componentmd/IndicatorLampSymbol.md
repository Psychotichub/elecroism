IndicatorLampSymbol
===================

Summary
-------
IndicatorLampSymbol renders a panel signal lamp with selectable colours (red, green, amber, blue, white). When energized it displays a soft pulsing glow and coloured fill.

Location
--------
src/components/Components/IndicatorLampSymbol.tsx

Props
-----
- component: CircuitComponent — reads properties.indicatorColor, properties.indicatorPhaseTag.
- nodeResult?: NodeResult
- onSelect: () => void
- onDragEnd: (x: number, y: number) => void
- showConnectionPoints: boolean
- selected: boolean

Behavior
--------
- Colour palette is defined in COLOR_HEX and glow animation uses **`startKonvaLayerAnimation`** from `src/utils/konvaLayerAnimation.ts` when energized (no animation if the node has no layer yet).
- Displays a phaseTag letter on the lamp and optional selection outline.

Potential Issues / Things To Verify
----------------------------------
- Glow cadence uses `Math.sin(frame.time * 0.004)`; adjust constant if product wants faster/slower pulse.

Testing Notes
-------------
- Verify glow/pulse appears for each colour when energized and that phaseTag and label positioning looks correct.

Implementation Notes / Required Modifications
-------------------------------------------
- Share the same Konva layer guard as `LoadSymbol` / `ThreePhaseMotorSymbol` via `startKonvaLayerAnimation`.
