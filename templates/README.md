# Organization Templates (v1)

Organization templates (`.orgtemplate.json`) seed a **new project** with branded defaults: logo, title block, standard sheets, and an optional component library.

## Quick start

1. In ElectroSim, choose **File → New from template → Panel Shop Standard**.
2. Or use **Load template file…** with your own `.orgtemplate.json`.
3. Edit brand and client fields under **File → Project settings…**.

## Manifest format

```json
{
  "version": "1.0",
  "id": "com.example.panel-standard",
  "name": "Panel Shop Standard",
  "projectName": "Panel Project",
  "logoUrl": "/templates/your-logo.svg",
  "titleBlock": {
    "brandName": "Your Company",
    "client": "Client / Site",
    "drawingNumber": "EL-001",
    "revision": "A",
    "scale": "1:50"
  },
  "sheets": [
    { "name": "Power distribution", "sortOrder": 0 },
    { "name": "Control circuits", "sortOrder": 1 }
  ],
  "libraryPackUrl": "/library-packs/iec-symbols-starter.elib.json"
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `version` | yes | Must be `"1.0"` |
| `id` | yes | Stable unique id |
| `name` | yes | Shown in **New from template** menu |
| `titleBlock` | no | Applied to every sheet; supports `brandName`, `logoUrl`, revision history |
| `sheets` | no | Default: one empty sheet |
| `library` | no | Inline macro array |
| `libraryPackUrl` | no | Fetches `.elib.json` on project creation |
| `plugins` | no | Inline plugin manifests (same format as `.eplugin.json`) |

## Branding on export

- `brandName` replaces the default **ElectroSim** header on PDF title blocks.
- `logoUrl` is shown in **Project settings** (SVG/PNG paths or data URLs).

## Example files

- `public/templates/panel-shop-standard.orgtemplate.json`
- `public/templates/panel-shop-logo.svg`

TypeScript definitions: `src/types/organizationTemplate.ts`.
