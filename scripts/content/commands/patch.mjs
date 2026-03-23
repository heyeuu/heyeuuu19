import fs from "node:fs/promises";

import YAML from "yaml";

import { getCollection, normalizeFrontmatter } from "../core/collections.mjs";
import {
  parseMarkdownFile,
  stringifyMarkdownFile,
} from "../core/frontmatter.mjs";
import {
  deleteValueAtPath,
  getAllFlags,
  getFlag,
  listContentFiles,
  normalizeCollectionKey,
  parseArgs,
  relativeContentPath,
  setValueAtPath,
} from "../core/utils.mjs";

const MISSING_VALUE = Symbol("missing-value");

export async function runPatch(argv) {
  const { flags } = parseArgs(argv);
  const collectionKey = normalizeCollectionKey(getFlag(flags, "type"));
  const assignments = getAllFlags(flags, "set");
  const dryRun = Boolean(getFlag(flags, "dry-run"));

  if (!collectionKey) {
    throw new Error("`--type` is required.");
  }

  if (assignments.length === 0) {
    throw new Error("At least one `--set key=value` assignment is required.");
  }

  const collection = getCollection(collectionKey);
  const files = await listContentFiles(collection.directory);
  const operations = assignments.map(parseAssignment);
  const changedFiles = [];
  const pendingWrites = [];

  for (const filePath of files) {
    const source = await fs.readFile(filePath, "utf8");
    const parsed = parseMarkdownFile(source);
    const relativePath = relativeContentPath(collection, filePath);

    if (!parsed.hasFrontmatter) {
      throw new Error(`Missing frontmatter in ${relativePath}`);
    }

    const nextData = structuredClone(parsed.data);

    for (const operation of operations) {
      if (operation.remove) {
        deleteValueAtPath(nextData, operation.path);
      } else {
        setValueAtPath(nextData, operation.path, operation.value);
      }
    }

    const normalized = normalizeFrontmatter(collection, nextData);

    for (const operation of operations) {
      if (operation.remove) {
        continue;
      }

      const normalizedValue = getValueAtPath(normalized, operation.path);

      if (normalizedValue === MISSING_VALUE) {
        throw new Error(
          `Failed to apply \`--set ${operation.path}\` in ${relativePath}: path is missing after normalization.`,
        );
      }

      if (!isDeepEqual(normalizedValue, operation.value)) {
        throw new Error(
          `Failed to apply \`--set ${operation.path}\` in ${relativePath}: expected ${formatValue(operation.value)}, got ${formatValue(normalizedValue)}.`,
        );
      }
    }

    const nextSource = stringifyMarkdownFile(normalized, parsed.body);

    if (nextSource === source) {
      continue;
    }

    changedFiles.push(relativePath);
    pendingWrites.push({ filePath, nextSource });
  }

  if (!dryRun) {
    for (const { filePath, nextSource } of pendingWrites) {
      await fs.writeFile(filePath, nextSource, "utf8");
    }
  }

  if (dryRun) {
    process.stdout.write(`Would update ${changedFiles.length} file(s).\n`);
  } else {
    process.stdout.write(`Updated ${changedFiles.length} file(s).\n`);
  }

  for (const file of changedFiles) {
    process.stdout.write(`- ${file}\n`);
  }
}

function parseAssignment(input) {
  const separatorIndex = input.indexOf("=");
  if (separatorIndex <= 0) {
    throw new Error(`Invalid assignment: ${input}`);
  }

  const path = input.slice(0, separatorIndex).trim();
  const rawValue = input.slice(separatorIndex + 1).trim();

  if (!path) {
    throw new Error(`Invalid assignment path: ${input}`);
  }

  if (rawValue === "") {
    return { path, remove: false, value: "" };
  }

  if (rawValue === "null") {
    return { path, remove: true };
  }

  return {
    path,
    remove: false,
    value: YAML.parse(rawValue),
  };
}

function getValueAtPath(target, dottedPath) {
  const keys = dottedPath.split(".");
  let current = target;

  for (const key of keys) {
    if (!current || typeof current !== "object" || !(key in current)) {
      return MISSING_VALUE;
    }

    current = current[key];
  }

  return current;
}

function isDeepEqual(left, right) {
  if (Object.is(left, right)) {
    return true;
  }

  if (left instanceof Date && right instanceof Date) {
    return left.valueOf() === right.valueOf();
  }

  if (
    !left ||
    !right ||
    typeof left !== "object" ||
    typeof right !== "object"
  ) {
    return false;
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) {
      return false;
    }

    if (left.length !== right.length) {
      return false;
    }

    return left.every((item, index) => isDeepEqual(item, right[index]));
  }

  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every(
    (key) => key in right && isDeepEqual(left[key], right[key]),
  );
}

function formatValue(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return JSON.stringify(value);
}
