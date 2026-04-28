# Modbus RTU (RS-485) Field Wiring Terminals

Standard field-level terminals commonly used on Modbus RTU (RS-485) devices in industrial automation.

## 1) Core Modbus RTU (RS-485) Terminals

- `A` / `D+` / `RS485+` -> non-inverting line
- `B` / `D-` / `RS485-` -> inverting line
- `GND` / `COM` (optional but recommended) -> signal reference

Notes:

- Some vendors map `A = +`, others `A = -`; always confirm in the device datasheet.
- Twisted pair cable (for example, Belden 9841 class) is standard practice.

## 2) Power Supply Terminals

### DC-powered devices

- `V+` / `L+` / `+24V`
- `V-` / `GND` / `0V`

### AC-powered devices

- `L` (Line / Phase)
- `N` (Neutral)
- `PE` (Protective Earth / Ground)

## 3) Shield / Drain Wire

- `SHIELD` / `FG` (Frame Ground)

Use to reduce EMI in industrial environments.

## 4) Termination and Biasing (RS-485 Network Integrity)

Some devices expose terminals or DIP switches for:

- `120 ohm` termination resistor
- pull-up resistor (to `+V`)
- pull-down resistor (to `GND`)

If not exposed as terminals, these are often built in and configurable by DIP switch.

## 5) Common Additional I/O Terminals (Device-Specific)

Many Modbus RTU devices also include sensor/meter/controller I/O:

### Digital Inputs (DI)

- `DI1`, `DI2`, `COM`

### Digital Outputs (DO / Relay)

- `NO` (Normally Open)
- `NC` (Normally Closed)
- `COM`

### Analog Inputs (AI)

- `AI+`
- `AI-`
- Typical signal types: `4-20 mA` / `0-10 V`

### Analog Outputs (AO)

- `AO+`
- `AO-`

## 6) Typical RS-485 Bus Wiring

```text
Master (PLC)
   A  ------------------- A  ------------------- A
   B  ------------------- B  ------------------- B
   GND ------------------ GND ------------------ GND

          Device 1          Device 2
```

- Use bus (daisy-chain) topology, not star.
- Place termination only at first and last device on the segment.

## 7) Common Devices Using These Terminals

- PLCs (for example Siemens, Schneider Electric)
- Energy meters
- Temperature controllers
- VFDs (Variable Frequency Drives)

## 8) Critical Engineering Notes

- Typical RS-485 segment: up to `32` unit loads without repeaters
- Typical max cable length: around `1200 m` (baud-rate dependent)
- Maintain polarity consistency (`A-A`, `B-B`) across all nodes
- Use `120 ohm` termination at segment ends
- Manage shield/ground properly to avoid ground loops
