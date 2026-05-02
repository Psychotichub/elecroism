# AutoCAD-Style Wire Tool Improvement Plan

Date: 2026-05-02

## Current Wire Tool Status

ElectroSim already has a good base for an AutoCAD-like wire tool.

Existing strengths:

- Wire command aliases: `wire`, `w`, `line`, `l`
- Grid snapping for component placement
- Connection-point based wire start and finish
- Orthogonal wire drawing with horizontal/vertical legs
- Terminal orientation detection, so wires can enter terminals perpendicular to the symbol edge
- Draft wire preview while drawing
- Wire color inference from terminal labels
- Duplicate wire prevention
- Wire metadata such as color, cross-section, energized state, and current

Main files involved:

- `src/components/Canvas/CircuitCanvas.tsx`
- `src/components/Canvas/WireLayer.tsx`
- `src/store/circuitStore.ts`
- `src/utils/geometry.ts`
- `src/utils/cadCommands.ts`
- `src/utils/inferWireColor.ts`

## Goal

Make the wire tool feel closer to AutoCAD electrical drafting:

- Fast keyboard-driven wiring
- Accurate snapping
- Orthogonal routing
- Easy wire editing after placement
- Clear visual feedback
- Electrical validation while drawing
- Fewer manual clicks for clean wiring

## Priority 1: Add Object Snap Modes

AutoCAD feels fast because snapping is predictable. Your wire tool should support multiple snap targets.

Recommended snap modes:

- Endpoint snap: existing wire endpoints
- Connection snap: component terminals
- Midpoint snap: middle of an existing wire segment
- Intersection snap: where two wire segments cross
- Grid snap: nearest grid point
- Orthogonal projection snap: align to previous point horizontally or vertically

Suggested implementation:

Create a new utility file:

```text
src/utils/wireSnap.ts
```

Recommended functions:

```ts
type SnapKind =
  | 'terminal'
  | 'wire_endpoint'
  | 'wire_midpoint'
  | 'wire_intersection'
  | 'grid'
  | 'orthogonal';

type SnapResult = {
  kind: SnapKind;
  x: number;
  y: number;
  distance: number;
  componentId?: string;
  pointId?: string;
  wireId?: string;
};
```

Use this utility from `CircuitCanvas.tsx` during pointer movement.

Why it helps:

- The user can wire quickly without pixel-perfect clicking.
- Wires can connect cleanly to existing wires and terminals.
- Future electrical nodes become easier to calculate.

## Priority 2: Add Snap Toggle Buttons and Keyboard Shortcuts

Add small toggles in the toolbar/status bar for:

- Grid
- Ortho
- Terminal snap
- Wire snap
- Auto-route

Recommended shortcuts:

- `F3`: object snap on/off
- `F8`: ortho mode on/off
- `Esc`: cancel current wire
- `Enter`: finish current wire when hovering a valid target
- `Backspace`: remove last wire vertex
- `Tab`: switch next segment orientation
- `Shift`: temporarily force ortho
- `Ctrl`: temporarily disable snapping

Why it helps:

- Makes the tool feel professional and CAD-like.
- Power users can work much faster.

## Priority 3: Add Backspace Undo for Wire Vertices

Currently, clicks add wire points. Add a way to remove the last point while drawing.

Recommended store action:

```ts
undoLastWirePoint: () => void;
```

Behavior:

- If the wire has more than the start point, remove the last committed vertex.
- Toggle `wireOrientation` back to the previous orientation.
- If only the start point remains, keep the wire active.
- `Esc` still cancels the whole wire.

Why it helps:

- Users can fix a wrong click without restarting the full wire.
- This is one of the biggest quality-of-life upgrades.

## Priority 4: Add Auto-Routing Between Terminals

When the user clicks terminal A and then terminal B, the app should suggest a clean route automatically.

Routing modes:

- Direct orthogonal route
- Dogleg route with one bend
- Z route with two bends
- Avoid-component route

Suggested function:

```ts
function routeWireOrthogonal(
  start: { x: number; y: number; axis: 'h' | 'v' },
  end: { x: number; y: number; axis: 'h' | 'v' },
  obstacles: Rect[],
  gridSize: number
): number[];
```

Start simple:

1. Build a clean orthogonal route using terminal outward orientations.
2. If the route crosses a component bounding box, try a dogleg offset.
3. If both doglegs collide, use a grid-based A* route later.

Why it helps:

- Fewer manual corners.
- More professional-looking schematics.
- Cleaner wiring around symbols.

## Priority 5: Add Wire Grips for Editing

AutoCAD users expect placed lines to be editable with grips.

Recommended grip behavior:

- Click a wire to show square grips on every vertex.
- Drag endpoint grip to reconnect or move endpoint.
- Drag middle vertex to reshape.
- Drag segment grip to move an entire horizontal or vertical segment.
- Double-click a wire segment to insert a new vertex.
- Delete selected vertex if it is not an endpoint.

Suggested files:

- Add `WireGripLayer.tsx`
- Add store actions:
  - `moveWireVertex`
  - `insertWireVertex`
  - `removeWireVertex`
  - `moveWireSegment`

Why it helps:

- Users do not need to delete and redraw wires.
- Makes wiring correction much faster.

## Priority 6: Add Junction Dots and Wire Splitting

Electrical CAD tools need clear junction behavior.

Recommended behavior:

- If a new wire ends on an existing wire segment, split the existing wire at that point.
- Add a visible junction dot.
- Treat all connected wire segments as one electrical node.
- If wires cross without connection, show no dot.
- Optionally support bridge/jump symbol for crossing wires.

Why it helps:

- Prevents ambiguity between crossing and connected wires.
- Improves simulation correctness.

## Priority 7: Add Smart Wire Preview

Improve preview while drawing.

Recommended visual cues:

- Green marker when hovering a valid terminal
- Red marker when hovering an invalid terminal
- Yellow marker when route needs an automatic bend
- Snap glyph near the cursor: `END`, `MID`, `GRID`, `TERM`, `INT`
- Preview route should show the actual final route, not only the next segment
- Show a small tooltip with wire type: `L1`, `N`, `PE`, `24VDC`, `ETH`

Why it helps:

- Users understand what will happen before clicking.
- Reduces accidental wrong connections.

## Priority 8: Add Electrical Connection Rules While Wiring

Use terminal labels and component types to warn about bad connections before the wire is created.

Examples:

- Prevent or warn when connecting `L` directly to `N`
- Warn when connecting `PE` to active line
- Warn when connecting power wire to communication terminal
- Warn when connecting Ethernet/Modbus wire to AC terminal
- Warn when connecting output-to-output terminals
- Warn when connecting different phase labels directly, such as `L1` to `L2`

Suggested utility:

```text
src/utils/wireConnectionRules.ts
```

Return shape:

```ts
type WireConnectionCheck = {
  allowed: boolean;
  severity: 'ok' | 'warning' | 'blocked';
  message?: string;
};
```

Why it helps:

- Makes the wire tool smarter than a drawing line.
- Prevents common electrical mistakes.

## Priority 9: Add CAD Command Enhancements

Your command system already supports `wire`, `w`, `line`, and `l`. Extend it with wire-specific commands.

Recommended commands:

```text
w
wire
line
ortho
snap
osnap
grid
trim
extend
fillet 0
join
break
wirecolor brown
wirecolor blue
wiretype power
wiretype control
wiretype comm
```

Suggested command behavior:

- `ortho`: toggle orthogonal mode
- `snap`: toggle grid snap
- `osnap`: toggle object snapping
- `trim`: remove wire segment up to an intersection
- `extend`: extend selected wire to target wire/terminal
- `join`: combine connected wire segments
- `break`: split a wire at the clicked point

Why it helps:

- Users who know AutoCAD will feel at home.
- Keeps the UI fast without adding too many buttons.

## Priority 10: Add Wire Numbering and Labels

For electrical drawings, wires usually need labels.

Recommended features:

- Auto wire number generation
- Manual wire label override
- Show/hide wire labels
- Label follows the longest segment
- Label rotation matches wire segment
- Wire schedule export later

Suggested properties added to `Wire`:

```ts
wireNumber?: string;
labelVisible?: boolean;
wireType?: 'power' | 'control' | 'comm';
sourceTag?: string;
destinationTag?: string;
```

Why it helps:

- Makes drawings more useful for real panel documentation.
- Enables wire schedule export.

## Priority 11: Add Layer-Like Wire Styling

AutoCAD commonly uses layers. ElectroSim can use wire categories.

Recommended categories:

- Power AC
- Power DC
- Control AC
- Control DC
- Earth/PE
- Neutral
- Communication
- Instrumentation analog

Each category can control:

- Color
- Stroke width
- Dash style
- Default cross-section
- Validation rules

Why it helps:

- Drawings become easier to read.
- Wire styling becomes consistent.

## Priority 12: Add Clean-Up Tools

Useful wire cleanup actions:

- Remove duplicate vertices
- Merge collinear segments
- Snap near-straight segments to horizontal/vertical
- Remove zero-length segments
- Align selected wire route to grid
- Reroute selected wire

Suggested utility:

```ts
function normalizeWirePoints(points: number[]): number[];
```

Why it helps:

- Keeps schematic data clean.
- Prevents messy routes after many edits.

## Suggested Implementation Order

1. Add `wireSnap.ts` and centralize snap detection.
2. Add snap/ortho toggles and shortcuts.
3. Add `undoLastWirePoint`.
4. Improve preview so it shows snap target and final route.
5. Add automatic terminal-to-terminal routing.
6. Add wire connection rules and warnings.
7. Add wire grips for editing placed wires.
8. Add junction dots and wire splitting.
9. Add wire labels and numbering.
10. Add trim, extend, break, and join commands.

## Best First Feature to Build

Start with object snapping plus `Backspace` to undo the last wire point.

These two features will immediately make the wire tool feel more like AutoCAD without requiring a huge routing rewrite.

## Minimal First Patch Plan

Files to touch:

- `src/store/circuitStore.ts`
- `src/components/Canvas/CircuitCanvas.tsx`
- `src/components/Canvas/WireLayer.tsx`
- `src/utils/wireSnap.ts`
- `src/types/index.ts` if adding snap settings to state

Steps:

1. Add snap settings to the store.
2. Add `findNearestWireSnapTarget`.
3. Use snapped cursor position in wire preview.
4. Use snapped cursor position when adding a wire point.
5. Add `undoLastWirePoint`.
6. Bind `Backspace` during active wire drawing.
7. Show a small snap marker and snap label near cursor.

Expected result:

- Wire drawing feels more precise.
- Bad clicks are easier to recover from.
- The next routing and editing upgrades become easier to build.
