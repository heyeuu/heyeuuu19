import YAML from "yaml";

import { isPlainObject, type FrontmatterObject } from "./types.ts";

export function parseMarkdownFile(source: string): {
  data: FrontmatterObject;
  body: string;
  hasFrontmatter: boolean;
} {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);

  if (!match) {
    return {
      data: {},
      body: source,
      hasFrontmatter: false,
    };
  }

  const frontmatterSource = match[1];
  const body = source.slice(match[0].length);
  const parsed = parseFrontmatterObject(frontmatterSource);

  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Frontmatter must be a YAML object.");
  }

  return {
    data: parsed,
    body,
    hasFrontmatter: true,
  };
}

export function stringifyMarkdownFile(
  data: FrontmatterObject,
  body: string,
): string {
  const frontmatter = YAML.stringify(data).trimEnd();
  const normalizedBody = body.startsWith("\n") ? body.slice(1) : body;
  return `---\n${frontmatter}\n---\n\n${normalizedBody}`;
}

function parseFrontmatterObject(frontmatterSource: string): FrontmatterObject {
  try {
    return ensureObject(YAML.parse(frontmatterSource) ?? {});
  } catch (error: unknown) {
    const repairedSource = repairLooseObjectBlocks(frontmatterSource);
    if (repairedSource === frontmatterSource) {
      throw error;
    }

    return ensureObject(YAML.parse(repairedSource) ?? {});
  }
}

function ensureObject(parsed: unknown): FrontmatterObject {
  if (!isPlainObject(parsed)) {
    throw new Error("Frontmatter must be a YAML object.");
  }

  return parsed;
}

function repairLooseObjectBlocks(frontmatterSource: string): string {
  const lines = frontmatterSource.split(/\r?\n/);
  const repaired: string[] = [];
  let looseObjectIndent: string | null = null;

  for (const line of lines) {
    if (looseObjectIndent === null) {
      const openMatch = line.match(/^(\s*[^:#]+:\s*)\{\s*$/);
      if (openMatch) {
        repaired.push(openMatch[1].trimEnd());
        const leadingWhitespace = openMatch[1].match(/^\s*/)?.[0] ?? "";
        looseObjectIndent = `${" ".repeat(leadingWhitespace.length + 2)}`;
        continue;
      }

      repaired.push(line);
      continue;
    }

    if (line.trim() === "}") {
      looseObjectIndent = null;
      continue;
    }

    repaired.push(
      `${looseObjectIndent}${line.trimStart().replace(/,\s*$/, "")}`,
    );
  }

  return repaired.join("\n");
}
