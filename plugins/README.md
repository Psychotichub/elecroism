# ElectroSim Plugin API (v1)

ElectroSim v1 plugins are **JSON-only** manifests (`.eplugin.json`). They add custom component types to a project without executable code in the renderer.

## Quick start

1. Copy `public/plugins/example-warning-beacon.eplugin.json` as a template.
2. In ElectroSim, open **Circuit validation → Plugins (v1) → Load plugin…**
3. Expand the loaded pack and click **Insert** to place a symbol on the canvas.

Or use **Load example pack** to install the bundled warning-beacon template.

## Manifest format

```json
{
  "version": "1.0",
  "id": "com.example.my-pack",
  "name": "My Pack",
  "author": "You",
  "description": "Optional description",
  "minAppVersion": "0.0.0",
  "componentTypes": [ /* ... */ ]
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `version` | yes | Must be `"1.0"` for v1 API |
| `id` | yes | Stable unique id (reverse-DNS style) |
| `name` | yes | Display name in the UI |
| `componentTypes` | yes | At least one type definition |

### Component type

Each entry in `componentTypes` defines one placeable symbol:

- **`id`** — unique within the plugin
- **`label`** — canvas / property panel title
- **`category`** — `Power`, `Control`, `Instrumentation`, or `Auxiliary` (controls drawing layer)
- **`symbol`** — `rect` or `circle` with `width`, `height`, optional `glyph`, `fill`, `stroke`
- **`terminals`** — up to 12 connection points (`id`, `label`, `x`, `y` relative to symbol center)
- **`propertyFields`** — drives the generic property editor (`number`, `text`, `select`, `boolean`)
- **`defaultProperties`** — initial property values
- **`simulation`** — sandboxed behavior (see below)
- **`toggleable`** — optional; double-click toggles `on`/`off` for pass-through types

### Simulation models (v1)

| Model | Behavior |
|-------|----------|
| `pass_through` | Bridges all terminals when `state` is in `conductingStates` (default `["on"]`) |
| `resistive_load` | Draws current from `liveTerminal` to `neutralTerminal` using `powerProperty` watts |
| `open` | No internal bridge; terminals only connect via external wires |

Resistive load example:

```json
"simulation": {
  "model": "resistive_load",
  "liveTerminal": "L",
  "neutralTerminal": "N",
  "powerProperty": "powerWatts",
  "defaultState": "on"
}
```

Pass-through switch example:

```json
"simulation": {
  "model": "pass_through",
  "conductingStates": ["on"],
  "defaultState": "on"
},
"toggleable": true
```

## Sandbox rules

Manifests are rejected if they contain forbidden keys anywhere in the JSON tree:

`script`, `code`, `eval`, `wasm`, `function`, `handler`, `module`, `require`

v1 does **not** support arbitrary JavaScript, Node modules, or WASM. Future versions may add a controlled WASM path.

## Persistence

Loaded plugins are stored on the project (`ElectroProject.plugins`) and round-trip through save/load. Each placed component caches its simulation config on `ComponentProperties` so the engine does not need live manifest lookups.

## Template repository layout

```
my-plugin-pack/
  my-pack.eplugin.json
  README.md
```

Publish the `.eplugin.json` file; users load it via the Validation panel or your own distribution channel.

## TypeScript types

See `src/types/plugin.ts` for the canonical TypeScript definitions used by the app.
