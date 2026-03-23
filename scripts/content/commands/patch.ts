import fs from "node:fs/promises";

import YAML from "yaml";

import { getCollection, normalizeFrontmatter } from "../core/collections.ts";
import {
  parseMarkdownFile,
  stringifyMarkdownFile,
} from "../core/frontmatter.ts";
import {
  deleteValueAtPath,
  formatIssue,
  getAllStringFlags,
  getFlag,
  getStringFlag,
  listContentFiles,
  normalizeCollectionKey,
  parseArgs,
  relativeContentPath,
  setValueAtPath,
} from "../core/utils.ts";
import type { FrontmatterObject, FrontmatterValue } from "../core/types.ts";

const MISSING_VALUE = Symbol("missing-value");

type SetOperation = {
  path: string;
  remove: false;
  value: FrontmatterValue;
};

type RemoveOperation = {
  path: string;
  remove: true;
};

type PatchOperation = SetOperation | RemoveOperation;

export async function runPatch(argv: string[]): Promise<void> {
  const { flags } = parseArgs(argv);
  const collectionKey = normalizeCollectionKey(getStringFlag(flags, "type"));
  const assignments = getAllStringFlags(flags, "set");
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
  const changedFiles: string[] = [];
  const pendingWrites: Array<{ filePath: string; nextSource: string }> = [];

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

    const validationOperations = getValidationOperations(operations, nextData);
    const normalized = normalizeFrontmatter(collection, nextData);

    for (const operation of validationOperations) {
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

    const validationIssues = collection
      .validate(normalized, relativePath)
      .filter((issue) => issue.level === "error");

    if (validationIssues.length > 0) {
      throw new Error(
        `Validation failed for ${relativePath}:\n${validationIssues
          .map((issue) => `- ${formatIssue(issue)}`)
          .join("\n")}`,
      );
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

function parseAssignment(input: string): PatchOperation {
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
    value: YAML.parse(rawValue) as FrontmatterValue,
  };
}

function getValidationOperations(
  operations: PatchOperation[],
  target: FrontmatterObject,
): SetOperation[] {
  const seenPaths = new Set();
  const validationOperations: SetOperation[] = [];

  for (let index = operations.length - 1; index >= 0; index -= 1) {
    const operation = operations[index];

    if (operation.remove || seenPaths.has(operation.path)) {
      continue;
    }

    seenPaths.add(operation.path);

    const value = getValueAtPath(target, operation.path);
    if (value === MISSING_VALUE) {
      continue;
    }

    validationOperations.unshift({
      path: operation.path,
      remove: false,
      value,
    });
  }

  return validationOperations;
}

function getValueAtPath(
  target: unknown,
  dottedPath: string,
): FrontmatterValue | typeof MISSING_VALUE {
  const keys = dottedPath.split(".");
  let current: unknown = target;

  for (const key of keys) {
    if (!isRecord(current) || !(key in current)) {
      return MISSING_VALUE;
    }

    current = current[key];
  }

  return current as FrontmatterValue;
}

function isDeepEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }

  if (left instanceof Date && right instanceof Date) {
    return left.valueOf() === right.valueOf();
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

  if (!left || !right || !isRecord(left) || !isRecord(right)) {
    return false;
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

function formatValue(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return JSON.stringify(value) ?? String(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
