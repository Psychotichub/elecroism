import React from 'react';
import { useCircuitStore } from '../../store/circuitStore';
import { FiAlertTriangle, FiX } from 'react-icons/fi';

const FaultDialog: React.FC = () => {
  const { faultDialogEvent, dismissFault, circuit, resetTripped } =
    useCircuitStore();

  if (!faultDialogEvent) return null;

  const affectedComp = circuit.components.find(
    (c) => c.id === faultDialogEvent.affectedComponentId
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-[#1E1E2E] rounded-lg shadow-2xl border border-red-500/50 w-96 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-red-900/30 border-b border-red-500/30">
          <FiAlertTriangle className="text-red-400 text-lg" />
          <h3 className="text-sm font-bold text-red-300 flex-1">
            Circuit Fault Detected
          </h3>
          <button
            onClick={dismissFault}
            className="text-gray-400 hover:text-white"
          >
            <FiX />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <span className="text-gray-500">Fault Type:</span>
            <span className="text-red-300 font-medium capitalize">
              {faultDialogEvent.type.replace(/_/g, ' ')}
            </span>

            <span className="text-gray-500">Component:</span>
            <span className="text-gray-200">
              {affectedComp?.label || 'Unknown'}
            </span>

            <span className="text-gray-500">Severity:</span>
            <span
              className={`font-medium capitalize ${
                faultDialogEvent.severity === 'critical'
                  ? 'text-red-400'
                  : 'text-yellow-400'
              }`}
            >
              {faultDialogEvent.severity}
            </span>
          </div>

          <div className="bg-gray-800 rounded p-3">
            <p className="text-xs text-gray-300">
              {faultDialogEvent.message}
            </p>
          </div>

          <div className="bg-blue-900/20 rounded p-3 border border-blue-500/20">
            <p className="text-xs text-blue-300">
              💡 Reset the protection device after resolving the fault.
              Reduce load or fix wiring before re-energizing.
            </p>
          </div>

          <div className="flex gap-2">
            {affectedComp?.state === 'tripped' && (
              <button
                onClick={() => {
                  resetTripped(affectedComp.id);
                  dismissFault();
                }}
                className="flex-1 px-3 py-2 bg-yellow-600 text-white rounded text-xs font-medium hover:bg-yellow-500"
              >
                Reset Device
              </button>
            )}
            <button
              onClick={dismissFault}
              className="flex-1 px-3 py-2 bg-gray-700 text-gray-300 rounded text-xs font-medium hover:bg-gray-600"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaultDialog;
