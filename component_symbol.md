# Component Symbol Design for Electrical Simulation

---

## 1. Purpose

This document defines how to design and implement **component symbols** that:
- Look close to real-world electrical devices
- Are easy to understand in schematics
- Work efficiently in a simulation engine

---

## 2. Core Concept

A component symbol is not just a drawing.
It consists of:

1. **Visual Representation (SVG)**
2. **Electrical Definition (Logic)**
3. **Connection Points (Pins)**
4. **State Behavior (Dynamic Changes)**

---

## 3. Symbol Design Principles

### 3.1 Clarity Over Realism
- Use simplified shapes
- Avoid photorealistic designs
- Maintain readability at small sizes

### 3.2 Consistency
- Same stroke width across all symbols
- Same font and label style
- Standard pin spacing

### 3.3 IEC/ANSI Compliance
Follow standards when possible:
- IEC (Europe)
- ANSI (US)

---

## 4. Visual Structure

Each symbol should include:

- Body (outline)
- Functional element (coil, contact, etc.)
- Terminals
- Labels

---

## 5. Example: Contactor Symbol

### Key Elements
- Coil (A1, A2)
- NO contacts (13-14)
- NC contacts (21-22)

### SVG Example

```xml
<svg viewBox="0 0 120 100">
  <!-- Body -->
  <rect x="10" y="10" width="100" height="80" stroke="black" fill="none"/>

  <!-- Coil -->
  <circle cx="60" cy="50" r="10" stroke="black" fill="none"/>
  <text x="52" y="54" font-size="8">K</text>

  <!-- Coil terminals -->
  <line x1="0" y1="50" x2="10" y2="50" stroke="black"/>
  <line x1="110" y1="50" x2="120" y2="50" stroke="black"/>

  <text x="2" y="45" font-size="6">A1</text>
  <text x="98" y="45" font-size="6">A2</text>
</svg>
```

---

## 6. Pin Definition (Critical)

Pins define how components connect.

### Example JSON

```json
{
  "component": "contactor",
  "pins": [
    {"id": "A1", "x": 0, "y": 50, "type": "coil"},
    {"id": "A2", "x": 120, "y": 50, "type": "coil"},
    {"id": "13", "x": 0, "y": 20, "type": "NO"},
    {"id": "14", "x": 120, "y": 20, "type": "NO"}
  ]
}
```

---

## 7. State-Based Behavior

Symbols must visually react to simulation.

### States

| State | Behavior |
|------|--------|
| OFF  | Contacts open |
| ON   | Contacts closed |
| FAULT| Red highlight |

---

## 8. Making Symbols Look Real

Add subtle real-world hints:

- Terminal markings (A1, A2, L1, T1)
- Contact gaps (open/closed visualization)
- Coil symbol inside body
- Device labels (K1, KM1, etc.)

Avoid:
- 3D effects
- Heavy shadows
- Complex textures

---

## 9. Interaction Features

- Click to select
- Drag to move
- Rotate (0°, 90°, 180°, 270°)
- Snap to grid
- Show connection points on hover

---

## 10. Grid System

- Use fixed grid (e.g., 10px or 20px)
- Align all pins to grid
- Maintain consistent spacing

---

## 11. Rendering Options

### SVG (Recommended)
- Scalable
- Easy to edit
- Works well with React

### Canvas
- Better for large simulations
- Faster rendering for many components

---

## 12. Performance Tips

- Minimize SVG nodes
- Reuse symbol templates
- Cache components
- Avoid unnecessary re-renders

---

## 13. Development Workflow

1. Design in Figma / Illustrator
2. Export SVG
3. Optimize with SVGO
4. Add pin metadata
5. Connect to simulation logic

---

## 14. Future Enhancements

- Custom symbol editor
- Animation (current flow)
- Theming (dark/light mode)
- Import IEC libraries

---

## 15. Summary

A good component symbol:
- Looks familiar to engineers
- Is clean and readable
- Has accurate pin mapping
- Reacts to simulation state

---

End of File

