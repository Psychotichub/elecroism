# RCD (Residual Current Device)

An RCD is a protection device that disconnects a circuit automatically when earth-leakage current is detected. Its main purpose is shock and fire protection.

## 1. What an RCD Does

It continuously compares:
- Phase current (`L`)
- Neutral current (`N`)

If leakage exceeds the set threshold, it trips the circuit.

## 2. Working Principle

Normal condition:
- Incoming current equals outgoing current
- `IL = IN`
- No residual imbalance, so device stays ON

Earth-leakage condition:
- Part of current returns via earth path
- Neutral return becomes lower than phase current
- Residual imbalance is detected and trip occurs quickly

## 3. Internal Construction

Typical internal parts:
- Built-in core-balance transformer (internal CBCT)
- Trip mechanism (electromechanical/electronic)
- Test button (`T`)

Unlike ELR+CBCT external systems, RCD includes sensing transformer internally.

## 4. Typical Connections

### Single-phase
- `L(in)` and `N(in)` into RCD
- `L(out)` and `N(out)` to load

### Three-phase
- Monitors `L1`, `L2`, `L3`, and `N` together

## 5. Sensitivity Ratings

- `30 mA`: personal protection (common)
- `100 mA` / `300 mA`: fire protection
- `500 mA+`: industrial selective use

## 6. Tripping Speed

Typical:
- Less than `30 ms` for `30 mA` class devices

## 7. RCD Types

- Type `AC`: AC leakage only
- Type `A`: AC + pulsating DC leakage
- Type `B`: AC + smooth DC + high-frequency components

## 8. Installation Rules

- Route phase and neutral through same RCD
- Do not share neutral with other circuits downstream
- Ensure proper earthing
- Test button should be checked periodically

## 9. Applications

- Residential DBs
- Industrial panels
- Socket outlet circuits
- Wet-area circuits
- Outdoor installations

## Bottom Line

RCD continuously compares phase and neutral currents. If leakage imbalance is detected, it trips rapidly and disconnects supply.
