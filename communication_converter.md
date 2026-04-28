# Communication Converter (Comm Converter)

A communication converter (comm converter) is a general-purpose industrial device that converts one communication protocol or physical interface into another. It acts as a translator at both electrical and protocol levels.

## 1. What a Comm Converter Does

It can convert between:

### Physical Layer
- `RS-232` <-> `RS-485`
- `RS-485` <-> `RS-422`
- `USB` <-> Serial

### Protocol Layer
- Modbus RTU <-> Modbus TCP
- BACnet MS/TP <-> BACnet/IP
- CAN <-> Modbus
- Profibus <-> Ethernet/IP

## 2. Typical Terminals of a Comm Converter

### A) Power Supply
- `V+` / `+24V DC`
- `V-` / `GND`

### B) Serial Side (RS-232 / RS-485)

RS-485:
- `A` (`D+`)
- `B` (`D-`)
- `GND`

RS-232:
- `TX` (Transmit)
- `RX` (Receive)
- `GND`

### C) Ethernet (if applicable)
- `RJ45` port (`LAN` / `ETH`)

### D) USB (optional)
Used for:
- Configuration
- PC connection

### E) Shield / Ground
- `FG` / `SHIELD`

## 3. Common Types of Comm Converters

1) Serial <-> Serial converter
- Example: `RS-232` <-> `RS-485`
- Used when connecting PC to industrial devices

2) Serial <-> Ethernet converter
- Example: `RS-485` <-> Ethernet
- Creates virtual COM port over IP

3) Protocol gateway (advanced converter)
- Example: Modbus RTU <-> BACnet/IP
- Performs data mapping and protocol translation

## 4. Typical Architecture

```text
     PLC / SCADA (Ethernet)
              │
        ┌─────▼─────┐
        │ Converter │
        └─────┬─────┘
              │ RS-485
        ┌─────┴─────────────┐
        │        │          │
     Device1  Device2   DeviceN
```

## 5. Common Manufacturers

- Moxa
- Advantech
- ICP DAS
- Siemens
- Schneider Electric

## 6. Key Configuration Parameters

### Serial Side
- Baud rate (`9600` / `19200` / `115200`)
- Parity (`None` / `Even` / `Odd`)
- Stop bits
- Data bits

### Ethernet Side (if present)
- IP address
- Port (example: `502` for Modbus TCP)

## 7. Engineering Considerations

- Match serial settings exactly across devices
- Maintain `A <-> A`, `B <-> B` polarity on RS-485
- Use `120Ω` termination resistors
- Avoid ground loops
- Use shielded cables in noisy environments

## 8. Comm Converter vs Gateway

| Feature | Comm Converter | Gateway |
|---|---|---|
| Protocol translation | Usually no | Yes |
| Electrical conversion | Yes | Yes |
| Data mapping | No | Yes |
| Complexity | Low | High |

In practice:
- Simple converter = signal/interface conversion
- Gateway = protocol and data translation

## Summary

A comm converter typically includes:
- Power terminals
- Serial ports (`RS-232` / `RS-485`)
- Optional Ethernet (`RJ45`)
- Ground/shield

Main role:
- Make different communication standards physically and logically compatible.
