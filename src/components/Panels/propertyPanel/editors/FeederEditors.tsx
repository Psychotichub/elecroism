import { usePPCtx } from '../PropertyPanelContext';
import { useCircuitStore } from '../../../../store/circuitStore';
import { isFeederRootType } from '../../../../utils/busDrop';

export const AddIdenticalFeederButton = () => {
  const { selectedComp, tc } = usePPCtx();
  const duplicateIdenticalFeeder = useCircuitStore(
    (s) => s.duplicateIdenticalFeeder
  );

  if (!selectedComp || !isFeederRootType(selectedComp.type)) return null;

  return (
    <div className="mt-2">
      <button
        type="button"
        className="w-full rounded bg-emerald-700 px-2 py-1.5 text-xs font-medium text-white hover:bg-emerald-600"
        onClick={() => duplicateIdenticalFeeder(selectedComp.id)}
      >
        Add identical feeder
      </button>
      <p className={`mt-1 text-[10px] leading-snug ${tc.textMuted}`}>
        Copies this breaker and its downstream load onto the next free busbar
        tap. Labels auto-increment (e.g. Q1 → Q3). Phase wires auto-route and
        auto-number.
      </p>
    </div>
  );
};
