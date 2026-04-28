# Modbus TCP Gateway (Modbus TCP <-> Modbus RTU)

A Modbus TCP gateway (often called a Modbus TCP <-> Modbus RTU gateway) is a device that bridges Ethernet-based Modbus TCP networks with serial RS-485 Modbus RTU networks. It is extremely common when integrating modern SCADA/PLC systems with legacy field devices.

## 1. Typical Terminals of a Modbus TCP Gateway

### A) Power Supply
- `V+` / `L+` / `+24V DC`
- `V-` / `GND` / `0V`
- (or `L` / `N` / `PE` if AC-powered)

### B) Ethernet (Modbus TCP Side)
- `RJ45` port (`ETH0` / `LAN`)
- Connects to:
  - PLC
  - SCADA system
  - Industrial network switch

Uses standard Ethernet cable (`Cat5e`/`Cat6`).

### C) RS-485 (Modbus RTU Side)
- `A` / `D+` / `RS485+`
- `B` / `D-` / `RS485-`
- `GND` / `COM` (optional but recommended)

### D) Shield / Ground
- `FG` / `SHIELD`
- Used for cable shielding and noise reduction

### E) Optional Ports (Model Dependent)
- `RS-232` (less common)
- `USB` (for configuration)
- Digital I/O (rare)

## 2. Basic Wiring Architecture

```text
          Ethernet Network (Modbus TCP)
        ┌──────────────────────────────┐
        │ PLC / SCADA / HMI           │
        └─────────────┬───────────────┘
                      │ RJ45
              ┌───────▼────────┐
              │ TCP Gateway    │
              └───────┬────────┘
                      │ RS-485
        ┌─────────────┴─────────────┐
        │        │         │        │
     Device1  Device2  Device3   DeviceN
     (RTU)     (RTU)     (RTU)     (RTU)
```

## 3. How It Works (Protocol Mapping)

### Modbus TCP uses
- IP address
- Port `502`

### Modbus RTU uses
- Slave ID (`1-247`)

The gateway maps:

`Modbus TCP request -> Slave ID -> RTU device`

Example:
- SCADA sends request to `192.168.1.50:502`
- Gateway routes to RTU slave ID `3`

## 4. Key Configuration Parameters

### Ethernet Side
- IP address (example: `192.168.1.50`)
- Subnet mask
- Gateway

### Serial Side (Critical)
- Baud rate (`9600` / `19200` / `115200`)
- Parity (`None` / `Even` / `Odd`)
- Stop bits (`1` / `2`)
- Data bits (usually `8`)

All RTU devices on the bus must match these serial settings.

## 5. Common Industrial Gateways

- Moxa (example: MGate series)
- Advantech
- Schneider Electric
- Siemens
- ICP DAS

## 6. Engineering Best Practices

- Use RS-485 bus topology (avoid star topology)
- Add `120Ω` termination at both ends of the bus
- Keep `A <-> A` and `B <-> B` consistent
- Use shielded twisted pair cable
- Practical limits:
  - Around `32` devices per segment
  - Around `1200 m` cable length

## 7. Common Issues and Likely Causes

| Problem | Likely Cause |
|---|---|
| No communication | Wrong baud rate or parity |
| Intermittent data | Missing termination |
| Wrong values | Register mapping mismatch |
| Timeout errors | Slave ID incorrect |
| Noise issues | No shielding or grounding |

## Summary

A Modbus TCP gateway typically has:
- Power terminals
- RJ45 Ethernet port
- RS-485 terminals (`A`, `B`, `GND`)
- Optional shield/ground

Its role is to translate between IP-based Modbus TCP communication and serial Modbus RTU communication.
