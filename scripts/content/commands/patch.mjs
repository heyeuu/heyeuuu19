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
  parseArgs,
  relativeContentPath,
  setValueAtPath,
} from "../core/utils.mjs";

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

  for (const filePath of files) {
    const source = await fs.readFile(filePath, "utf8");
    const parsed = parseMarkdownFile(source);

    if (!parsed.hasFrontmatter) {
      throw new Error(
        `Missing frontmatter in ${relativeContentPath(collection, filePath)}`,
      );
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
    const nextSource = stringifyMarkdownFile(normalized, parsed.body);

    if (nextSource === source) {
      continue;
    }

    changedFiles.push(relativeContentPath(collection, filePath));

    if (!dryRun) {
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

  if (rawValue === "null") {
    return { path, remove: true };
  }

  return {
    path,
    remove: false,
    value: YAML.parse(rawValue),
  };
}

function normalizeCollectionKey(value) {
  if (!value) {
    return undefined;
  }

  if (value === "project") {
    return "projects";
  }

  return value;
}
