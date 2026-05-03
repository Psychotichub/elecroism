# File Splitting Refactoring Plan

## Overview

| File | Lines | Strategy |
|------|-------|----------|
| `PropertyPanel.tsx` | 4930 | Extract 40+ render functions into grouped editor modules via shared context |
| `engine.ts` | 2823 | Extract pure utility functions and group methods into focused modules |
| `circuitStore.ts` | 2333 | Extract action implementations into feature-grouped helper files |

## Phase 1: PropertyPanel.tsx → Editor Modules

### New file structure
```
src/components/Panels/propertyPanel/
  PropertyPanelContext.tsx      ← shared state (selectedComp, tc, theme, updateProp, etc.)
  constants.ts                  (existing)
  PropertyPanelLabel.tsx        (existing)
  editors/
    SwitchEditors.tsx           ← switch, two-way, push button, e-stop, door interlock, selector
    ProtectionEditors.tsx       ← MCB, HRC fuse, RCD, MPCB, ELR+CBCT
    MotorizedBreakerEditors.tsx ← multipole MCB, motorized MCCB, ACB
    LoadEditors.tsx             ← load, socket, indicator lamp, phase indicator bank
    SourceEditors.tsx           ← power source, DC source, 3φ source, AC/DC, SMPS, xformer
    ThreePhaseEditors.tsx       ← 3φ motor, 3φ contactor
    ControlEditors.tsx          ← timer, interposing relay, aux contact block
    CommEditors.tsx             ← Modbus TCP, BACnet IP, BMS I/O, comm infra, signal isolation
    MeteringEditors.tsx         ← energy meter, multimeter, power/aux
    WireEditor.tsx              ← wire properties
```

### Approach
1. Create `PropertyPanelContext` with all shared state
2. Extract each group, converting closures to components that read context
3. Replace original render calls with component imports

## Phase 2: engine.ts → Simulation Modules

### New file structure
```
src/simulation/
  engine.ts                     ← orchestrator (simulate, getTerminalGraphForValidation)
  threePhaseCalc.ts             ← pure 3φ math (neutral phasor, current factors, voltage factors)
  faultDetection.ts             ← checkFaults, checkAcbFaults, mcbMagneticInMultiple
  terminalGraph.ts              ← graph utilities (addEdge, bfsFrom, connectAll, bridgeLabelPairs)
  potentialPropagation.ts       ← propagatePotentials, potential seed collection
  componentClassification.ts   ← isLoadComponent, isSeriesPathComponent, etc.
  wiringFaultValidation.ts      (existing)
```

## Phase 3: circuitStore.ts → Action Helpers

### New file structure
```
src/store/
  circuitStore.ts               ← main store definition (state + action bindings)
  actions/
    componentActions.ts         ← addComponent, updateComponent, removeComponent, etc.
    wireActions.ts              ← addWire, updateWire, wire drawing state machine
    historyActions.ts           ← undo, redo, pushHistory, loadCircuit
    simulationActions.ts        ← simulate, resetTripped, toggleComponent
    bmsActions.ts               ← ACB/MCCB BMS pulse/shunt, BMS log
```
