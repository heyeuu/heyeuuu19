import path from "node:path";
import { fileURLToPath } from "node:url";

import type {
  CollectionDefinition,
  ContentIssue,
  CreateTemplateInput,
  FrontmatterObject,
  FrontmatterValue,
  SupportedCollectionKey,
} from "./types.ts";

const ROOT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

const BLOG_FIELD_ORDER = [
  "title",
  "description",
  "date",
  "draft",
  "tags",
  "series",
  "image",
];

const PROJECT_FIELD_ORDER = [
  "title",
  "description",
  "liveUrl",
  "githubUrl",
  "image",
];

export const COLLECTIONS = {
  blog: {
    key: "blog",
    label: "Blog post",
    directory: path.join(ROOT_DIR, "src/content/blog"),
    fieldOrder: BLOG_FIELD_ORDER,
    requiredFields: ["title", "description", "date"],
    createTemplate({ title, slug, date }: CreateTemplateInput) {
      return `---
title: ${JSON.stringify(title)}
description: "TODO: add a short summary."
date: "${date}"
draft: true
# tags:
#   - Example
# series: "Example Series"
# image:
#   url: "/${slug}.webp"
#   alt: "Describe the cover image"
---

## Summary

TODO: write the opening summary.

## Notes

- TODO: add the core points

## References

- TODO: add links or follow-up material
`;
    },
    validate(data: FrontmatterObject, relativePath: string) {
      const issues: ContentIssue[] = [];

      if (!isNonEmptyString(data.title)) {
        issues.push(
          issue(
            "error",
            relativePath,
            "`title` is required and must be a string.",
          ),
        );
      }

      if (!isNonEmptyString(data.description)) {
        issues.push(
          issue(
            "error",
            relativePath,
            "`description` is required and must be a string.",
          ),
        );
      } else if (isTodoPlaceholder(data.description)) {
        issues.push(
          issue(
            "warning",
            relativePath,
            "`description` is still a TODO placeholder.",
          ),
        );
      }

      if (!isNonEmptyString(data.date)) {
        issues.push(
          issue(
            "error",
            relativePath,
            "`date` is required and must be a string.",
          ),
        );
      } else if (Number.isNaN(Date.parse(data.date))) {
        issues.push(
          issue("error", relativePath, "`date` is not a valid date string."),
        );
      }

      if (data.draft !== undefined && typeof data.draft !== "boolean") {
        issues.push(
          issue(
            "error",
            relativePath,
            "`draft` must be a boolean when provided.",
          ),
        );
      }

      if (data.tags !== undefined) {
        if (!Array.isArray(data.tags) || !data.tags.every(isNonEmptyString)) {
          issues.push(
            issue("error", relativePath, "`tags` must be an array of strings."),
          );
        }
      }

      if (data.series !== undefined && typeof data.series !== "string") {
        issues.push(
          issue(
            "error",
            relativePath,
            "`series` must be a string when provided.",
          ),
        );
      }

      if (data.image !== undefined) {
        if (!isImageObject(data.image)) {
          issues.push(
            issue(
              "error",
              relativePath,
              "`image` must contain string `url` and `alt`.",
            ),
          );
        } else {
          if (isTodoPlaceholder(data.image.url)) {
            issues.push(
              issue(
                "warning",
                relativePath,
                "`image.url` is still a placeholder.",
              ),
            );
          }
          if (isTodoPlaceholder(data.image.alt)) {
            issues.push(
              issue(
                "warning",
                relativePath,
                "`image.alt` is still a TODO placeholder.",
              ),
            );
          }
        }
      }

      return issues;
    },
  },
  projects: {
    key: "projects",
    label: "Project",
    directory: path.join(ROOT_DIR, "src/content/projects"),
    fieldOrder: PROJECT_FIELD_ORDER,
    requiredFields: ["title", "description", "image"],
    createTemplate({ title, slug }: CreateTemplateInput) {
      return `---
title: ${JSON.stringify(title)}
description: "TODO: add a one-line project summary."
# liveUrl: "https://example.com"
# githubUrl: "https://github.com/yourname/project"
image:
  url: "/${slug}.webp"
  alt: "TODO: describe the project cover image"
---

## Overview

TODO: explain what the project does.

## Responsibilities

- TODO: outline your role

## Stack

- TODO: list the key technologies

## Outcome

TODO: describe the result and lessons learned.
`;
    },
    validate(data: FrontmatterObject, relativePath: string) {
      const issues: ContentIssue[] = [];

      if (!isNonEmptyString(data.title)) {
        issues.push(
          issue(
            "error",
            relativePath,
            "`title` is required and must be a string.",
          ),
        );
      }

      if (!isNonEmptyString(data.description)) {
        issues.push(
          issue(
            "error",
            relativePath,
            "`description` is required and must be a string.",
          ),
        );
      } else if (isTodoPlaceholder(data.description)) {
        issues.push(
          issue(
            "warning",
            relativePath,
            "`description` is still a TODO placeholder.",
          ),
        );
      }

      if (data.liveUrl !== undefined && !isNonEmptyString(data.liveUrl)) {
        issues.push(
          issue(
            "error",
            relativePath,
            "`liveUrl` must be a string when provided.",
          ),
        );
      }

      if (data.githubUrl !== undefined && !isNonEmptyString(data.githubUrl)) {
        issues.push(
          issue(
            "error",
            relativePath,
            "`githubUrl` must be a string when provided.",
          ),
        );
      }

      if (!isImageObject(data.image)) {
        issues.push(
          issue(
            "error",
            relativePath,
            "`image` is required and must contain `url` and `alt`.",
          ),
        );
      } else {
        if (isTodoPlaceholder(data.image.url)) {
          issues.push(
            issue(
              "warning",
              relativePath,
              "`image.url` is still a placeholder.",
            ),
          );
        }
        if (isTodoPlaceholder(data.image.alt)) {
          issues.push(
            issue(
              "warning",
              relativePath,
              "`image.alt` is still a TODO placeholder.",
            ),
          );
        }
      }

      return issues;
    },
  },
} satisfies Record<SupportedCollectionKey, CollectionDefinition>;

export function getCollection(key: string): CollectionDefinition {
  const collection = COLLECTIONS[key as SupportedCollectionKey];
  if (!collection) {
    throw new Error(`Unsupported collection: ${key}`);
  }

  return collection;
}

export function getCollectionEntries(key?: string): CollectionDefinition[] {
  if (key) {
    return [getCollection(key)];
  }

  return Object.values(COLLECTIONS);
}

export function normalizeFrontmatter(
  collection: CollectionDefinition,
  data: FrontmatterObject,
): FrontmatterObject {
  const normalized: FrontmatterObject = {};

  for (const field of collection.fieldOrder) {
    if (data[field] !== undefined) {
      normalized[field] = normalizeValue(field, data[field]);
    }
  }

  for (const [key, value] of Object.entries(data)) {
    if (normalized[key] === undefined && value !== undefined) {
      normalized[key] = normalizeValue(key, value);
    }
  }

  return normalized;
}

function normalizeValue(
  key: string,
  value: FrontmatterValue,
): FrontmatterValue {
  if (key === "image" && isImageObject(value)) {
    return {
      url: value.url,
      alt: value.alt,
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue("", item));
  }

  if (isPlainObject(value)) {
    const normalizedObject: FrontmatterObject = {};

    for (const [itemKey, itemValue] of Object.entries(value)) {
      if (itemValue !== undefined) {
        normalizedObject[itemKey] = normalizeValue(itemKey, itemValue);
      }
    }

    return normalizedObject;
  }

  return value;
}

function issue(
  level: ContentIssue["level"],
  pathValue: string,
  message: string,
): ContentIssue {
  return { level, path: pathValue, message };
}

function isImageObject(
  value: unknown,
): value is FrontmatterObject & { url: string; alt: string } {
  return Boolean(
    isPlainObject(value) &&
    isNonEmptyString(value.url) &&
    isNonEmptyString(value.alt),
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isTodoPlaceholder(value: unknown): boolean {
  if (!isNonEmptyString(value)) {
    return false;
  }

  return (
    /^todo:/i.test(value.trim()) ||
    /example\.com|yourname|placeholder/i.test(value)
  );
}

function isPlainObject(value: unknown): value is FrontmatterObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
