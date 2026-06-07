import { usePPCtx } from '../PropertyPanelContext';
import { createConnectionPoints } from '../../../../store/circuitConnectionGeometry';

export const RenderTerminalBlockProps = () => { const { tc } = usePPCtx(); return (
    <>
      <p className={`es-typo-caption ${tc.textMuted} leading-snug`}>
        Terminal block provides a simple pass-through from <strong>IN</strong>{' '}
        to <strong>OUT</strong>. Use it to keep wiring organized in panel
        schematics and marshalling layouts.
      </p>
    </>
  );};

export const RenderBusbarProps = () => {
  const { tc, selectedComp, updateComponent } = usePPCtx();
  if (!selectedComp) return null;

  const leftCount = Math.max(
    1,
    Number(selectedComp.properties.busbarLeftCount ?? 3) || 3
  );
  const rightCount = Math.max(
    1,
    Number(selectedComp.properties.busbarRightCount ?? 3) || 3
  );

  const applyBusbarCounts = (nextLeft: number, nextRight: number) => {
    const left = Math.max(1, Math.min(40, Math.floor(nextLeft)));
    const right = Math.max(1, Math.min(40, Math.floor(nextRight)));
    const generated = createConnectionPoints(selectedComp.id, selectedComp.type, {
      busbarLeftCount: left,
      busbarRightCount: right,
    });

    // Keep existing terminal ids at the same geometric spot so existing wires stay attached.
    const byPos = new Map(
      selectedComp.connectionPoints.map((cp) => [`${cp.x},${cp.y}`, cp.id])
    );
    const connectionPoints = generated.map((cp) => {
      const key = `${cp.x},${cp.y}`;
      const existingId = byPos.get(key);
      return existingId ? { ...cp, id: existingId } : cp;
    });

    updateComponent(selectedComp.id, {
      properties: {
        ...selectedComp.properties,
        busbarLeftCount: left,
        busbarRightCount: right,
      },
      connectionPoints,
    });
  };

  return (
    <>
      <label className="block es-typo-body mb-1">
        Left side terminals
        <input
          type="number"
          min={1}
          max={40}
          className="input-field mt-1"
          value={leftCount}
          onChange={(e) => applyBusbarCounts(Number(e.target.value), rightCount)}
        />
      </label>
      <label className="block es-typo-body mb-1">
        Right side terminals
        <input
          type="number"
          min={1}
          max={40}
          className="input-field mt-1"
          value={rightCount}
          onChange={(e) => applyBusbarCounts(leftCount, Number(e.target.value))}
        />
      </label>
      <p className={`es-typo-caption ${tc.textMuted} leading-snug`}>
        Increase left/right terminal counts to extend the busbar in that direction.
        New terminals are created automatically as the bar grows.
      </p>
    </>
  );
};

