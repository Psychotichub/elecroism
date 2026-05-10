import { usePPCtx } from '../PropertyPanelContext';
import { Label } from '../PropertyPanelLabel';

// eslint-disable-next-line react-hooks/rules-of-hooks
export const renderModbusTcpGatewayProps = () => { const { selectedComp, tc, updateProp } = usePPCtx(); return (
    <>
      <Label text="Gateway IP">
        <input
          type="text"
          value={selectedComp!.properties.gatewayIp ?? '192.168.1.100'}
          onChange={(e) => updateProp({ gatewayIp: e.target.value })}
          className="input-field"
        />
      </Label>
      <Label text="TCP port">
        <input
          type="number"
          value={selectedComp!.properties.gatewayPort ?? 502}
          onChange={(e) =>
            updateProp({ gatewayPort: Math.max(1, Number(e.target.value) || 1) })
          }
          className="input-field"
          min={1}
          max={65535}
        />
      </Label>
      <Label text="Subnet mask">
        <input
          type="text"
          value={selectedComp!.properties.gatewaySubnet ?? '255.255.255.0'}
          onChange={(e) => updateProp({ gatewaySubnet: e.target.value })}
          className="input-field"
        />
      </Label>
      <Label text="Default gateway">
        <input
          type="text"
          value={selectedComp!.properties.gatewayDefaultRoute ?? '192.168.1.1'}
          onChange={(e) => updateProp({ gatewayDefaultRoute: e.target.value })}
          className="input-field"
        />
      </Label>
      <Label text="RTU baud rate">
        <select
          value={selectedComp!.properties.serialBaudRate ?? 9600}
          onChange={(e) =>
            updateProp({
              serialBaudRate: Number(e.target.value) as
                | 9600
                | 19200
                | 38400
                | 57600
                | 115200,
            })
          }
          className="input-field"
        >
          {[9600, 19200, 38400, 57600, 115200].map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </Label>
      <Label text="RTU parity">
        <select
          value={selectedComp!.properties.serialParity ?? 'none'}
          onChange={(e) =>
            updateProp({ serialParity: e.target.value as 'none' | 'even' | 'odd' })
          }
          className="input-field"
        >
          <option value="none">None</option>
          <option value="even">Even</option>
          <option value="odd">Odd</option>
        </select>
      </Label>
      <Label text="RTU stop bits">
        <select
          value={selectedComp!.properties.serialStopBits ?? 1}
          onChange={(e) => updateProp({ serialStopBits: Number(e.target.value) as 1 | 2 })}
          className="input-field"
        >
          <option value={1}>1</option>
          <option value={2}>2</option>
        </select>
      </Label>
      <Label text="RTU data bits">
        <select
          value={selectedComp!.properties.serialDataBits ?? 8}
          onChange={(e) => updateProp({ serialDataBits: Number(e.target.value) as 7 | 8 })}
          className="input-field"
        >
          <option value={7}>7</option>
          <option value={8}>8</option>
        </select>
      </Label>
      <Label text="Default RTU slave ID">
        <input
          type="number"
          value={selectedComp!.properties.modbusDefaultSlaveId ?? 1}
          onChange={(e) =>
            updateProp({
              modbusDefaultSlaveId: Math.max(1, Math.min(247, Number(e.target.value) || 1)),
            })
          }
          className="input-field"
          min={1}
          max={247}
        />
      </Label>
      <p className={`text-[10px] ${tc.textMuted} leading-snug`}>
        Bridges Modbus TCP to Modbus RTU. Keep all downstream RTU devices on matching
        serial settings (baud/parity/stop/data bits). Map TCP requests to RTU via slave ID.
      </p>
      <Label text="Terminal number map">
        <div className={`text-[10px] ${tc.textMuted} space-y-0.5`}>
          {selectedComp!.connectionPoints.map((cp, idx) => (
            <div key={cp.id}>
              <strong>{idx + 1}</strong> = {cp.label}
            </div>
          ))}
        </div>
      </Label>
    </>
  )};

// eslint-disable-next-line react-hooks/rules-of-hooks
export const renderBacnetIpGatewayProps = () => { const { selectedComp, tc, updateProp } = usePPCtx(); return (
    <>
      <Label text="Gateway IP">
        <input
          type="text"
          value={selectedComp!.properties.gatewayIp ?? '192.168.1.110'}
          onChange={(e) => updateProp({ gatewayIp: e.target.value })}
          className="input-field"
        />
      </Label>
      <Label text="UDP port">
        <input
          type="number"
          value={selectedComp!.properties.gatewayPort ?? 47808}
          onChange={(e) =>
            updateProp({ gatewayPort: Math.max(1, Number(e.target.value) || 1) })
          }
          className="input-field"
          min={1}
          max={65535}
        />
      </Label>
      <Label text="Subnet mask">
        <input
          type="text"
          value={selectedComp!.properties.gatewaySubnet ?? '255.255.255.0'}
          onChange={(e) => updateProp({ gatewaySubnet: e.target.value })}
          className="input-field"
        />
      </Label>
      <Label text="Default gateway">
        <input
          type="text"
          value={selectedComp!.properties.gatewayDefaultRoute ?? '192.168.1.1'}
          onChange={(e) => updateProp({ gatewayDefaultRoute: e.target.value })}
          className="input-field"
        />
      </Label>
      <Label text="BACnet device instance">
        <input
          type="number"
          value={selectedComp!.properties.bacnetDeviceInstance ?? 110001}
          onChange={(e) =>
            updateProp({
              bacnetDeviceInstance: Math.max(1, Number(e.target.value) || 1),
            })
          }
          className="input-field"
          min={1}
        />
      </Label>
      <Label text="BBMD enabled">
        <input
          type="checkbox"
          checked={selectedComp!.properties.bacnetBbmdEnabled ?? false}
          onChange={(e) => updateProp({ bacnetBbmdEnabled: e.target.checked })}
        />
      </Label>
      {(selectedComp!.properties.bacnetBbmdEnabled ?? false) && (
        <Label text="BBMD IP">
          <input
            type="text"
            value={selectedComp!.properties.bacnetBbmdIp ?? ''}
            onChange={(e) => updateProp({ bacnetBbmdIp: e.target.value })}
            className="input-field"
            placeholder="192.168.1.10"
          />
        </Label>
      )}
      <Label text="MS/TP baud rate">
        <select
          value={selectedComp!.properties.serialBaudRate ?? 38400}
          onChange={(e) =>
            updateProp({
              serialBaudRate: Number(e.target.value) as
                | 9600
                | 19200
                | 38400
                | 57600
                | 115200,
            })
          }
          className="input-field"
        >
          {[9600, 19200, 38400, 57600, 115200].map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </Label>
      <Label text="MS/TP MAC address">
        <input
          type="number"
          value={selectedComp!.properties.mstpMacAddress ?? 1}
          onChange={(e) =>
            updateProp({
              mstpMacAddress: Math.max(0, Math.min(127, Number(e.target.value) || 0)),
            })
          }
          className="input-field"
          min={0}
          max={127}
        />
      </Label>
      <Label text="MS/TP max master">
        <input
          type="number"
          value={selectedComp!.properties.mstpMaxMaster ?? 127}
          onChange={(e) =>
            updateProp({
              mstpMaxMaster: Math.max(1, Math.min(127, Number(e.target.value) || 1)),
            })
          }
          className="input-field"
          min={1}
          max={127}
        />
      </Label>
      <p className={`text-[10px] ${tc.textMuted} leading-snug`}>
        BACnet/IP bridge for BMS. Typical wiring uses Ethernet (`ETH0_RJ45`) and
        RS-485 MS/TP (`MSTP_A`, `MSTP_B`, `MSTP_GND`) with optional shield grounding.
      </p>
      <Label text="Terminal number map">
        <div className={`text-[10px] ${tc.textMuted} space-y-0.5`}>
          {selectedComp!.connectionPoints.map((cp, idx) => (
            <div key={cp.id}>
              <strong>{idx + 1}</strong> = {cp.label}
            </div>
          ))}
        </div>
      </Label>
    </>
  )};

// eslint-disable-next-line react-hooks/rules-of-hooks
export const renderBmsIOModuleProps = () => { const { selectedComp, tc, updateProp } = usePPCtx(); return (
    <>
      <Label text="Channels">
        <input
          type="number"
          value={
            selectedComp!.properties.ioChannels ??
            (selectedComp!.type === 'ai_module' || selectedComp!.type === 'ao_module'
              ? 4
              : 8)
          }
          onChange={(e) =>
            updateProp({ ioChannels: Math.max(1, Number(e.target.value) || 1) })
          }
          className="input-field"
          min={1}
          max={64}
        />
      </Label>
      {(selectedComp!.type === 'ai_module' || selectedComp!.type === 'ao_module') && (
        <Label text="Signal type">
          <div className="flex gap-1">
            {(['0_10v', '4_20ma'] as const).map((sig) => (
              <button
                key={sig}
                type="button"
                onClick={() =>
                  selectedComp!.type === 'ai_module'
                    ? updateProp({ aiSignalType: sig })
                    : updateProp({ aoSignalType: sig })
                }
                className={`px-2 py-1 rounded text-xs ${
                  (selectedComp!.type === 'ai_module'
                    ? selectedComp!.properties.aiSignalType ?? '0_10v'
                    : selectedComp!.properties.aoSignalType ?? '0_10v') === sig
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-600 text-gray-300'
                }`}
              >
                {sig === '0_10v' ? '0-10V' : '4-20mA'}
              </button>
            ))}
          </div>
        </Label>
      )}
      <p className={`text-[10px] ${tc.textMuted} leading-snug`}>
        Use DI/DO for status/command points and AI/AO for analog process values.
        Wire module power on <strong>PWR_L / PWR_N</strong>; channel points are
        represented as properties for planning-level diagrams.
      </p>
      <Label text="Terminal number map">
        <div className={`text-[10px] ${tc.textMuted} space-y-0.5`}>
          {selectedComp!.connectionPoints.map((cp, idx) => (
            <div key={cp.id}>
              <strong>{idx + 1}</strong> = {cp.label}
            </div>
          ))}
        </div>
      </Label>
    </>
  )};

// eslint-disable-next-line react-hooks/rules-of-hooks
export const renderCommInfraProps = () => { const { selectedComp, tc, updateProp } = usePPCtx(); return (
    <>
      {(selectedComp!.type === 'communication_converter' ||
        selectedComp!.type === 'iot_gateway' ||
        selectedComp!.type === 'cloud_monitoring_module' ||
        selectedComp!.type === 'energy_management_controller' ||
        selectedComp!.type === 'ethernet_switch') && (
        <>
          <Label
            text={
              selectedComp!.type === 'ethernet_switch'
                ? 'Management IP'
                : selectedComp!.type === 'iot_gateway'
                  ? 'Gateway IP'
                  : selectedComp!.type === 'cloud_monitoring_module'
                    ? 'Cloud endpoint'
                  : selectedComp!.type === 'energy_management_controller'
                    ? 'Controller IP'
                : 'Endpoint IP'
            }
          >
            <input
              type="text"
              value={
                selectedComp!.properties.gatewayIp ??
                (selectedComp!.type === 'ethernet_switch'
                  ? '192.168.1.200'
                  : selectedComp!.type === 'iot_gateway'
                    ? '10.10.10.10'
                    : selectedComp!.type === 'cloud_monitoring_module'
                      ? 'cloud.bms.local'
                      : selectedComp!.type === 'energy_management_controller'
                        ? '192.168.1.210'
                  : '192.168.1.120')
              }
              onChange={(e) => updateProp({ gatewayIp: e.target.value })}
              className="input-field"
            />
          </Label>
          {(selectedComp!.type === 'communication_converter' ||
            selectedComp!.type === 'iot_gateway' ||
            selectedComp!.type === 'cloud_monitoring_module' ||
            selectedComp!.type === 'energy_management_controller') && (
            <Label text="Endpoint port">
              <input
                type="number"
                value={
                  selectedComp!.properties.gatewayPort ??
                  (selectedComp!.type === 'iot_gateway'
                    ? 8883
                    : selectedComp!.type === 'cloud_monitoring_module'
                      ? 443
                      : selectedComp!.type === 'energy_management_controller'
                        ? 502
                      : 502)
                }
                onChange={(e) =>
                  updateProp({ gatewayPort: Math.max(1, Number(e.target.value) || 1) })
                }
                className="input-field"
                min={1}
                max={65535}
              />
            </Label>
          )}
        </>
      )}
      {selectedComp!.type === 'communication_converter' && (
        <>
          <Label text="Converter mode">
            <select
              value={
                selectedComp!.properties.commConverterMode ??
                'modbus_rtu_to_modbus_tcp'
              }
              onChange={(e) =>
                updateProp({
                  commConverterMode: e.target.value as
                    | 'rs232_to_rs485'
                    | 'rs485_to_ethernet'
                    | 'modbus_rtu_to_modbus_tcp'
                    | 'bacnet_mstp_to_bacnet_ip',
                })
              }
              className="input-field"
            >
              <option value="rs232_to_rs485">RS-232 ↔ RS-485</option>
              <option value="rs485_to_ethernet">RS-485 ↔ Ethernet</option>
              <option value="modbus_rtu_to_modbus_tcp">
                Modbus RTU ↔ Modbus TCP
              </option>
              <option value="bacnet_mstp_to_bacnet_ip">
                BACnet MS/TP ↔ BACnet/IP
              </option>
            </select>
          </Label>
          <Label text="Serial baud rate">
            <select
              value={selectedComp!.properties.serialBaudRate ?? 9600}
              onChange={(e) =>
                updateProp({
                  serialBaudRate: Number(e.target.value) as
                    | 9600
                    | 19200
                    | 38400
                    | 57600
                    | 115200,
                })
              }
              className="input-field"
            >
              {[9600, 19200, 38400, 57600, 115200].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </Label>
          <Label text="Serial parity">
            <select
              value={selectedComp!.properties.serialParity ?? 'none'}
              onChange={(e) =>
                updateProp({
                  serialParity: e.target.value as 'none' | 'even' | 'odd',
                })
              }
              className="input-field"
            >
              <option value="none">None</option>
              <option value="even">Even</option>
              <option value="odd">Odd</option>
            </select>
          </Label>
          <Label text="Serial stop bits">
            <select
              value={selectedComp!.properties.serialStopBits ?? 1}
              onChange={(e) =>
                updateProp({ serialStopBits: Number(e.target.value) as 1 | 2 })
              }
              className="input-field"
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
            </select>
          </Label>
          <Label text="Serial data bits">
            <select
              value={selectedComp!.properties.serialDataBits ?? 8}
              onChange={(e) =>
                updateProp({ serialDataBits: Number(e.target.value) as 7 | 8 })
              }
              className="input-field"
            >
              <option value={7}>7</option>
              <option value={8}>8</option>
            </select>
          </Label>
        </>
      )}
      <Label
        text={
          selectedComp!.type === 'ethernet_switch'
            ? 'Ports'
            : selectedComp!.type === 'energy_management_controller'
              ? 'Managed points'
            : selectedComp!.type === 'modbus_rtu_module'
              ? 'RS485 drops'
              : 'Channels / ports'
        }
      >
        <input
          type="number"
          value={
            selectedComp!.properties.ioChannels ??
            (selectedComp!.type === 'ethernet_switch'
              ? 5
              : selectedComp!.type === 'energy_management_controller'
                ? 16
              : selectedComp!.type === 'modbus_rtu_module'
                ? 1
                : 8)
          }
          onChange={(e) =>
            updateProp({ ioChannels: Math.max(1, Number(e.target.value) || 1) })
          }
          className="input-field"
          min={1}
          max={64}
        />
      </Label>
      <p className={`text-[10px] ${tc.textMuted} leading-snug`}>
        Use interface cards/converters/switches to isolate field devices and
        bridge BMS networks. Power terminals are optional and diagrammatic.
      </p>
      <Label text="Terminal number map">
        <div className={`text-[10px] ${tc.textMuted} space-y-0.5`}>
          {selectedComp!.connectionPoints.map((cp, idx) => (
            <div key={cp.id}>
              <strong>{idx + 1}</strong> = {cp.label}
            </div>
          ))}
        </div>
      </Label>
    </>
  )};

// eslint-disable-next-line react-hooks/rules-of-hooks
export const renderSignalIsolationProps = () => { const { selectedComp, tc, updateProp } = usePPCtx(); return (
    <>
      <Label text="Channels">
        <input
          type="number"
          value={selectedComp!.properties.ioChannels ?? (selectedComp!.type === 'signal_isolator' ? 2 : 4)}
          onChange={(e) =>
            updateProp({ ioChannels: Math.max(1, Number(e.target.value) || 1) })
          }
          className="input-field"
          min={1}
          max={32}
        />
      </Label>
      {selectedComp!.type === 'signal_isolator' && (
        <Label text="Analog signal">
          <div className="flex gap-1">
            {(['0_10v', '4_20ma'] as const).map((sig) => (
              <button
                key={sig}
                type="button"
                onClick={() => updateProp({ aiSignalType: sig })}
                className={`px-2 py-1 rounded text-xs ${
                  (selectedComp!.properties.aiSignalType ?? '4_20ma') === sig
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-600 text-gray-300'
                }`}
              >
                {sig === '0_10v' ? '0-10V' : '4-20mA'}
              </button>
            ))}
          </div>
        </Label>
      )}
      <p className={`text-[10px] ${tc.textMuted} leading-snug`}>
        Isolation modules break ground loops and protect BMS I/O from field-side
        transients and common-mode noise.
      </p>
      <Label text="Terminal number map">
        <div className={`text-[10px] ${tc.textMuted} space-y-0.5`}>
          {selectedComp!.connectionPoints.map((cp, idx) => (
            <div key={cp.id}>
              <strong>{idx + 1}</strong> = {cp.label}
            </div>
          ))}
        </div>
      </Label>
    </>
  )};

