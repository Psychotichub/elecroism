# Control Circuit Fuse: Single-Phase and Three-Phase Context

In control circuit fuses, phase is less about bulk power delivery and more about how the control voltage is sourced and referenced. Industrial panels usually use single-phase control logic, even when main power is three-phase.

## 1. Single-Phase Control Circuit (Most Common)

Supply is derived from:
- `L-N` (`230V AC`) directly, or
- control transformer (`400V -> 230V` or `24V`)

Typical concept:

`L -> [Fuse] -> [STOP NC] -> [START NO] -> (Contactor Coil) -> N`

Components:
- STOP (`NC`)
- START (`NO`)
- Contactor coil (`A1-A2`)
- Neutral return

## 2. Three-Phase Control Circuit: Two Meanings

### A) Control Derived from 3-Phase Supply (Common)

Source example:
- `L1-L2 (400V)` then through transformer to control level

This still behaves as single-phase control logic.

### B) True Three-Phase Control (Less Common)

Used mainly for monitoring/protection functions:
- phase failure relay
- phase sequence relay

These evaluate `L1`, `L2`, `L3` simultaneously.

## 3. Common Control Voltages

- `230V AC` (classic)
- `110V AC` (common industrial standard)
- `24V AC/DC` (modern and safer control level)

## 4. Important Engineering Concepts

### Control vs Power Circuit
- Control circuit: low current, logic/switching path
- Power circuit: high current, feeds motor/load

### Isolation
Control transformers are widely used for:
- safety
- noise reduction
- stable control voltage

### Protection
Typical control protection includes:
- control fuse / MCB
- overload relay (motor control)
- emergency stop chain

## 5. Practical Panel Reality

For a 3-phase motor starter:
- Power circuit: `L1/L2/L3 -> motor`
- Control circuit: usually single-phase derived control, managing contactor coil

This is the standard industrial pattern.

## Summary

- Single-phase control is the dominant approach.
- Three-phase supply often only provides the source from which control voltage is derived.
- True 3-phase control is usually for monitoring/protection, not routine seal-in coil logic.
