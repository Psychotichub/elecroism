# BACnet/IP Gateway (BACnet/IP Bridge)

A BACnet/IP gateway is used to integrate BACnet over Ethernet (IP) systems with other protocols, most commonly Modbus RTU/TCP, BACnet MS/TP, or proprietary field buses. In building automation (HVAC, BMS), it acts as a protocol translator and network bridge.

## 1. Typical Terminals of a BACnet/IP Gateway

### A) Power Supply
- `V+` / `+24V DC` / `L+`
- `V-` / `0V` / `GND`
- (or `L` / `N` / `PE` for AC-powered models)

### B) Ethernet (BACnet/IP Side)
- `RJ45` Port (`ETH` / `LAN`)
- Connects to:
  - BMS (Building Management System)
  - SCADA
  - Switch/router

Uses:
- BACnet/IP over UDP
- Default port: `47808` (`0xBAC0`)

### C) Field Bus (Depends on Gateway Type)

If BACnet MS/TP side:
- `A` / `+` / `D+`
- `B` / `-` / `D-`
- `GND` / `COM`

This is an RS-485 network (token passing).

If Modbus RTU side:
- `A` (`D+`)
- `B` (`D-`)
- `GND`

If Modbus TCP side:
- Additional RJ45 port

### D) Shield / Ground
- `FG` / `SHIELD`
- Cable shielding for noise immunity

### E) Optional Interfaces
- `RS-232` (legacy devices)
- `USB` (configuration)
- SD card (logging/config backup)

## 2. Network Architecture Example

```text
        ┌────────────────────────────┐
        │   BMS / SCADA (BACnet/IP) │
        └─────────────┬─────────────┘
                      │ Ethernet
              ┌───────▼────────┐
              │ BACnet/IP      │
              │   Gateway      │
              └───────┬────────┘
                      │ RS-485
        ┌─────────────┴─────────────┐
        │        │         │        │
     Device1  Device2  Device3   DeviceN
   (MS/TP or Modbus RTU field devices)
```

## 3. Key Configuration Parameters

### BACnet/IP Side
- IP address (example: `192.168.1.100`)
- Subnet mask
- UDP port (default `47808`)
- Device instance number (must be unique)
- BBMD settings (if across subnets)

### RS-485 Side (MS/TP or Modbus RTU)
- Baud rate (`9600` / `19200` / `38400` / `76800`)
- MAC address (MS/TP, `0-127`)
- Max master setting
- Parity / stop bits (Modbus RTU mode)

## 4. How It Works

The gateway maps data points:

BACnet objects:
- Analog Input (`AI`)
- Analog Output (`AO`)
- Binary Input (`BI`)
- Binary Output (`BO`)

mapped to:
- Modbus registers or MS/TP devices

Example:
- BACnet `AI` (Temp) -> Modbus Register `40001`
- BACnet `BO` (Fan) -> Modbus Coil `00001`

## 5. Common Manufacturers

- Contemporary Controls
- Moxa
- Schneider Electric
- Siemens
- Intesis

## 6. Engineering Considerations

### Network design
- BACnet/IP uses broadcast (`Who-Is` / `I-Am`) and can flood large networks
- Use BBMD for routing between subnets

### RS-485 bus rules
- Max around `32` devices per segment
- Use `120Ω` termination
- Avoid star topology

### Addressing conflicts
Use unique values for:
- BACnet device instance
- MS/TP MAC address
- Modbus slave ID

## 7. Common Issues

| Issue | Cause |
|---|---|
| Devices not discovered | Wrong BACnet instance or subnet issue |
| Intermittent comms | RS-485 wiring or termination |
| Data mismatch | Incorrect register/object mapping |
| No cross-network comms | Missing BBMD configuration |
| Slow updates | Low baud rate or heavy polling |

## Summary

A BACnet/IP gateway typically includes:
- Power terminals
- Ethernet (`RJ45`) for BACnet/IP
- RS-485 (for MS/TP or Modbus RTU)
- Optional second Ethernet or serial ports

Main role:
- Translate building automation data between BACnet/IP and field-level protocols.
