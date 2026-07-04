#!/usr/bin/env node

/**
 * MCP server for excalidraw-cli
 *
 * Exposes tools to create, validate, and export Excalidraw diagrams.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

async function loadExcalidrawApi() {
  const indexPath = join(repoRoot, 'dist/index.js');
  if (!existsSync(indexPath)) {
    throw new Error(
      'excalidraw-cli is not built. Run `npm run build` from the repository root first.',
    );
  }
  return import(indexPath) as Promise<typeof import('../../dist/index.js')>;
}

function resolveWorkspacePath(inputPath: string, cwd?: string): string {
  if (isAbsolute(inputPath)) {
    return inputPath;
  }
  return resolve(cwd ?? process.cwd(), inputPath);
}

function readInputContent(input: string, inputPath?: string): string {
  if (inputPath) {
    const resolved = resolveWorkspacePath(inputPath);
    return readFileSync(resolved, 'utf-8');
  }
  return input;
}

function summarizeGraph(graph: {
  nodes: Array<{ id: string; label: string; type: string }>;
  edges: Array<{ source: string; target: string; label?: string }>;
  options?: { direction?: string; nodeSpacing?: number };
}): string {
  const nodeLines = graph.nodes
    .map((node) => `- ${node.id} (${node.type}): ${node.label}`)
    .join('\n');
  const edgeLines = graph.edges
    .map((edge) => `- ${edge.source} -> ${edge.target}${edge.label ? ` ("${edge.label}")` : ''}`)
    .join('\n');
  const options = graph.options
    ? `Direction: ${graph.options.direction ?? 'TB'}, spacing: ${graph.options.nodeSpacing ?? 50}`
    : 'Direction: TB, spacing: 50';

  return `Parsed successfully (${graph.nodes.length} nodes, ${graph.edges.length} edges)\n${options}\n\nNodes:\n${nodeLines}\n\nEdges:\n${edgeLines}`;
}

async function parseInput(
  api: Awaited<ReturnType<typeof loadExcalidrawApi>>,
  content: string,
  format: 'dsl' | 'json' | 'dot',
) {
  if (format === 'json') {
    return api.parseJSONString(content);
  }
  if (format === 'dot') {
    const { parseDOT } = await import(join(repoRoot, 'dist/parser/dot-parser.js'));
    return parseDOT(content);
  }
  return api.parseDSL(content);
}

const server = new McpServer({
  name: 'excalidraw-cli',
  version: '1.0.0',
});

server.registerTool(
  'create_diagram',
  {
    description:
      'Create an Excalidraw flowchart from DSL, JSON, or DOT input and write a .excalidraw file.',
    inputSchema: z.object({
      input: z
        .string()
        .describe('DSL, JSON, or DOT content. Ignored when inputPath is provided.'),
      inputPath: z
        .string()
        .optional()
        .describe('Path to a DSL, JSON, or DOT file instead of inline input.'),
      output: z
        .string()
        .optional()
        .describe('Output .excalidraw file path (default: diagram.excalidraw).'),
      format: z
        .enum(['dsl', 'json', 'dot'])
        .optional()
        .describe('Input format (default: dsl). Auto-detected from inputPath extension when omitted.'),
      direction: z.enum(['TB', 'BT', 'LR', 'RL']).optional().describe('Flow direction override.'),
      spacing: z.number().int().positive().optional().describe('Node spacing in pixels.'),
      cwd: z.string().optional().describe('Working directory for relative file paths.'),
    }),
  },
  async ({ input, inputPath, output, format, direction, spacing, cwd }) => {
    try {
      const api = await loadExcalidrawApi();
      const content = readInputContent(input, inputPath);
      let resolvedFormat = format ?? 'dsl';

      if (!format && inputPath) {
        if (inputPath.endsWith('.json')) {
          resolvedFormat = 'json';
        } else if (inputPath.endsWith('.dot') || inputPath.endsWith('.gv')) {
          resolvedFormat = 'dot';
        }
      }

      const graph = await parseInput(api, content, resolvedFormat);

      if (direction) {
        graph.options = { ...graph.options, direction };
      }
      if (spacing !== undefined) {
        graph.options = { ...graph.options, nodeSpacing: spacing };
      }

      const layoutedGraph = await api.layoutGraph(graph);
      const excalidrawFile = api.generateExcalidraw(layoutedGraph);
      const serialized = api.serializeExcalidraw(excalidrawFile);

      const outputPath = resolveWorkspacePath(output ?? 'diagram.excalidraw', cwd);
      writeFileSync(outputPath, serialized, 'utf-8');

      return {
        content: [
          {
            type: 'text' as const,
            text: `Created Excalidraw diagram at ${outputPath}\n${summarizeGraph(graph)}`,
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        isError: true,
        content: [{ type: 'text' as const, text: `Failed to create diagram: ${message}` }],
      };
    }
  },
);

server.registerTool(
  'validate_diagram',
  {
    description: 'Parse and validate DSL, JSON, or DOT input without generating Excalidraw output.',
    inputSchema: z.object({
      input: z.string().describe('DSL, JSON, or DOT content. Ignored when inputPath is provided.'),
      inputPath: z.string().optional().describe('Path to input file instead of inline content.'),
      format: z.enum(['dsl', 'json', 'dot']).optional().describe('Input format (default: dsl).'),
      cwd: z.string().optional().describe('Working directory for relative file paths.'),
    }),
  },
  async ({ input, inputPath, format, cwd }) => {
    try {
      const api = await loadExcalidrawApi();
      const content = readInputContent(input, inputPath);
      let resolvedFormat = format ?? 'dsl';

      if (!format && inputPath) {
        if (inputPath.endsWith('.json')) {
          resolvedFormat = 'json';
        } else if (inputPath.endsWith('.dot') || inputPath.endsWith('.gv')) {
          resolvedFormat = 'dot';
        }
      }

      const graph = await parseInput(api, content, resolvedFormat);

      return {
        content: [{ type: 'text' as const, text: summarizeGraph(graph) }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        isError: true,
        content: [{ type: 'text' as const, text: `Validation failed: ${message}` }],
      };
    }
  },
);

server.registerTool(
  'export_diagram',
  {
    description: 'Convert an existing .excalidraw file to PNG or SVG.',
    inputSchema: z.object({
      input: z.string().describe('Path to the .excalidraw file.'),
      format: z.enum(['png', 'svg']).describe('Export format.'),
      output: z.string().optional().describe('Output file path (default: same name with new extension).'),
      dark: z.boolean().optional().describe('Use dark mode theme.'),
      scale: z.number().positive().optional().describe('Scale factor for PNG export (default: 1).'),
      padding: z.number().int().nonnegative().optional().describe('Padding around content in pixels.'),
      exportBackground: z
        .boolean()
        .optional()
        .describe('Include background in export (default: true).'),
      backgroundColor: z.string().optional().describe('Background color (default: #ffffff).'),
      cwd: z.string().optional().describe('Working directory for relative file paths.'),
    }),
  },
  async ({
    input,
    format,
    output,
    dark,
    scale,
    padding,
    exportBackground,
    backgroundColor,
    cwd,
  }) => {
    try {
      const api = await loadExcalidrawApi();
      const inputPath = resolveWorkspacePath(input, cwd);
      const file = JSON.parse(readFileSync(inputPath, 'utf-8'));

      const options = {
        dark: dark ?? false,
        scale: scale ?? 1,
        padding: padding ?? 10,
        exportBackground: exportBackground ?? true,
        backgroundColor: backgroundColor ?? '#ffffff',
      };

      const outputPath = output
        ? resolveWorkspacePath(output, cwd)
        : api.swapExtension(inputPath, format);

      if (format === 'svg') {
        const svg = await api.convertToSVG(file, options);
        writeFileSync(outputPath, svg, 'utf-8');
      } else {
        const png = await api.convertToPNG(file, options);
        writeFileSync(outputPath, png);
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: `Exported ${format.toUpperCase()} diagram to ${outputPath}`,
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        isError: true,
        content: [{ type: 'text' as const, text: `Failed to export diagram: ${message}` }],
      };
    }
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('MCP server failed to start:', error);
  process.exit(1);
});
