import { usePPCtx } from '../PropertyPanelContext';
import { Label } from '../PropertyPanelLabel';
import type { ComponentProperties } from '../../../../types';

// eslint-disable-next-line react-hooks/rules-of-hooks
export const renderSwitchProps = () => { const { selectedComp, updateProp, toggleComponent } = usePPCtx(); return (
    <>
      <Label text="Type">
        <select
          value={selectedComp!.properties.switchType || 'SPST'}
          onChange={(e) =>
            updateProp({
              switchType: e.target.value as ComponentProperties['switchType'],
            })
          }
          className="input-field"
        >
          <option value="SPST">SPST</option>
          <option value="SPDT">SPDT</option>
          <option value="DPST">DPST</option>
          <option value="DPDT">DPDT</option>
        </select>
      </Label>
      <Label text="State">
        <button
          onClick={() => toggleComponent(selectedComp!.id)}
          className={`px-3 py-1 rounded es-typo-body font-medium ${
            selectedComp!.state === 'on'
              ? 'bg-green-600 text-white'
              : 'bg-gray-600 text-gray-300'
          }`}
        >
          {selectedComp!.state === 'on' ? 'ON' : 'OFF'}
        </button>
      </Label>
    </>
  );};

// eslint-disable-next-line react-hooks/rules-of-hooks
export const renderTwoWaySwitchProps = () => { const { selectedComp, tc, toggleComponent } = usePPCtx(); return (
    <>
      <p className={`es-typo-body-sm ${tc.textMuted} leading-snug mb-2`}>
        Maintained SPDT: <strong>ON</strong> connects <strong>COM</strong> to{' '}
        <strong>T1</strong>; <strong>OFF</strong> connects <strong>COM</strong> to{' '}
        <strong>T2</strong>. Double-click the symbol on the canvas to flip throws, or
        use the button below.
      </p>
      <Label text="Throw">
        <button
          type="button"
          onClick={() => toggleComponent(selectedComp!.id)}
          className={`px-3 py-1 rounded es-typo-body font-medium ${
            selectedComp!.state === 'on'
              ? 'bg-green-600 text-white'
              : 'bg-sky-600 text-white'
          }`}
        >
          {selectedComp!.state === 'on' ? 'COM ↔ T1' : 'COM ↔ T2'}
        </button>
      </Label>
    </>
  );};

// eslint-disable-next-line react-hooks/rules-of-hooks
export const renderPushButtonProps = () => { const { selectedComp, tc, updateProp } = usePPCtx(); return (
    <>
      <Label text="Contact">
        <select
          value={selectedComp!.properties.buttonType || 'NO'}
          onChange={(e) =>
            updateProp({
              buttonType: e.target.value as 'NO' | 'NC',
            })
          }
          className="input-field"
        >
          <option value="NO">Normally open (NO)</option>
          <option value="NC">Normally closed (NC)</option>
        </select>
      </Label>
      <p className={`es-typo-caption ${tc.textMuted} leading-snug`}>
        Select tool: hold on the symbol — NO closes the contact while held; NC
        opens it while held. The label shows contact state (Closed/Open), not
        “power on”.
      </p>
    </>
  );};

// eslint-disable-next-line react-hooks/rules-of-hooks
export const renderEStopProps = () => { const { selectedComp, tc, toggleComponent } = usePPCtx(); return (
    <>
      <Label text="State">
        <span
          className={`es-typo-body font-medium ${
            selectedComp!.state === 'on' ? 'text-green-400' : 'text-red-400'
          }`}
        >
          {selectedComp!.state === 'on'
            ? 'NC contact CLOSED (head not pressed)'
            : 'LATCHED — circuit OPEN'}
        </span>
      </Label>
      <button
        type="button"
        onClick={() => toggleComponent(selectedComp!.id)}
        className={`w-full px-3 py-2 rounded es-typo-body font-semibold ${
          selectedComp!.state === 'on'
            ? 'bg-red-600 text-white hover:bg-red-700'
            : 'bg-emerald-600 text-white hover:bg-emerald-700'
        }`}
      >
        {selectedComp!.state === 'on'
          ? 'PRESS — Latch open'
          : 'TWIST TO RELEASE — Reset'}
      </button>
      <p className={`es-typo-caption ${tc.textMuted} leading-snug`}>
        Wire <strong>IN/OUT</strong> in series with the contactor coil A1/A2
        loop. Pressing the head latches the contact open until reset, killing
        every coil downstream.
      </p>
    </>
  );};

// eslint-disable-next-line react-hooks/rules-of-hooks
export const renderDoorInterlockProps = () => { const { selectedComp, tc, toggleComponent } = usePPCtx(); return (
    <>
      <Label text="Door state">
        <span
          className={`es-typo-body font-medium ${
            selectedComp!.state === 'on' ? 'text-green-400' : 'text-yellow-300'
          }`}
        >
          {selectedComp!.state === 'on'
            ? 'Door CLOSED — interlock contact CLOSED'
            : 'Door OPEN — interlock contact OPEN'}
        </span>
      </Label>
      <button
        type="button"
        onClick={() => toggleComponent(selectedComp!.id)}
        className={`w-full px-3 py-2 rounded es-typo-body font-semibold ${
          selectedComp!.state === 'on'
            ? 'bg-yellow-600 text-white hover:bg-yellow-700'
            : 'bg-emerald-600 text-white hover:bg-emerald-700'
        }`}
      >
        {selectedComp!.state === 'on' ? 'Open door' : 'Close door'}
      </button>
      <p className={`es-typo-caption ${tc.textMuted} leading-snug`}>
        Use this in series with coil circuits so opening the panel door removes
        control power to hazardous motion.
      </p>
    </>
  );};

export const renderSelectorSwitchProps = () => {
// eslint-disable-next-line react-hooks/rules-of-hooks
    const { selectedComp, updateProp, tc } = usePPCtx();
    if (!selectedComp) return null;
    const positions: ('OFF' | 'AUTO' | 'MANUAL')[] = ['OFF', 'AUTO', 'MANUAL'];
    const cur = selectedComp.properties.selectorPosition ?? 'OFF';
    return (
      <>
        <Label text="Position">
          <div className="flex gap-1">
            {positions.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => updateProp({ selectorPosition: p })}
                className={`flex-1 px-2 py-1 rounded es-typo-body ${
                  cur === p
                    ? p === 'AUTO'
                      ? 'bg-emerald-600 text-white'
                      : p === 'MANUAL'
                        ? 'bg-sky-600 text-white'
                        : 'bg-gray-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </Label>
        <p className={`es-typo-caption ${tc.textMuted} leading-snug`}>
          AUTO bridges <strong>COM ↔ AUTO</strong> (BMS / interlock control of
          the coil). MANUAL bridges <strong>COM ↔ MAN</strong> (panel push-
          buttons). OFF opens both, isolating the contactor.
        </p>
        <Label text="ATS sequence controller">
          <button
            type="button"
            onClick={() =>
              updateProp({ atsController: !selectedComp.properties.atsController })
            }
            className={`w-full rounded px-3 py-2 es-typo-body font-medium ${
              selectedComp.properties.atsController
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-600 text-gray-300'
            }`}
          >
            {selectedComp.properties.atsController ? 'Enabled' : 'Disabled'}
          </button>
        </Label>
        {selectedComp.properties.atsController ? (
          <>
            <Label text="Transition">
              <div className="flex gap-1">
                {(['open', 'closed'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => updateProp({ atsTransition: mode })}
                    className={`flex-1 rounded px-2 py-1 es-typo-body capitalize ${
                      (selectedComp.properties.atsTransition ?? 'open') === mode
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-600 text-gray-300'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </Label>
            <Label text="Utility fail (ms)">
              <input
                type="number"
                min={0}
                step={100}
                value={selectedComp.properties.atsUtilityFailAtMs ?? 2000}
                onChange={(e) =>
                  updateProp({ atsUtilityFailAtMs: Math.max(0, Number(e.target.value)) })
                }
                className="input-field"
              />
            </Label>
            <Label text="Gen start delay (ms)">
              <input
                type="number"
                min={0}
                step={100}
                value={selectedComp.properties.atsGenStartDelayMs ?? 1500}
                onChange={(e) =>
                  updateProp({ atsGenStartDelayMs: Math.max(0, Number(e.target.value)) })
                }
                className="input-field"
              />
            </Label>
            <Label text="Transfer delay (ms)">
              <input
                type="number"
                min={0}
                step={100}
                value={selectedComp.properties.atsTransferDelayMs ?? 1000}
                onChange={(e) =>
                  updateProp({ atsTransferDelayMs: Math.max(0, Number(e.target.value)) })
                }
                className="input-field"
              />
            </Label>
            <Label text="Utility restore (ms, 0=off)">
              <input
                type="number"
                min={0}
                step={500}
                value={selectedComp.properties.atsUtilityRestoreAtMs ?? 0}
                onChange={(e) => {
                  const v = Math.max(0, Number(e.target.value));
                  updateProp({ atsUtilityRestoreAtMs: v > 0 ? v : undefined });
                }}
                className="input-field"
              />
            </Label>
            <p className={`es-typo-caption ${tc.textMuted} leading-snug`}>
              Labels default to Mains / Generator / KM-M / KM-G. Record the
              oscilloscope on <strong>ATS transfer</strong> to step through
              utility fail → gen start → transfer → retransfer.
            </p>
          </>
        ) : null}
      </>
    );
  };

