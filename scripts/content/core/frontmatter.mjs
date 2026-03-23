import YAML from "yaml";

export function parseMarkdownFile(source) {
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

export function stringifyMarkdownFile(data, body) {
  const frontmatter = YAML.stringify(data).trimEnd();
  const normalizedBody = body.startsWith("\n") ? body.slice(1) : body;
  return `---\n${frontmatter}\n---\n\n${normalizedBody}`;
}

function parseFrontmatterObject(frontmatterSource) {
  try {
    return ensureObject(YAML.parse(frontmatterSource) ?? {});
  } catch (error) {
    const repairedSource = repairLooseObjectBlocks(frontmatterSource);
    if (repairedSource === frontmatterSource) {
      throw error;
    }

    return ensureObject(YAML.parse(repairedSource) ?? {});
  }
}

function ensureObject(parsed) {
  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Frontmatter must be a YAML object.");
  }

  return parsed;
}

function repairLooseObjectBlocks(frontmatterSource) {
  const lines = frontmatterSource.split(/\r?\n/);
  const repaired = [];
  let looseObjectIndent = null;

  for (const line of lines) {
    if (looseObjectIndent === null) {
      const openMatch = line.match(/^(\s*[^:#]+:\s*)\{\s*$/);
      if (openMatch) {
        repaired.push(openMatch[1].trimEnd());
        looseObjectIndent = `${" ".repeat(openMatch[1].match(/^\s*/)[0].length + 2)}`;
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
