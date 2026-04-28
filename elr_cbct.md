# ELR + CBCT (Earth Leakage Protection System)

This combination is used to detect and isolate earth leakage currents in electrical systems with high sensitivity and reliability.

## 1. ELR — Earth Leakage Relay

An ELR monitors residual (leakage) current and issues a trip command when leakage exceeds a configured threshold.

Main functions:
- Measure residual current
- Compare against pickup setting (`IΔn`)
- Send trip signal to breaker/contact device

Typical pickup settings:
- `30 mA`, `100 mA`, `300 mA`, `1 A`

Typical timing:
- Instantaneous
- Definite delay

## 2. CBCT — Core Balance Current Transformer

A CBCT is a toroidal CT that detects current imbalance.

All active conductors pass through the core:
- Single-phase: `L` and `N`
- Three-phase: `L1`, `L2`, `L3` and `N` (if present)

Do **not** pass protective earth (`PE`) through CBCT.

## 3. Working Principle

Healthy state:
- Sum of currents is zero
- Flux cancels in CBCT
- ELR output remains idle

Single-phase idea:
- `IL + IN = 0`

Three-phase idea:
- `IL1 + IL2 + IL3 + IN = 0`

Earth fault:
- Part of current returns via earth path
- Residual current appears
- CBCT outputs imbalance signal
- ELR detects and issues trip command

## 4. Connection Concept

```text
   L1 ─────────────┐
   L2 ─────────────┤
   L3 ─────────────┤  → Passing through CBCT
   N  ─────────────┘

            ↓
          [CBCT]
            ↓
          [ELR]
            ↓
        Trip → Circuit Breaker
```

## 5. What ELR Trips

ELR does not interrupt power directly. It commands:
- Shunt trip coil of MCCB
- Contactor
- Trip unit / breaker interface

## 6. Applications

- Industrial panels
- Motor feeders
- Distribution boards
- Generator protection
- Fire protection systems

## 7. Installation Rules

- Route all active conductors through CBCT core
- Never route earth conductor through CBCT core
- Avoid parallel earthing return paths
- Keep conductors centered and compact in core window

## 8. Advantages

- High sensitivity to leakage
- Adjustable pickup and delay
- Applicable to single-phase and three-phase systems
- Scales well for large industrial installations

## Bottom Line

CBCT detects residual imbalance, ELR decides, breaker/contact device trips.

Together they provide precise earth-leakage protection for professional installations.
