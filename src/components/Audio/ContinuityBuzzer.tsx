import { useEffect, useMemo, useRef } from 'react';
import { useCircuitStore } from '../../store/circuitStore';

const BUZZER_FREQ_HZ = 1850;
const BUZZER_GAIN = 0.03;

const ContinuityBuzzer: React.FC = () => {
  const circuit = useCircuitStore((s) => s.circuit);
  const simulationResult = useCircuitStore((s) => s.simulationResult);

  const continuityActive = useMemo(() => {
    if (!simulationResult) return false;
    return circuit.components.some((c) => {
      if (c.type !== 'multimeter') return false;
      if ((c.properties.multimeterMode ?? 'voltage') !== 'continuity') return false;
      const node = simulationResult.nodes[c.id];
      return !!node && (node.powerW ?? 0) > 0.5;
    });
  }, [circuit.components, simulationResult]);

  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const unlock = () => {
      if (ctxRef.current) {
        if (ctxRef.current.state === 'suspended') {
          void ctxRef.current.resume();
        }
        return;
      }
      const AC =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.connect(ctx.destination);

      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = BUZZER_FREQ_HZ;
      osc.connect(gain);
      osc.start();

      ctxRef.current = ctx;
      gainRef.current = gain;
      oscRef.current = osc;
      startedRef.current = true;
    };

    window.addEventListener('pointerdown', unlock, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      if (startedRef.current) {
        try {
          oscRef.current?.stop();
        } catch {
          // oscillator may already be stopped
        }
        oscRef.current?.disconnect();
        gainRef.current?.disconnect();
        void ctxRef.current?.close();
      }
      oscRef.current = null;
      gainRef.current = null;
      ctxRef.current = null;
      startedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const gain = gainRef.current;
    const ctx = ctxRef.current;
    if (!gain || !ctx) return;
    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setTargetAtTime(
      continuityActive ? BUZZER_GAIN : 0,
      now,
      continuityActive ? 0.01 : 0.03
    );
  }, [continuityActive]);

  return null;
};

export default ContinuityBuzzer;
