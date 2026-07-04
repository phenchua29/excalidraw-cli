---
name: create-diagram
description: Create an Excalidraw flowchart from a description using excalidraw-cli DSL
---

# Create Excalidraw diagram

Create a flowchart or architecture diagram using excalidraw-cli.

## Steps

1. Clarify the diagram type (flow, architecture, decision tree, sequence of steps)
2. Draft DSL using shapes: `(Start)`, `[Process]`, `{Decision?}`, `[[Database]]`
3. Add `@direction` if not top-to-bottom (use `LR` for wide layouts)
4. Write DSL to a `.dsl` file in the workspace
5. Generate output:
   - MCP: call `create_diagram` with the DSL file path or content
   - CLI: `excalidraw-cli create <file.dsl> -o <name>.excalidraw`
6. If the user needs an image, export with `export_diagram` or `excalidraw-cli convert`
7. Show the user the output path and a brief summary of the diagram structure

## DSL template

```
@direction TB
@spacing 50

(Start) -> [First Step] -> {Decision?}
{Decision?} -> "yes" -> [Success Path] -> (End)
{Decision?} -> "no" -> [Alternate Path] -> (End)
```

Replace nodes and labels to match the user's request.
