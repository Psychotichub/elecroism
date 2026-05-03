ContinuityBuzzer
=================

Summary
-------
ContinuityBuzzer is a React component that provides a continuous audible tone when any multimeter component in the circuit is set to continuity mode and the simulation indicates continuity (node power above the circuit threshold). It uses the Web Audio API to synthesize a square-wave buzzer.

Location
--------
src/components/Audio/ContinuityBuzzer.tsx

Behavior
--------
- Subscribes to `useCircuitStore` to read the `circuit` and `simulationResult`.
- Computes `continuityActive` when a multimeter in continuity mode reports `node.powerW` **greater than** `circuit.continuityPowerThresholdW` (default **0.5** W, editable in **Circuit validation** panel).
- Lazily creates an AudioContext, oscillator (square wave at 1850 Hz) and gain node on first pointerdown to comply with autoplay policies.
- The gain ramps toward BUZZER_GAIN (0.03) when active, and toward 0 when inactive, using `setTargetAtTime` for smooth transitions.
- Cleans up oscillator and closes the AudioContext on unmount.

Public API / Props
------------------
- No props. Mount once in the app to provide global continuity buzzer behavior.

Potential Issues / Things To Verify
----------------------------------
- **Threshold:** Must match **MultimeterSymbol** (same `circuit.continuityPowerThresholdW`) so the buzzer and on-canvas BEEP agree.
- The oscillator runs continuously after unlock; only gain changes. AudioContext absence is handled by early return.

Testing Notes
-------------
- Set continuity threshold in **Circuit validation → Continuity “closed” min. (W)**; confirm buzzer tracks multimeter BEEP/open.

Implementation Notes / Required Modifications
-------------------------------------------
- Autoplay: first **pointerdown** unlocks the AudioContext (same pattern as TripSound).
