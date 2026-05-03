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
- Colour palette is defined in COLOR_HEX and glow animation is created via Konva.Animation when energized.
- Displays a phaseTag letter on the lamp and optional selection outline.

Potential Issues / Things To Verify
----------------------------------
- Konva.Animation creation calls getLayer() on the glowRef — ensure the symbol is attached to a Konva layer at animation creation time. In practice this is true when rendered inside ScaledSymbolInner and the main canvas.
- No code changes were made.

Testing Notes
-------------
- Verify glow/pulse appears for each colour when energized and that phaseTag and label positioning looks correct.

Implementation Notes / Required Modifications
-------------------------------------------
- Risk: The code assumes `glowRef.current.getLayer()` is available when the effect runs. In some render ordering cases (or if the symbol is rendered outside the standard canvas layer) `getLayer()` can be null and creating Konva.Animation will fail. Add a guard around `getLayer()` or defer animation start until the node's layer is available (for example by listening for the 'layer' property or using a post-mount tick).
