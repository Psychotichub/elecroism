ContinuityBuzzer
=================

Summary
-------
ContinuityBuzzer is a React component that provides a continuous audible tone when any multimeter component in the circuit is set to continuity mode and the simulation indicates continuity (node power > 0.5 W). It uses the Web Audio API to synthesize a square-wave buzzer.

Location
--------
src/components/Audio/ContinuityBuzzer.tsx

Behavior
--------
- Subscribes to `useCircuitStore` to read the `circuit` and `simulationResult`.
- Computes `continuityActive` as true when a multimeter in continuity mode reports node power > 0.5 W.
- Lazily creates an AudioContext, oscillator (square wave at 1850 Hz) and gain node on first pointerdown to comply with autoplay policies.
- The gain ramps toward BUZZER_GAIN (0.03) when active, and toward 0 when inactive, using `setTargetAtTime` for smooth transitions.
- Cleans up oscillator and closes the AudioContext on unmount.

Public API / Props
------------------
- No props. Mount once in the app to provide global continuity buzzer behavior.

Potential Issues / Things To Verify
----------------------------------
- No code changes were made.
- Verify that the continuity activation threshold (node.powerW > 0.5) matches expected behavior for your simulation results. This threshold is a heuristic and may be tuned.
- The oscillator is started immediately when the context is created and kept running; the gain is used to control audibility. This is a common pattern and acceptable.
- The code handles AudioContext absence gracefully by returning early.

Testing Notes
-------------
- Mount the component and switch a multimeter to continuity mode, create a conductive path in the simulation and confirm audible tone.

Implementation Notes / Required Modifications
-------------------------------------------
- Autoplay/unlock: the AudioContext and oscillator are created on first pointerdown which satisfies browser autoplay policies. Document that a pointer gesture is required before continuity/trip sounds will play.
- Consider making the continuity detection threshold configurable via component properties so tests can tune sensitivity without code changes.
