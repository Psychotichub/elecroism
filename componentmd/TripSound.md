TripSound
==========

Summary
-------
TripSound is a React component that listens to the circuit store and plays an audio cue whenever a protection device trips (or a motor hits a thermal fault). It uses the Web Audio API to either play a pre-recorded sample served from `public/audio/mcb-trip.wav` or synthesize a procedural trip sound if the sample is not available.

Location
--------
src/components/Audio/TripSound.tsx

Behavior
--------
- Subscribes to `useCircuitStore` to read `circuit.components`.
- Tracks monitored components (series protection trip types and some motor types) and detects transitions into `tripped` (for protection devices) or `fault` (for motors).
- Debounces successive plays by 220 ms (TRIP_DEBOUNCE_MS).
- On first user pointer interaction it creates an AudioContext (unlock) and begins preloading a WAV sample.
- If a preloaded sample is available it plays it; otherwise it synthesizes a layered procedural trip sound using noise, bandpass filters, oscillators and gain envelopes.

Public API / Props
------------------
- This component has no props and returns null. It is intended to be mounted once in the app to provide global trip sounds.

Important Implementation Notes
------------------------------
- The component relies on the DOM environment and the Web Audio API (window.AudioContext or webkitAudioContext). It no-ops if AudioContext is unavailable.
- The WAV sample is resolved using `import.meta.env.BASE_URL` and expected at `audio/mcb-trip.wav` under the base URL.
- AudioContext is created lazily on first pointerdown to satisfy browser autoplay restrictions. The component attempts to resume a suspended context if present.

Potential Issues / Things To Verify
----------------------------------
- No issues found in the code itself.
- Verify that `public/audio/mcb-trip.wav` exists and is reachable at runtime. If the file is missing, the component will fall back to the procedural synth (which is fine).
- The component preloads the WAV only after the AudioContext is created (on first pointerdown). Earlier preload would require an explicit product decision (e.g. resume context on first canvas interaction).
- The AudioContext is closed on unmount only if it was started by this component (startedRef). That behavior looks correct.
- The exponentialGain/exponentialRamp methods use small non-zero start values (0.0001) to avoid ramping to/from zero which is correct.

Testing Notes
-------------
- To verify manually: mount the component, trip a protected device in the UI, and ensure audio plays (or no error is thrown if audio is unavailable).
- Check browser console for any fetch errors when loading the WAV sample.

Implementation Notes / Required Modifications
-------------------------------------------
- The WAV sample path is resolved using `import.meta.env.BASE_URL + 'audio/mcb-trip.wav'`. I confirmed `public/audio/mcb-trip.wav` exists in the repo. Runtime servers typically serve this at `/audio/mcb-trip.wav` — verify your build/deploy base URL (BASE_URL) doesn't change at runtime. If BASE_URL is non-empty, the resulting URL will be `${BASE_URL}/audio/mcb-trip.wav` and must be reachable.
- The component checks `ctx.state === 'running'` before playing; if the AudioContext is suspended (for example because no unlock gesture occurred) the sound won't play. This is deliberate (unlock on pointerdown) but if audio doesn't play during tests, ensure a user pointerdown occurred or explicitly resume the context earlier.


Real Life Feature, Working Principle, and Design
------------------------------------------------
Trip sound refers to the audible feedback or physical 'clack' of a breaker tripping. In real life, it is the sound of the spring-loaded mechanism violently releasing stored energy to separate contacts quickly and extinguish the arc.
