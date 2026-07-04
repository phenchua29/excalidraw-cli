---
name: excalidraw-cli
description: Create Excalidraw flowcharts from text DSL, JSON, or DOT using excalidraw-cli. Use when the user asks for flowcharts, architecture diagrams, process maps, decision trees, or Excalidraw output. Covers DSL syntax, styling, export, CLI usage, and MCP tools.
---

# Excalidraw CLI

Create Excalidraw flowcharts from text with auto-layout (ELK) and optional PNG/SVG export.

## When to use

- User wants a flowchart, architecture diagram, or process map
- User asks for `.excalidraw`, PNG, or SVG diagram output
- User needs to visualize a workflow, auth flow, API design, or decision tree
- User mentions excalidraw-cli or text-based diagrams

## Preferred workflow

1. Write DSL in a `.dsl` or `.excalidraw.dsl` file (preferred over `--inline` when labels contain quotes)
2. Create the diagram with MCP `create_diagram` or CLI `excalidraw-cli create`
3. Export with MCP `export_diagram` or CLI `excalidraw-cli convert` when PNG/SVG is needed
4. Validate first with MCP `validate_diagram` or CLI `excalidraw-cli parse` if syntax is uncertain

## DSL quick reference

| Syntax | Shape | Use for |
|--------|-------|---------|
| `[Label]` | Rectangle | Process, action, service |
| `{Label}` | Diamond | Decision, branch |
| `(Label)` | Ellipse | Start / end |
| `[[Label]]` | Database | Storage, DB |
| `![path]` | Image | Inline image node |
| `![path](200x100)` | Image | Sized image node |

### Connections

| Syntax | Meaning |
|--------|---------|
| `->` | Forward arrow |
| `<-` | Reverse arrow |
| `<->` / `<-->` | Bidirectional |
| `-->` / `<--` | Dashed |
| `[A] -> "yes" -> [B]` | Labeled edge (required form) |

**Edge label rules:**
- Use the full form: `[A] -> "label" -> [B]` (or single quotes)
- Mixed forms like `[A] --> "x" -> [B]` are rejected
- Escape quotes inside labels: `"say \"hello\""` or `'team\'s call'`

### Directives

```
@direction LR          # TB (default), BT, LR, RL
@spacing 60            # Node spacing in pixels

@node [Process Step]   # Shared style block
  fillStyle: solid
  backgroundColor: #a5d8ff

@image icon.png at 100,200
@image icon.png near (Start)
@image icon.png near (Start) top-left
(Start) @decorate holly.png top-left
@library ./stickers/
@sticker snowflake at 50,50
@scatter snowflake.png count:20 width:30 height:30
```

### Node styling (inline)

```
[Step @fillStyle:hachure @backgroundColor:#a5d8ff @strokeStyle:dashed]
```

Supported keys: `fillStyle` (solid, hachure, cross-hatch), `backgroundColor`, `strokeColor`, `strokeWidth`, `strokeStyle` (solid, dashed, dotted), `roughness`, `opacity`.

Precedence: `@node` block defaults → inline attributes override per property.

## Example DSL

```
@direction LR
@spacing 60

(Start) -> [Enter Credentials] -> {Valid?}
{Valid?} -> "yes" -> [Dashboard] -> (End)
{Valid?} -> "no" -> [Show Error @backgroundColor:#ffc9c9] -> [Enter Credentials]
[API] -> "GET /users" -> [Client]
[Service A] <--> [Service B]
```

## Input formats

| Format | When to use | CLI flag |
|--------|-------------|----------|
| DSL | Quick flowcharts, agent-generated text | `-f dsl` (default) |
| JSON | Structured/programmatic graphs | `-f json` |
| DOT | Graphviz users, existing `.dot` files | `-f dot` |

### JSON shape

```json
{
  "nodes": [
    { "id": "start", "type": "ellipse", "label": "Start" },
    { "id": "process", "type": "rectangle", "label": "Process" }
  ],
  "edges": [
    { "from": "start", "to": "process", "label": "begin" }
  ],
  "options": { "direction": "TB", "nodeSpacing": 50 }
}
```

Node types: `rectangle`, `diamond`, `ellipse`, `database`, `image`.

## CLI commands

```bash
# Create from file
excalidraw-cli create flow.dsl -o diagram.excalidraw

# Create from stdin
echo "[A] -> [B]" | excalidraw-cli create --stdin -o diagram.excalidraw

# Inline (escape carefully in shell)
excalidraw-cli create --inline '(Start) -> [Process] -> (End)' -o diagram.excalidraw

# Validate without generating
excalidraw-cli parse flow.dsl

# Export
excalidraw-cli convert diagram.excalidraw --format png --scale 2 --dark
excalidraw-cli convert diagram.excalidraw --format svg --no-export-background
```

## MCP tools

When the excalidraw-cli MCP server is enabled:

| Tool | Purpose |
|------|---------|
| `create_diagram` | Generate `.excalidraw` from DSL, JSON, or DOT |
| `export_diagram` | Convert `.excalidraw` to PNG or SVG |
| `validate_diagram` | Parse and validate input, return graph summary |

### create_diagram parameters

- `input` (required): DSL/JSON/DOT string or path to input file
- `output` (optional): Output `.excalidraw` path (default: `diagram.excalidraw`)
- `format`: `dsl`, `json`, or `dot` (default: `dsl`)
- `direction`: `TB`, `BT`, `LR`, `RL`
- `spacing`: node spacing in pixels

## Tips for agents

- Prefer writing DSL to a file, then calling MCP/CLI — avoids shell escaping issues
- Use `@direction LR` for wide architecture diagrams; `TB` for sequential flows
- Keep node labels short; put details in edge labels or adjacent nodes
- For repeated styled nodes, use `@node` blocks instead of duplicating inline styles
- Open output in [Excalidraw](https://excalidraw.com) or embed PNG/SVG in docs
- Requires Node >= 20.19.0; run `npm run build` in this repo before using the local MCP server

## Local development (this repo)

```bash
npm install
npm run build
npm run build:mcp
npm test
```

Install the plugin:
- **Cursor**: Settings → Plugins → Add Plugin Directory → select this repo root
- **Codex**: Install from the repo-local marketplace at `.agents/plugins/marketplace.json`
