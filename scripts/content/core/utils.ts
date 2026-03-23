import fs from "node:fs/promises";
import path from "node:path";

import {
  isPlainObject,
  type ContentIssue,
  type FrontmatterObject,
  type FrontmatterValue,
  type ParsedArgs,
} from "./types.ts";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RESERVED_PATH_SEGMENTS = new Set([
  "__proto__",
  "prototype",
  "constructor",
]);

export function parseArgs(argv: string[]): ParsedArgs {
  const positional: string[] = [];
  const flags: ParsedArgs["flags"] = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }

    const withoutPrefix = arg.slice(2);
    const equalIndex = withoutPrefix.indexOf("=");

    if (equalIndex >= 0) {
      const key = withoutPrefix.slice(0, equalIndex);
      const value = withoutPrefix.slice(equalIndex + 1);
      appendFlag(flags, key, value);
      continue;
    }

    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      appendFlag(flags, withoutPrefix, next);
      index += 1;
      continue;
    }

    appendFlag(flags, withoutPrefix, true);
  }

  return { positional, flags };
}

export function getFlag(
  flags: ParsedArgs["flags"],
  key: string,
): string | boolean | undefined {
  const value = flags[key];
  return Array.isArray(value) ? value[value.length - 1] : value;
}

export function getAllFlags(
  flags: ParsedArgs["flags"],
  key: string,
): Array<string | boolean> {
  const value = flags[key];
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

export function getStringFlag(
  flags: ParsedArgs["flags"],
  key: string,
): string | undefined {
  const value = getFlag(flags, key);

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error(`\`--${key}\` requires a value.`);
  }

  return value;
}

export function getAllStringFlags(
  flags: ParsedArgs["flags"],
  key: string,
): string[] {
  const values = getAllFlags(flags, key);

  if (values.some((value) => typeof value !== "string")) {
    throw new Error(`\`--${key}\` requires a value.`);
  }

  return values.filter((value): value is string => typeof value === "string");
}

export function normalizeCollectionKey(
  value: string | boolean | undefined,
): string | undefined {
  if (typeof value !== "string" || !value) {
    return undefined;
  }

  if (value === "project") {
    return "projects";
  }

  return value;
}

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug);
}

export function today(): string {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function listContentFiles(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listContentFiles(fullPath)));
      continue;
    }

    if (entry.isFile() && /\.(md|mdx)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

export function relativeContentPath(
  collection: { directory: string },
  filePath: string,
): string {
  return path
    .relative(collection.directory, filePath)
    .replaceAll(path.sep, "/");
}

export function getContentId(relativePath: string): string {
  return relativePath.replace(/\.(md|mdx)$/i, "");
}

export function setValueAtPath(
  target: FrontmatterObject,
  dottedPath: string,
  value: FrontmatterValue,
): void {
  const keys = dottedPath.split(".");
  const lastKey = keys.pop();

  if (!lastKey) {
    throw new Error(`Invalid field path: ${dottedPath}`);
  }

  assertSafePathSegment(lastKey, dottedPath);

  let current: FrontmatterObject = target;
  for (const [index, key] of keys.entries()) {
    assertSafePathSegment(key, dottedPath);

    const next = current[key];

    if (next === undefined) {
      const nextObject: FrontmatterObject = {};
      current[key] = nextObject;
      current = nextObject;
      continue;
    }

    if (!isPlainObject(next)) {
      const traversedPath = keys.slice(0, index + 1).join(".");
      throw new Error(
        `Cannot set field path "${dottedPath}": "${traversedPath}" already contains ${formatPathValue(next)}.`,
      );
    }

    current = next;
  }

  current[lastKey] = value;
}

export function deleteValueAtPath(
  target: FrontmatterObject,
  dottedPath: string,
): void {
  const keys = dottedPath.split(".");
  const lastKey = keys.pop();

  if (!lastKey) {
    throw new Error(`Invalid field path: ${dottedPath}`);
  }

  assertSafePathSegment(lastKey, dottedPath);

  let current: FrontmatterObject = target;
  for (const key of keys) {
    assertSafePathSegment(key, dottedPath);

    const next = current[key];

    if (!isPlainObject(next)) {
      return;
    }

    current = next;
  }

  delete current[lastKey];
}

export function formatIssue(issue: ContentIssue): string {
  return `${issue.level.toUpperCase()} ${issue.path}: ${issue.message}`;
}

function appendFlag(
  flags: ParsedArgs["flags"],
  key: string,
  value: string | boolean,
): void {
  const existing = flags[key];

  if (existing === undefined) {
    flags[key] = value;
    return;
  }

  if (Array.isArray(existing)) {
    existing.push(value);
    return;
  }

  flags[key] = [existing, value];
}

function formatPathValue(value: unknown): string {
  const formatted = JSON.stringify(value);
  if (formatted !== undefined) {
    return formatted;
  }

  return String(value);
}

function assertSafePathSegment(segment: string, dottedPath: string): void {
  if (RESERVED_PATH_SEGMENTS.has(segment)) {
    throw new Error(
      `Invalid field path "${dottedPath}": segment "${segment}" is not allowed.`,
    );
  }
}
