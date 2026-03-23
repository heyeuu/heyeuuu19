import fs from "node:fs/promises";

import {
  getCollectionEntries,
  normalizeFrontmatter,
} from "../core/collections.ts";
import { parseMarkdownFile } from "../core/frontmatter.ts";
import {
  formatIssue,
  getContentId,
  getStringFlag,
  isValidSlug,
  listContentFiles,
  normalizeCollectionKey,
  parseArgs,
  relativeContentPath,
} from "../core/utils.ts";
import type { ContentIssue } from "../core/types.ts";

export async function runCheck(argv: string[]): Promise<void> {
  const { flags } = parseArgs(argv);
  const collectionKey = normalizeCollectionKey(getStringFlag(flags, "type"));
  const collections = getCollectionEntries(collectionKey);
  const issues: ContentIssue[] = [];

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
      } catch (error: unknown) {
        issues.push({
          level: "error",
          path: relativePath,
          message: error instanceof Error ? error.message : String(error),
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

function validateContentId(
  relativePath: string,
  contentId: string,
): ContentIssue[] {
  const issues: ContentIssue[] = [];
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
