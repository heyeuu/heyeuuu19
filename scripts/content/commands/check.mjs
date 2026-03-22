import fs from "node:fs/promises";

import {
  getCollectionEntries,
  normalizeFrontmatter,
} from "../core/collections.mjs";
import { parseMarkdownFile } from "../core/frontmatter.mjs";
import {
  formatIssue,
  getContentId,
  getFlag,
  isValidSlug,
  listContentFiles,
  parseArgs,
  relativeContentPath,
} from "../core/utils.mjs";

export async function runCheck(argv) {
  const { flags } = parseArgs(argv);
  const collectionKey = normalizeCollectionKey(getFlag(flags, "type"));
  const collections = getCollectionEntries(collectionKey);
  const issues = [];

  for (const collection of collections) {
    const files = await listContentFiles(collection.directory);

    for (const filePath of files) {
      const source = await fs.readFile(filePath, "utf8");
      const relativePath = relativeContentPath(collection, filePath);
      const contentId = getContentId(relativePath);

      try {
        const parsed = parseMarkdownFile(source);

        if (!parsed.hasFrontmatter) {
          issues.push({
            level: "error",
            path: relativePath,
            message: "Missing frontmatter block.",
          });
          continue;
        }

        const segmentIssues = validateContentId(relativePath, contentId);
        issues.push(...segmentIssues);

        const normalized = normalizeFrontmatter(collection, parsed.data);
        issues.push(...collection.validate(normalized, relativePath));
      } catch (error) {
        issues.push({
          level: "error",
          path: relativePath,
          message: error.message,
        });
      }
    }
  }

  if (issues.length === 0) {
    process.stdout.write("Content check passed.\n");
    return;
  }

  for (const issue of issues) {
    process.stdout.write(`${formatIssue(issue)}\n`);
  }

  process.exitCode = issues.some((issue) => issue.level === "error") ? 1 : 0;
}

function validateContentId(relativePath, contentId) {
  const issues = [];
  const segments = contentId.split("/");

  for (const segment of segments) {
    if (!isValidSlug(segment)) {
      issues.push({
        level: "warning",
        path: relativePath,
        message:
          "File name should use lowercase letters, numbers, and hyphens for a stable route slug.",
      });
      break;
    }
  }

  return issues;
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
