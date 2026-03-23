#!/usr/bin/env bun

import { runCheck } from "./commands/check.ts";
import { runNew } from "./commands/new.ts";
import { runPatch } from "./commands/patch.ts";

const [command, ...rest] = process.argv.slice(2);

const COMMANDS = {
  new: runNew,
  check: runCheck,
  patch: runPatch,
} satisfies Record<string, (argv: string[]) => Promise<void>>;

if (!command || command === "--help" || command === "help") {
  printHelp();
  process.exit(0);
}

const handler = COMMANDS[command as keyof typeof COMMANDS];

if (!handler) {
  process.stderr.write(`Unknown command: ${command}\n\n`);
  printHelp();
  process.exit(1);
}

try {
  await handler(rest);
} catch (error: unknown) {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exit(1);
}

function printHelp() {
  process.stdout.write(`Content CLI

Usage:
  content new [--type blog|projects] [--title "..."] [--slug "..."] [--format md|mdx] [--dry-run]
  content check [--type blog|projects]
  content patch --type blog|projects --set key=value [--set key=value] [--dry-run]

Examples:
  bun run content:new
  bun run content:new -- --type blog --title "Astro Content Workflow"
  bun run content:check
  bun run content:patch -- --type blog --set draft=false
  bun run content:patch -- --type projects --set githubUrl=null
`);
}
