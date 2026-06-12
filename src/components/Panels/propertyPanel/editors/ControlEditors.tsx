import { usePPCtx } from '../PropertyPanelContext';
import { Label } from '../PropertyPanelLabel';
import type { ComponentProperties } from '../../../../types';
import { useUiStore } from '../../../../store/uiStore';

export const RenderTimerProps = () => {
  const { selectedComp, tc, updateProp } = usePPCtx();
  return (
    <>
      <Label text="Timer mode">
        <span className={`es-typo-body ${tc.textMuted}`}>
          ON-delay (coil energizes first, contact closes after delay)
        </span>
      </Label>
      <Label text="Delay (ms)">
        <input
          type="number"
          value={selectedComp!.properties.timerDelayMs ?? 1000}
          onChange={(e) =>
            updateProp({ timerDelayMs: Math.max(0, Number(e.target.value) || 0) })
          }
          className="input-field"
          min={0}
          step={100}
        />
      </Label>
      <Label text="Quick presets">
        <div className="flex gap-1 flex-wrap">
          {[200, 500, 1000, 3000, 5000, 10000].map((ms) => (
            <button
              key={ms}
              type="button"
              onClick={() => updateProp({ timerDelayMs: ms })}
              className={`px-2 py-1 rounded es-typo-body ${
                (selectedComp!.properties.timerDelayMs ?? 1000) === ms
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-600 text-gray-300'
              }`}
            >
              {ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(ms % 1000 ? 1 : 0)}s`}
            </button>
          ))}
        </div>
      </Label>
      <Label text="Contact state">
        <span
          className={`es-typo-body font-medium ${
            selectedComp!.state === 'on' ? 'text-green-400' : tc.textMuted
          }`}
        >
          {selectedComp!.state === 'on'
            ? 'NO closed, NC open — delay elapsed'
            : 'NC closed, NO open — waiting for coil + delay'}
        </span>
      </Label>
      <p className={`es-typo-caption ${tc.textMuted} leading-snug`}>
        Wire <strong>A1/A2</strong> as timer coil supply. Use{' '}
        <strong>COM↔NO</strong> for delayed make and <strong>COM↔NC</strong> for
        delayed break behavior. The timer resets instantly when coil drops.
      </p>
    </>
  );};

export const RenderSmartRelayProps = () => {
  const { selectedComp, tc, updateProp } = usePPCtx();
  const program = selectedComp!.properties.smartRelayProgram ?? 'OUT1 = IN1';
  return (
    <>
      <Label text="Logic program">
        <input
          type="text"
          value={program}
          onChange={(e) => updateProp({ smartRelayProgram: e.target.value })}
          className="input-field font-mono"
          spellCheck={false}
          placeholder="OUT1 = IN1 AND NOT IN2"
        />
      </Label>
      <Label text="Quick presets">
        <div className="flex gap-1 flex-wrap">
          {[
            'OUT1 = IN1',
            'OUT1 = IN1 AND IN2',
            'OUT1 = IN1 AND NOT IN2',
            'OUT1 = IN1 OR IN2',
          ].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => updateProp({ smartRelayProgram: preset })}
              className={`px-2 py-1 rounded es-typo-body ${
                program === preset
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-600 text-gray-300'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </Label>
      <Label text="Contact rating (A)">
        <input
          type="number"
          value={selectedComp!.properties.ratingAmps ?? 10}
          onChange={(e) =>
            updateProp({
              ratingAmps: Math.max(0, Number(e.target.value) || 0),
            })
          }
          className="input-field"
          min={0}
        />
      </Label>
      <Label text="Output state">
        <span
          className={`es-typo-body font-medium ${
            selectedComp!.state === 'on' ? 'text-green-400' : tc.textMuted
          }`}
        >
          {selectedComp!.state === 'on'
            ? 'T1↔T2 closed — logic true + A1/A2 powered'
            : 'T1↔T2 open — logic false or coil supply missing'}
        </span>
      </Label>
      <p className={`es-typo-caption ${tc.textMuted} leading-snug`}>
        Wire <strong>IN1/IN2</strong> to digital inputs (live, neutral, or PE
        counts as active). Supply <strong>A1/A2</strong> for internal logic.
        Program gates <strong>T1↔T2</strong> when the equation evaluates true.
      </p>
    </>
  );
};

export const RenderInterposingRelayProps = () => {
  const { selectedComp, tc, updateProp } = usePPCtx();
  return (
    <>
      <Label text="Coil voltage (V)">
        <div className="flex gap-1 flex-wrap">
          {[12, 24, 48, 110, 230].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() =>
                updateProp({
                  relayCoilVoltage: v,
                  relayCoilSupply:
                    v === 230 ? '230ac' : v === 110 ? '110dc' : '24dc',
                })
              }
              className={`px-2 py-1 rounded es-typo-body ${
                (selectedComp!.properties.relayCoilVoltage ?? 24) === v
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-600 text-gray-300'
              }`}
            >
              {v} V
            </button>
          ))}
        </div>
      </Label>
      <Label text="Coil supply (panel schedule)">
        <select
          value={selectedComp!.properties.relayCoilSupply ?? '24dc'}
          onChange={(e) =>
            updateProp({
              relayCoilSupply: e.target
                .value as ComponentProperties['relayCoilSupply'],
            })
          }
          className="input-field"
        >
          <option value="24dc">+24 V DC (typ. BMS)</option>
          <option value="110dc">+110 V DC</option>
          <option value="230ac">230 V AC</option>
        </select>
      </Label>
      <Label text="Contact rating (A)">
        <input
          type="number"
          value={selectedComp!.properties.ratingAmps ?? 6}
          onChange={(e) =>
            updateProp({
              ratingAmps: Math.max(0, Number(e.target.value) || 0),
            })
          }
          className="input-field"
          min={0}
        />
      </Label>
      <p className={`es-typo-caption ${tc.textMuted} leading-snug`}>
        Coil A1/A2 picked up → IN/OUT NO contact closes. Use one between any
        BMS digital output and a contactor coil so the BMS never lands
        directly on a heavy AC coil.
      </p>
    </>
  );};

export const RenderAuxContactBlockProps = () => {
  const { circuit, selectedComp, updateProp, tc } = usePPCtx();

  const pickingTargetCoilId = useUiStore((s) => s.pickingTargetCoilId);
  const setPickingTargetCoilId = useUiStore((s) => s.setPickingTargetCoilId);
  const setCanvasStatusMessage = useUiStore((s) => s.setCanvasStatusMessage);

  if (!selectedComp) return null;

  const followCoilTypes: ReadonlyArray<(typeof circuit.components)[0]['type']> = [
    'contactor',
    'relay',
    'smart_relay',
    'timer',
    'three_phase_contactor',
    'four_phase_contactor',
    'interposing_relay',
  ];
  const coilTargets = circuit.components.filter((c) =>
    followCoilTypes.includes(c.type)
  );
  const followId = selectedComp.properties.auxContactFollowContactorId ?? '';
  return (
    <>
      <Label text="Contact rating (A)">
        <input
          type="number"
          value={selectedComp.properties.ratingAmps ?? 10}
          onChange={(e) =>
            updateProp({
              ratingAmps: Math.max(0, Number(e.target.value) || 0),
            })
          }
          className="input-field"
          min={0}
        />
      </Label>
      <Label text="Mirror coil (seal-in / interlock)">
        <div className="flex gap-1.5 items-center">
          <select
            className="input-field flex-1"
            value={followId}
            onChange={(e) => {
              const v = e.target.value.trim();
              updateProp({
                auxContactFollowContactorId: v ? v : undefined,
              });
            }}
          >
            <option value="">Manual — On/Off toggles 13–14 vs 21–22</option>
            {coilTargets.map((c) => {
              let typeLabel = c.type.replaceAll('_', ' ');
              typeLabel = typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1);
              return (
                <option key={c.id} value={c.id}>
                  {c.label} ({typeLabel})
                </option>
              );
            })}
          </select>
          <button
            type="button"
            onClick={() => {
              if (pickingTargetCoilId === selectedComp.id) {
                setPickingTargetCoilId(null);
                setCanvasStatusMessage('');
              } else {
                setPickingTargetCoilId(selectedComp.id);
                setCanvasStatusMessage(
                  'Link mode: Click a contactor, relay, or timer on the canvas to link it. Press Escape to cancel.'
                );
              }
            }}
            className={`px-2.5 py-1.5 rounded text-xs font-semibold transition-all duration-150 shrink-0 ${
              pickingTargetCoilId === selectedComp.id
                ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            {pickingTargetCoilId === selectedComp.id ? 'Cancel' : 'Pick...'}
          </button>
        </div>
      </Label>
      <p className={`es-typo-caption ${tc.textMuted} leading-snug`}>
        For a <strong>seal-in</strong> path wired to this block’s{' '}
        <strong>13–14</strong>, choose the same contactor/relay whose coil is{' '}
        <strong>A1/A2</strong>. Otherwise 13–14 stays open unless you set the
        block to <strong>On</strong> manually. Built-in <strong>13/14/21/22</strong>{' '}
        on the contactor symbol already follow the coil automatically.
      </p>
    </>
  );
};

export const RenderMechanicalInterlockProps = () => {
  const { circuit, selectedComp, updateProp, tc } = usePPCtx();
  const pickingTargetCoilId = useUiStore((s) => s.pickingTargetCoilId);
  const pickingTargetProperty = useUiStore((s) => s.pickingTargetProperty);
  const setPickingTargetCoilId = useUiStore((s) => s.setPickingTargetCoilId);
  const setCanvasStatusMessage = useUiStore((s) => s.setCanvasStatusMessage);

  if (!selectedComp) return null;

  const contactorTypes: ReadonlyArray<string> = [
    'contactor',
    'three_phase_contactor',
    'four_phase_contactor',
  ];
  const contactorTargets = circuit.components.filter((c) =>
    contactorTypes.includes(c.type)
  );

  const contactorId1 = selectedComp.properties.interlockContactorId1 ?? '';
  const contactorId2 = selectedComp.properties.interlockContactorId2 ?? '';

  const renderPickerButton = (propName: 'interlockContactorId1' | 'interlockContactorId2') => {
    const isPickingThis = pickingTargetCoilId === selectedComp.id && pickingTargetProperty === propName;
    return (
      <button
        type="button"
        onClick={() => {
          if (isPickingThis) {
            setPickingTargetCoilId(null);
            setCanvasStatusMessage('');
          } else {
            setPickingTargetCoilId(selectedComp.id, propName);
            setCanvasStatusMessage(
              'Link mode: Click a contactor on the canvas to link it. Press Escape to cancel.'
            );
          }
        }}
        className={`px-2.5 py-1.5 rounded text-xs font-semibold transition-all duration-150 shrink-0 ${
          isPickingThis
            ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse'
            : 'bg-indigo-600 hover:bg-indigo-500 text-white'
        }`}
      >
        {isPickingThis ? 'Cancel' : 'Pick...'}
      </button>
    );
  };

  return (
    <>
      <Label text="First Contactor">
        <div className="flex gap-1.5 items-center">
          <select
            className="input-field flex-1"
            value={contactorId1}
            onChange={(e) => {
              const v = e.target.value.trim();
              updateProp({
                interlockContactorId1: v ? v : undefined,
              });
            }}
          >
            <option value="">None</option>
            {contactorTargets.map((c) => {
              let typeLabel = c.type.replaceAll('_', ' ');
              typeLabel = typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1);
              return (
                <option key={c.id} value={c.id} disabled={c.id === contactorId2}>
                  {c.label} ({typeLabel})
                </option>
              );
            })}
          </select>
          {renderPickerButton('interlockContactorId1')}
        </div>
      </Label>

      <Label text="Second Contactor">
        <div className="flex gap-1.5 items-center">
          <select
            className="input-field flex-1"
            value={contactorId2}
            onChange={(e) => {
              const v = e.target.value.trim();
              updateProp({
                interlockContactorId2: v ? v : undefined,
              });
            }}
          >
            <option value="">None</option>
            {contactorTargets.map((c) => {
              let typeLabel = c.type.replaceAll('_', ' ');
              typeLabel = typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1);
              return (
                <option key={c.id} value={c.id} disabled={c.id === contactorId1}>
                  {c.label} ({typeLabel})
                </option>
              );
            })}
          </select>
          {renderPickerButton('interlockContactorId2')}
        </div>
      </Label>

      <p className={`es-typo-caption ${tc.textMuted} leading-snug`}>
        A mechanical interlock prevents concurrent closing of the two linked contactors. If both are closed or energized simultaneously, it raises a collision fault.
      </p>
    </>
  );
};

export const RenderKeyInterlockProps = () => {
  const { circuit, selectedComp, updateProp, toggleComponent, tc } = usePPCtx();
  const pickingTargetCoilId = useUiStore((s) => s.pickingTargetCoilId);
  const pickingTargetProperty = useUiStore((s) => s.pickingTargetProperty);
  const setPickingTargetCoilId = useUiStore((s) => s.setPickingTargetCoilId);
  const setCanvasStatusMessage = useUiStore((s) => s.setCanvasStatusMessage);

  if (!selectedComp) return null;

  const switchBreakerTypes = [
    'switch',
    'mcb',
    'three_phase_mcb',
    'four_phase_mcb',
    'mccb',
    'motorized_mccb',
    'four_pole_motorized_mccb',
    'air_circuit_breaker',
  ];
  const switchBreakerTargets = circuit.components.filter((c) =>
    switchBreakerTypes.includes(c.type)
  );

  const targetSwitchId = selectedComp.properties.keyInterlockSwitchId ?? '';

  const isPickingThis = pickingTargetCoilId === selectedComp.id && pickingTargetProperty === 'keyInterlockSwitchId';

  return (
    <>
      <Label text="Interlock state">
        <button
          type="button"
          onClick={() => toggleComponent(selectedComp.id)}
          className={`w-full px-3 py-2 rounded es-typo-body font-semibold ${
            selectedComp.state === 'on'
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-600 text-white hover:bg-gray-700'
          }`}
        >
          {selectedComp.state === 'on' ? 'Closed (key engaged)' : 'Open (key removed)'}
        </button>
      </Label>

      <Label text="Restrict Switch/Breaker">
        <div className="flex gap-1.5 items-center">
          <select
            className="input-field flex-1"
            value={targetSwitchId}
            onChange={(e) => {
              const v = e.target.value.trim();
              updateProp({
                keyInterlockSwitchId: v ? v : undefined,
              });
            }}
          >
            <option value="">None</option>
            {switchBreakerTargets.map((c) => {
              let typeLabel = c.type.replaceAll('_', ' ');
              typeLabel = typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1);
              return (
                <option key={c.id} value={c.id}>
                  {c.label} ({typeLabel})
                </option>
              );
            })}
          </select>
          <button
            type="button"
            onClick={() => {
              if (isPickingThis) {
                setPickingTargetCoilId(null);
                setCanvasStatusMessage('');
              } else {
                setPickingTargetCoilId(selectedComp.id, 'keyInterlockSwitchId');
                setCanvasStatusMessage(
                  'Link mode: Click a switch or breaker on the canvas to link it. Press Escape to cancel.'
                );
              }
            }}
            className={`px-2.5 py-1.5 rounded text-xs font-semibold transition-all duration-150 shrink-0 ${
              isPickingThis
                ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            {isPickingThis ? 'Cancel' : 'Pick...'}
          </button>
        </div>
      </Label>

      <p className={`es-typo-caption ${tc.textMuted} leading-snug`}>
        A key interlock restricts the closing of a linked switch/breaker. If the key is removed (Open) but the target switch/breaker is turned ON, a warning will be raised.
      </p>
    </>
  );
};


/**
 * Property editor for C8 breaker accessories:
 * shunt_trip_coil / closing_coil / uvr_release / motor_operator_kit.
 *
 * Shows coil voltage, parent breaker picker, motor operator direction (if
 * applicable), and a live simulation status badge.
 */
export const RenderBreakerAccessoryProps = () => {
  const { circuit, selectedComp, nodeResult, updateProp, tc } = usePPCtx();
  const pickingTargetCoilId = useUiStore((s) => s.pickingTargetCoilId);
  const pickingTargetProperty = useUiStore((s) => s.pickingTargetProperty);
  const setPickingTargetCoilId = useUiStore((s) => s.setPickingTargetCoilId);
  const setCanvasStatusMessage = useUiStore((s) => s.setCanvasStatusMessage);

  if (!selectedComp) return null;

  const type = selectedComp.type;
  const isMotorOp = type === 'motor_operator_kit';
  const isUvr = type === 'uvr_release';

  const typeLabel =
    type === 'shunt_trip_coil' ? 'Shunt Trip Coil'
    : type === 'closing_coil' ? 'Closing Coil'
    : type === 'uvr_release' ? 'UVR Release'
    : 'Motor Operator Kit';

  const breakerParentTypes = [
    'mccb',
    'motorized_mccb',
    'four_pole_motorized_mccb',
    'air_circuit_breaker',
    'three_phase_mcb',
    'motor_protection_circuit_breaker',
  ];
  const breakerTargets = circuit.components.filter((c) =>
    breakerParentTypes.includes(c.type) && c.id !== selectedComp.id
  );

  const parentId = selectedComp.properties.breakerParentId ?? '';
  const parentComp = parentId ? circuit.components.find((c) => c.id === parentId) : undefined;

  const isPickingThis =
    pickingTargetCoilId === selectedComp.id &&
    pickingTargetProperty === 'breakerParentId';

  const coilEnergized = nodeResult?.energized ?? false;

  return (
    <>
      {/* Badge */}
      <div
        className="px-2 py-1 rounded text-xs font-semibold mb-1 bg-blue-900/40 text-blue-300 border border-blue-500/20"
        style={{ display: 'inline-block' }}
      >
        {typeLabel}
      </div>

      {/* Coil voltage */}
      {!isMotorOp && (
        <Label text={isUvr ? 'Hold voltage (V)' : 'Coil voltage (V)'}>
          <input
            type="number"
            value={selectedComp.properties.voltage ?? 24}
            onChange={(e) =>
              updateProp({ voltage: Math.max(0, Number(e.target.value) || 0) })
            }
            className="input-field"
            min={0}
          />
        </Label>
      )}

      {/* Motor operator voltage */}
      {isMotorOp && (
        <Label text="Control supply voltage (V)">
          <input
            type="number"
            value={selectedComp.properties.voltage ?? 230}
            onChange={(e) =>
              updateProp({ voltage: Math.max(0, Number(e.target.value) || 0) })
            }
            className="input-field"
            min={0}
          />
        </Label>
      )}

      {/* Motor operator command direction */}
      {isMotorOp && (
        <Label text="Motor command">
          <div className="flex gap-1.5">
            {(['close', 'open'] as const).map((cmd) => (
              <button
                key={cmd}
                type="button"
                onClick={() => updateProp({ motorOperatorCommand: cmd })}
                className={`flex-1 px-2 py-1.5 rounded es-typo-body font-semibold transition-colors ${
                  (selectedComp.properties.motorOperatorCommand ?? 'close') === cmd
                    ? cmd === 'close'
                      ? 'bg-green-600 text-white'
                      : 'bg-amber-600 text-white'
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                {cmd === 'close' ? '⬆ Close' : '⬇ Open'}
              </button>
            ))}
          </div>
        </Label>
      )}

      {/* Parent breaker picker */}
      <Label text="Parent Breaker">
        <div className="flex gap-1.5 items-center">
          <select
            className="input-field flex-1"
            value={parentId}
            onChange={(e) => {
              const v = e.target.value.trim();
              updateProp({ breakerParentId: v ? v : undefined });
            }}
          >
            <option value="">— Not linked —</option>
            {breakerTargets.map((c) => {
              const tl = c.type.replaceAll('_', ' ');
              return (
                <option key={c.id} value={c.id}>
                  {c.label} ({tl.charAt(0).toUpperCase() + tl.slice(1)})
                </option>
              );
            })}
          </select>
          <button
            type="button"
            onClick={() => {
              if (isPickingThis) {
                setPickingTargetCoilId(null);
                setCanvasStatusMessage('');
              } else {
                setPickingTargetCoilId(selectedComp.id, 'breakerParentId');
                setCanvasStatusMessage(
                  'Link mode: Click an MCCB or ACB on the canvas to link it as parent. Press Escape to cancel.'
                );
              }
            }}
            className={`px-2.5 py-1.5 rounded text-xs font-semibold transition-all duration-150 shrink-0 ${
              isPickingThis
                ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse'
                : 'bg-sky-600 hover:bg-sky-500 text-white'
            }`}
          >
            {isPickingThis ? 'Cancel' : 'Pick...'}
          </button>
        </div>
        {parentComp && (
          <p className="es-typo-caption text-green-400 mt-1">
            ✓ Linked to &quot;{parentComp.label}&quot; ({parentComp.state})
          </p>
        )}
        {!parentComp && parentId && (
          <p className="es-typo-caption text-red-400 mt-1">
            ✗ Linked breaker no longer exists — re-select.
          </p>
        )}
      </Label>

      {/* Simulation status */}
      <Label text="Simulation status">
        <span
          className={`es-typo-body font-medium ${
            coilEnergized ? 'text-green-400' : tc.textMuted
          }`}
        >
          {isUvr
            ? coilEnergized
              ? '✓ Hold voltage present — breaker held closed'
              : '⚠ No hold voltage — breaker will drop open'
            : coilEnergized
              ? `✓ ${typeLabel} energized — action fired on parent`
              : `— ${typeLabel} not energized`}
        </span>
      </Label>

      <p className={`es-typo-caption ${tc.textMuted} leading-snug`}>
        {isUvr
          ? 'UVR release holds the breaker closed when coil (A1/A2) is energized. Loss of control voltage trips the breaker open.'
          : type === 'shunt_trip_coil'
            ? 'Shunt trip coil trips its parent breaker when A1/A2 are energized. Used for remote or protective trip commands.'
            : type === 'closing_coil'
              ? 'Closing coil resets a tripped/open breaker when A1/A2 are energized. UVR must also be held.'
              : 'Motor operator rotates the breaker handle. CTRL_L/CTRL_N supply drives the motor in the selected direction.'}
      </p>
    </>
  );
};
