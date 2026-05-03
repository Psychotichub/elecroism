# ElectroSim Component Symbol Realism Guide

Date: 2026-05-03

## Purpose

This file defines how ElectroSim component symbols should be redesigned so they feel closer to real physical electrical devices while still remaining readable as schematic/canvas symbols.

The goal is not photorealism. The goal is "physical-inspired clarity": each component should look like the real device category it represents, with faceplates, handles, terminals, labels, LEDs, displays, screw heads, DIN rail hints, and realistic state indicators.

## Design Direction

ElectroSim should use a hybrid visual style:

- Schematic enough to stay readable at small canvas zoom.
- Physical enough that users can recognize the real-world device.
- Consistent enough that all symbols feel part of the same application.
- Lightweight enough that many components can render without slowing the canvas.

Avoid:

- Heavy shadows
- Photo textures
- Large gradients
- Decorative effects that hide terminal positions
- Overly detailed drawings that become unreadable when zoomed out

Use:

- Clean device bodies
- Subtle top highlights
- Small screw details
- Terminal pockets
- Handle/knob positions
- Printed faceplate labels
- Realistic LED/display areas
- Color-coded poles and phase tags
- Clear connection points

## Current Symbol System

Current symbols are React-Konva components in:

```text
src/components/Components
```

Important shared pieces:

- `ScaledSymbolInner.tsx`
- `ComponentCanvasLabel.tsx`
- `WireSegment.tsx`
- `src/utils/geometry.ts`
- `src/types/index.ts`

Representative symbol files:

- `MCBSymbol.tsx`
- `ThreePhaseMCBSymbol.tsx`
- `AirCircuitBreakerSymbol.tsx`
- `MotorizedMCCBSymbol.tsx`
- `SwitchSymbol.tsx`
- `TwoWaySwitchSymbol.tsx`
- `LoadSymbol.tsx`
- `EnergyMeterSymbol.tsx`
- `BmsIOModuleSymbol.tsx`
- `CommInfraSymbol.tsx`
- `SmpsSymbol.tsx`
- `TerminalBlockSymbol.tsx`

## Core Visual Rules

### 1. Keep Terminal Coordinates Stable

Changing the symbol drawing must not break existing connection points.

Do not casually move:

- `IN`, `OUT`
- `L`, `N`, `PE`
- `L1`, `L2`, `L3`
- `A1`, `A2`
- `COM`, `NO`, `NC`
- Communication terminals
- BMS IO terminals

Visual details should be drawn around the existing connection points.

### 2. Use Physical Bodies, Not Flat Icons

Every main component should have a recognizable body.

Examples:

- MCB: molded breaker body, handle window, pole slots, terminal screws.
- MCCB/ACB: larger molded case, trip unit window, mechanical ON/OFF flag.
- Contactor: coil block, contact chambers, A1/A2 terminals, auxiliary block.
- Energy meter: LCD screen, buttons, terminal strip.
- SMPS: ventilation slots, DC output terminals, status LED.
- BMS module: IO channel strip, LEDs, bus connector.

### 3. Preserve Electrical Readability

Physical details must not hide:

- State
- Rating
- Terminal labels
- Direction of power flow
- Connection points
- Selected/fault state

### 4. Make State Visible

Every interactive or simulated device should visually react to state.

Recommended state visuals:

| State | Visual Treatment |
| --- | --- |
| `off` | Muted body, grey handle/LED off |
| `on` | Handle in ON position, green status, energized highlight if powered |
| `tripped` | Red trip window, flashing small indicator, handle center/off-trip position |
| `fault` | Red outline or small fault badge |
| energized | Subtle amber/green glow around live area, never too bright |

### 5. Use Consistent Material Colors

Recommended palette:

```ts
const SYMBOL_COLORS = {
  body: '#F3F4F6',
  bodyDark: '#D1D5DB',
  bodyStroke: '#374151',
  faceplate: '#E5E7EB',
  recess: '#CBD5E1',
  terminalMetal: '#9CA3AF',
  terminalDark: '#4B5563',
  screw: '#6B7280',
  label: '#111827',
  labelMuted: '#6B7280',
  live: '#F59E0B',
  on: '#22C55E',
  off: '#9CA3AF',
  trip: '#EF4444',
  dc: '#DC2626',
  neutral: '#2563EB',
  earth: '#65A30D',
  comm: '#0891B2',
};
```

Use these as a starting point. Adjust only when a component needs its own industry color.

### 6. Use Consistent Stroke and Corner Radius

Recommended defaults:

```ts
const SYMBOL_STROKE = 1.4;
const SYMBOL_DETAIL_STROKE = 0.8;
const TERMINAL_RADIUS = 3.5;
const SCREW_RADIUS = 2;
const BODY_RADIUS = 4;
```

Do not make every component a rounded card. Use corner radius only where real plastic housings would have slight rounding.

## Shared Symbol Primitives

To make the upgrade maintainable, create shared drawing helpers later.

Recommended file:

```text
src/components/Components/SymbolPrimitives.tsx
```

Recommended primitives:

```ts
DeviceBody
TerminalScrew
TerminalPocket
StatusLed
BreakerHandle
TripFlag
FaceplateLabel
RatingStrip
VentSlots
DisplayWindow
DinRailClip
PhaseTag
SelectionFrame
ConnectionPointDots
```

Why:

- Components become consistent.
- Repeated details do not get copy-pasted everywhere.
- Future redesigns become easier.

## Standard Physical Details

### Device Body

Use a layered body:

- Outer molded body
- Slight top highlight
- Inner faceplate/recess
- Small label strip
- Optional DIN rail foot

Konva pattern:

```tsx
<Rect fill="#F3F4F6" stroke="#374151" cornerRadius={4} />
<Rect fill="rgba(255,255,255,0.35)" listening={false} />
<Rect fill="#E5E7EB" stroke="#9CA3AF" cornerRadius={2} />
```

### Terminal Pockets

Terminals should look like real screw terminals.

Use:

- Small rectangular pocket
- Metal circle or screw slot
- Short stub to connection point
- Label beside or above terminal

Labels:

- Top terminals: label above body or inside top strip.
- Bottom terminals: label below body or inside bottom strip.
- Side terminals: label outside side body if space allows.

### Handles and Knobs

Breakers and switches should show physical motion.

MCB:

- `on`: handle tilted/up or green
- `off`: handle down or grey
- `tripped`: handle centered/red trip flag

Selector switch:

- Rotary knob with pointer
- Position labels `AUTO`, `OFF`, `MAN`
- Pointer rotates according to state

Emergency stop:

- Red mushroom head
- Yellow base plate
- Pressed/latched state shown by lower head and darker red edge

### LED and Display Areas

Meters, gateways, SMPS, BMS modules, and IO modules should show:

- LCD/display window
- Small status LED
- RX/TX indicators for communication devices
- Channel LEDs for IO modules
- Protocol/address text

Use tiny details, not large decorative panels.

## Component Family Specifications

### Power Source

Files:

- `PowerSourceSymbol.tsx`
- `DCPowerSourceSymbol.tsx`
- `ThreePhaseSourceSymbol.tsx`

Physical target:

- Look like a source module or supply terminal block, not only a generic icon.

AC source details:

- Small incoming supply label
- L/N or L1/L2/L3 phase tags
- Faceplate with voltage
- Subtle sine-wave mark

DC source details:

- Red plus terminal
- Dark/blue minus terminal
- Battery/supply block face
- Voltage label such as `24 VDC`

Three-phase source details:

- Three stacked phase bus indicators
- L1/L2/L3 tags
- Optional N/PE strip if available
- `400 V` or configured line voltage on faceplate

### MCB, RCD, Fuse, ELR

Files:

- `MCBSymbol.tsx`
- `ThreePhaseMCBSymbol.tsx`
- `BreakerSymbol.tsx`
- `HrcFuseSymbol.tsx`
- `EarthLeakageRelayCbctSymbol.tsx`

Physical target:

- DIN-rail protection devices with molded bodies, terminal screws, handle/window, rating text.

MCB visual details:

- Pole-width modular body
- Top and bottom terminal screw pockets
- One handle per pole or linked handle bar
- Printed rating: `C16`, `B10`, etc.
- Breaking capacity text if available
- Red trip flag when tripped

Three-phase MCB/MCCB visual details:

- 3P or 4P module width
- L1/L2/L3/N terminal rows
- Linked handle bar
- Phase color tags
- Rating strip
- Trip curve display

HRC fuse visual details:

- Fuse carrier body
- Cartridge window
- Fuse rating label
- Small pull tab
- Red fault indicator when blown/tripped

ELR/CBCT visual details:

- Relay module with LCD/LED
- Toroid ring or CT circle
- Test/reset buttons
- Leakage threshold text

### ACB and Motorized MCCB

Files:

- `AirCircuitBreakerSymbol.tsx`
- `MotorizedMCCBSymbol.tsx`

Physical target:

- Large breaker devices with control packs and BMS/control terminals.

ACB details:

- Large metal/plastic body
- ON/OFF mechanical indicator
- Trip unit display
- Charging spring indicator
- Close/open push buttons
- UVR/shunt/closing coil terminal labels
- BMS protocol badge
- Aux feedback labels like `52a`, `52b`, `TRIP`

Motorized MCCB details:

- Molded MCCB body
- Motor operator pack on side/front
- Linked pole handles
- Control terminal strip
- `MOT`, `ST`, `AUX`, `TRIP` terminal groups
- Ready/control voltage indicators

State rules:

- Tripped: red trip flag and disabled handle look.
- ON: handle/flag green.
- OFF: handle/flag grey.
- BMS enabled: show small BMS badge and control terminal strip.

### Contactors and Relays

Files:

- `ThreePhaseContactorSymbol.tsx`
- `InterposingRelaySymbol.tsx`
- `AuxContactBlockSymbol.tsx`
- `ControlSymbol.tsx`

Physical target:

- Real control panel devices with coil, contact chambers, auxiliary blocks, and terminal numbers.

Contactor details:

- Three main contact chambers
- Coil block in center
- A1/A2 terminals
- L1/L2/L3 top and T1/T2/T3 bottom labels
- Auxiliary terminal pair labels, such as `13-14`, `21-22`
- Coil energized indicator
- Contact closed indicator

Interposing relay details:

- Small relay socket
- Transparent relay case hint
- Coil LED
- Contact diagram printed on body
- A1/A2 and COM/NO/NC labels

Aux contact block details:

- Clip-on block look
- NO/NC icons
- Terminal pair labels

### Switches and Control Devices

Files:

- `SwitchSymbol.tsx`
- `TwoWaySwitchSymbol.tsx`
- `EStopSymbol.tsx`
- `SelectorSwitchSymbol.tsx`
- `IndicatorLampSymbol.tsx`
- `DoorInterlockSymbol.tsx`

Physical target:

- Panel-front devices, not only schematic contacts.

Switch details:

- Small actuator body
- Open/closed contact blade still visible
- `IN`/`OUT` labels
- Toggle state visible

Two-way switch details:

- Common and traveler terminals
- Moving blade position
- Switch body with screw terminals

Emergency stop details:

- Red mushroom head
- Yellow safety base
- NC contact block behind
- Pressed/latched visual state

Selector switch details:

- Round knob
- Pointer line
- `AUTO`, `OFF`, `MANUAL` labels
- Position-dependent pointer rotation

Indicator lamp details:

- Bezel ring
- Lens color from property
- Glow when energized
- L1/L2/L3 label where relevant

Door interlock details:

- Plunger or key actuator
- Door contact block
- Contact closed/open visual

### Loads

Files:

- `LoadSymbol.tsx`
- `ThreePhaseMotorSymbol.tsx`

Physical target:

- Loads should look like equipment, but still compact.

Lamp:

- Bulb or panel lamp lens
- Warm glow when energized
- Cross filament inside

Motor:

- Cylindrical motor body
- Shaft hint
- Rotation mark when energized
- Nameplate with kW/A if available

Three-phase motor:

- Larger motor shell
- Terminal box on side/top
- L1/L2/L3 inputs
- Rotation mark
- Nameplate: `3P`, kW, current

Heater:

- Heating coil or panel heater grille
- Orange glow when energized

Cooling fan:

- Fan ring
- Blades
- Rotation animation when energized

### Measurement Devices

Files:

- `EnergyMeterSymbol.tsx`
- `MultimeterSymbol.tsx`
- `PhaseIndicatorBankSymbol.tsx`

Physical target:

- Instruments should look like real panel meters/test instruments.

Energy meter details:

- LCD display
- U/I/P/kWh rows
- Small keypad buttons
- Protocol/address badge
- Terminal strip at bottom/top
- Phase labels

Multimeter details:

- Handheld meter shape
- Display window
- Rotary mode selector
- COM and input jacks
- Probe leads if connected
- Voltage/current/continuity mode clearly visible

Phase indicator bank details:

- Three pilot lamps
- Red/yellow/blue or L1/L2/L3 labels
- Individual energized state if available

### Power Conversion and Control Supply

Files:

- `SmpsSymbol.tsx`
- `ACDCConverterSymbol.tsx`
- `ControlTransformerSymbol.tsx`
- `PowerAuxSymbol.tsx`

Physical target:

- DIN-rail power supplies and transformer modules.

SMPS details:

- Ventilation slots
- AC input terminals
- DC output terminals
- DC OK LED
- Voltage adjustment screw
- Output voltage text

AC/DC converter details:

- AC input side and DC output side
- Rectifier/filter block hint
- Plus/minus output labels
- Status LED

Control transformer details:

- Laminated transformer core hint
- Primary/secondary terminal blocks
- Voltage labels

### BMS, IO, and Communication

Files:

- `BmsIOModuleSymbol.tsx`
- `CommInfraSymbol.tsx`
- `ModbusTcpGatewaySymbol.tsx`
- `BacnetIpGatewaySymbol.tsx`
- `SignalIsolationSymbol.tsx`

Physical target:

- Automation modules with channel LEDs, terminal strips, and network ports.

BMS IO module details:

- Slim DIN-rail module
- Numbered channel strip
- LED per channel
- Module type label: `DI`, `DO`, `AI`, `AO`
- Address/protocol label
- Common terminals grouped clearly

Gateway details:

- Ethernet RJ45 port
- RX/TX LEDs
- Protocol badge: `Modbus TCP`, `BACnet/IP`
- IP/address text if configured

Serial/communication module details:

- RS485 A/B terminals
- Shield/ground mark
- Baud/parity small text

Signal isolator details:

- Input/output terminal groups
- Isolation barrier line
- Signal type badge, such as `4-20 mA` or `0-10 V`

### Wiring Accessories and Mechanical Parts

Files:

- `TerminalBlockSymbol.tsx`
- `BusbarSymbol.tsx`
- `JunctionSymbol.tsx`
- `SocketSymbol.tsx`
- `PowerAuxSymbol.tsx`

Physical target:

- These should look like panel hardware.

Terminal block details:

- Modular terminal row
- Screw clamps
- Number labels
- Bridge/jumper mark if relevant

Busbar details:

- Copper or neutral/earth bar look
- Multiple screw holes
- Insulator supports
- Phase/neutral/earth color coding

Junction details:

- Small connection node or terminal junction
- Clear join point

Socket details:

- Realistic outlet face
- Plug holes
- Earth contact if socket type supports it
- Voltage/current label

## Detail Levels

Support three visual detail levels over time.

### Detail Level 1: Current Zoomed-Out Clarity

Always visible:

- Body outline
- Terminal stubs
- Main state indicator
- Short label

### Detail Level 2: Normal Canvas Use

Visible at normal zoom:

- Faceplate
- Terminal labels
- Screws
- Ratings
- LEDs
- Handles

### Detail Level 3: Zoomed-In Physical Detail

Visible only when zoomed in enough:

- Small model text
- Vent slots
- Tiny buttons
- Protocol/address text
- Aux terminal group labels

Implementation note:

Use `circuit.zoom` or symbol scale later to hide tiny details when zoomed out.

## Interaction Rules

### Selection

Use a clean selection outline outside the device body.

Do not cover:

- Terminals
- Labels
- Handles
- Status LEDs

### Connection Points

When `showConnectionPoints` is true:

- Render connection point dots above the symbol details.
- Use blue fill and stroke as current code does.
- Keep radius consistent.
- Do not permanently show large dots when not wiring.

### Double Click Behavior

Do not change interaction behavior during visual upgrade.

Examples:

- Breakers still toggle on double-click if not tripped.
- Tripped breakers reset only where existing code supports it.
- Push buttons remain momentary.
- Selector position logic remains unchanged.

## Implementation Architecture

### Step 1: Add Shared Physical Symbol Primitives

Create:

```text
src/components/Components/SymbolPrimitives.tsx
```

Include:

```tsx
export const SymbolColors = { ... };
export const SymbolMetrics = { ... };
export function DeviceBody(...) { ... }
export function TerminalScrew(...) { ... }
export function StatusLed(...) { ... }
export function BreakerHandle(...) { ... }
export function DisplayWindow(...) { ... }
export function VentSlots(...) { ... }
export function PhaseTag(...) { ... }
```

### Step 2: Upgrade Components by Family

Do not redesign all files in one patch. Apply family by family.

Recommended order:

1. MCB family
2. Three-phase breaker family
3. Motorized MCCB and ACB
4. Switch and control devices
5. Loads and motors
6. Meters and multimeters
7. SMPS/converters/transformers
8. BMS and communication modules
9. Busbar, terminal block, socket, junction

### Step 3: Run Build After Each Family

After each batch:

```bash
npm run build
npm run lint
```

### Step 4: Visual QA

For each upgraded symbol, check:

- Selected state
- Normal state
- ON/OFF/tripped/fault state if applicable
- Energized state
- Rotated component
- Scaled component
- Connection point alignment
- Dark and light theme if symbol colors depend on theme

## Per-Component Acceptance Checklist

A component is complete when:

- It still compiles with TypeScript.
- It keeps existing props and behavior.
- It keeps existing connection point coordinates.
- It has a physical body or physical faceplate.
- It has realistic terminal treatment.
- It shows state clearly.
- It shows rating/protocol/label information where useful.
- It remains readable at normal zoom.
- It does not overlap labels or connection points.
- It uses shared primitives where possible.

## Suggested First Implementation Batch

Start with these files:

```text
src/components/Components/SymbolPrimitives.tsx
src/components/Components/MCBSymbol.tsx
src/components/Components/ThreePhaseMCBSymbol.tsx
src/components/Components/BreakerSymbol.tsx
```

Why this batch:

- Protection devices are central to the app.
- They share many visual parts.
- Real-world details are easy to recognize.
- Improvements here will set the style for the rest.

## Suggested First Visual Changes

For `MCBSymbol.tsx`:

- Add molded DIN-rail body.
- Add top/bottom screw terminal pockets.
- Replace flat handle rectangle with breaker lever.
- Add rating strip: `C16`, `B10`, etc.
- Add red trip flag.
- Add subtle energized highlight.

For `ThreePhaseMCBSymbol.tsx`:

- Add one molded body per pole or divided pole chambers.
- Add linked handle bar.
- Add L1/L2/L3/N tags.
- Add top and bottom screw pockets.
- Add trip flag.

For `BreakerSymbol.tsx`:

- Use the same breaker primitive style as MCB.
- Keep simple enough for generic breaker use.

## Do Not Break These Things

During visual upgrade, do not remove:

- Existing component props
- Existing event handlers
- Existing simulation state reads
- Existing `ComponentCanvasLabel`
- Existing `ScaledSymbolInner`
- Existing connection point rendering
- Existing toggle/reset behavior
- Existing exported component names

## Future Enhancements

After the first full visual pass:

- Add theme-aware symbol colors.
- Add zoom-level detail hiding.
- Add component-specific tooltips.
- Add symbol style setting: `schematic`, `physical`, `hybrid`.
- Add a symbol preview gallery page.
- Add visual regression screenshots.

## Final Recommendation

Use a physical-inspired hybrid style. ElectroSim should not become a photo-like panel layout tool, but each component should look enough like its real device that a user can identify it immediately.

The best next step is to implement shared primitives and upgrade the MCB/breaker family first. That creates the visual foundation for the rest of the project.

## Implementation Pass 1: Applied

Applied on 2026-05-03.

Files added:

```text
src/components/Components/SymbolTokens.ts
src/components/Components/SymbolPrimitives.tsx
src/components/Components/PhysicalSymbolSkin.tsx
```

Files updated:

```text
src/components/Canvas/CircuitCanvas.tsx
src/components/Components/MCBSymbol.tsx
```

What was applied:

- Shared symbol color and metric tokens.
- Shared primitives for physical device bodies, terminal pockets, breaker handles, trip flags, status LEDs, display windows, vent slots, phase tags, rating strips, and connection-point dots.
- A universal `PhysicalSymbolSkin` canvas layer was added in Pass 1, then **removed in Pass 4** from `CircuitCanvas.tsx` so symbols are not double-framed; `PhysicalSymbolSkin.tsx` remains in the repo for a possible future “skin” preference. Per-symbol `DeviceBody` / pockets live in individual symbol components.
- A deeper first-family refactor for `MCBSymbol.tsx`, using the new physical primitives directly.

Verification:

```bash
npm run build
npm run lint
```

Both checks passed after this implementation pass.

## Implementation Pass 2: Applied

Applied on 2026-05-03 (guide batch: tokens, primitives, 3P/4P breaker family, RCD alignment).

Files updated:

```text
src/components/Components/SymbolTokens.ts
src/components/Components/SymbolPrimitives.tsx
src/components/Components/ScaledSymbolInner.tsx
src/components/Components/ThreePhaseMCBSymbol.tsx
src/components/Components/BreakerSymbol.tsx
src/components/Components/MCBSymbol.tsx
src/components/Components/PhysicalSymbolSkin.tsx
```

What was applied:

- Token alignment with the guide: `dc` colour, `detailStroke` / `screwRadius` metrics, documented palette comment.
- New primitives: `FaceplateLabel`, `DinRailClip`.
- Lighter `ScaledSymbolInner` shadow (per “avoid heavy shadows”).
- `ThreePhaseMCBSymbol` and `BreakerSymbol` refactored to shared `DeviceBody`, `TerminalPocket`, `BreakerHandle`, `RatingStrip`, `TripFlag`, `SelectionFrame`, `ConnectionPointDots`, `DinRailClip`; 3P/4P linked-handle bar; phase tags L1–L3/N; terminal labels **1–8** on RCD/RCCB pockets aligned with `circuitConnectionGeometry` pole positions (`±10` 2P, `±30/±10` 4P).
- `MCBSymbol`: 2P detection via `mcbLayoutPoles`; pocket labels **1–4** for 2P, **1–2** for 1P.
- `PhysicalSymbolSkin`: DC source glyph uses `SymbolColors.dc` instead of trip red.

Verification: `npm run build` and `npm run lint` pass.

## Implementation Pass 3: Applied

Applied on 2026-05-03 (guide batch: switches and panel control devices).

Files updated:

```text
src/components/Components/SwitchSymbol.tsx
src/components/Components/TwoWaySwitchSymbol.tsx
src/components/Components/EStopSymbol.tsx
src/components/Components/SelectorSwitchSymbol.tsx
src/components/Components/DoorInterlockSymbol.tsx
```

What was applied:

- **`SwitchSymbol` / push-button:** `DeviceBody`, `TerminalPocket` (labels **1** / **2**), `SelectionFrame`, `ConnectionPointDots`, `SymbolColors` for live / blade / status text (replaces flat IN/OUT copy).
- **`TwoWaySwitchSymbol`:** Same primitive set; screw pockets for **COM**, **T1**, **T2** with leads to geometry attach points; `DeviceBody` housing; `SymbolColors` for SPDT state line.
- **`EStopSymbol`:** `SelectionFrame`, `ConnectionPointDots`, trip / stroke colours from tokens; slightly softer energised mushroom glow.
- **`SelectorSwitchSymbol`:** `SelectionFrame`, `ConnectionPointDots`, dial stroke from `SymbolMetrics`, energised halo **blur 4** (was 6), position text uses token colours.
- **`DoorInterlockSymbol` / mechanical:** `DeviceBody`, `TerminalPocket` (**1** / **2**), `SelectionFrame`, `StatusLed` when energised, `ConnectionPointDots` (replaces heavy shadow box).

Verification: `npm run build` and `npm run lint` pass.

## Implementation Pass 4: Applied

Applied on 2026-05-01 (canvas skin removal; loads / three-phase motor).

Files updated:

```text
src/components/Canvas/CircuitCanvas.tsx
src/components/Components/LoadSymbol.tsx
src/components/Components/ThreePhaseMotorSymbol.tsx
```

What was applied:

- **`CircuitCanvas.tsx`:** Removed the global `<Layer>` that rendered `PhysicalSymbolSkin` for every component, eliminating the extra grey “shell” behind each symbol.
- **`LoadSymbol.tsx`:** `DeviceBody`, `TerminalPocket` (**T1** / **T2**), `SelectionFrame`, `ConnectionPointDots`, `SymbolColors` for strokes and labels; lamp glow **shadowBlur 6** (was 12); `ComponentCanvasLabel` gains explicit `fill` from tokens.
- **`ThreePhaseMotorSymbol.tsx`:** Same primitive set; pockets **L1** / **L2** / **L3** / **N** aligned with geometry attach points; `ComponentCanvasLabel` for the schematic label; energised halo **blur 6** (was 8); fault stroke / OL text from trip tokens.

Verification: `npm run build` and `npm run lint` pass.
