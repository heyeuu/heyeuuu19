import fs from "node:fs/promises";
import path from "node:path";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function parseArgs(argv) {
  const positional = [];
  const flags = {};

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

export function getFlag(flags, key) {
  const value = flags[key];
  return Array.isArray(value) ? value[value.length - 1] : value;
}

export function getAllFlags(flags, key) {
  const value = flags[key];
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

export function normalizeCollectionKey(value) {
  if (!value) {
    return undefined;
  }

  if (value === "project") {
    return "projects";
  }

  return value;
}

export function slugify(input) {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function isValidSlug(slug) {
  return SLUG_PATTERN.test(slug);
}

export function today() {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function listContentFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

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

export function relativeContentPath(collection, filePath) {
  return path
    .relative(collection.directory, filePath)
    .replaceAll(path.sep, "/");
}

export function getContentId(relativePath) {
  return relativePath.replace(/\.(md|mdx)$/i, "");
}

export function setValueAtPath(target, dottedPath, value) {
  const keys = dottedPath.split(".");
  const lastKey = keys.pop();

  if (!lastKey) {
    throw new Error(`Invalid field path: ${dottedPath}`);
  }

  let current = target;
  for (const [index, key] of keys.entries()) {
    const next = current[key];

    if (next === undefined) {
      current[key] = {};
      current = current[key];
      continue;
    }

    if (!next || typeof next !== "object" || Array.isArray(next)) {
      const traversedPath = keys.slice(0, index + 1).join(".");
      throw new Error(
        `Cannot set field path "${dottedPath}": "${traversedPath}" already contains ${formatPathValue(next)}.`,
      );
    }

    current = current[key];
  }

  current[lastKey] = value;
}

export function deleteValueAtPath(target, dottedPath) {
  const keys = dottedPath.split(".");
  const lastKey = keys.pop();

  if (!lastKey) {
    throw new Error(`Invalid field path: ${dottedPath}`);
  }

  let current = target;
  for (const key of keys) {
    if (
      !current[key] ||
      typeof current[key] !== "object" ||
      Array.isArray(current[key])
    ) {
      return;
    }
    current = current[key];
  }

  delete current[lastKey];
}

export function formatIssue(issue) {
  return `${issue.level.toUpperCase()} ${issue.path}: ${issue.message}`;
}

function appendFlag(flags, key, value) {
  if (flags[key] === undefined) {
    flags[key] = value;
    return;
  }

  if (Array.isArray(flags[key])) {
    flags[key].push(value);
    return;
  }

  flags[key] = [flags[key], value];
}

function formatPathValue(value) {
  const formatted = JSON.stringify(value);
  if (formatted !== undefined) {
    return formatted;
  }

  return String(value);
}
