import fs from "node:fs/promises";
import path from "node:path";

import prompts, { type PromptObject } from "prompts";

import { getCollection } from "../core/collections.ts";
import {
  getFlag,
  getStringFlag,
  isValidSlug,
  normalizeCollectionKey,
  parseArgs,
  slugify,
  today,
} from "../core/utils.ts";

type ContentFormat = "md" | "mdx";
type PromptName = "collectionKey" | "title" | "slug" | "format";

type PromptAnswers = Partial<Record<PromptName, string>>;

type NewAnswers = PromptAnswers & {
  format: ContentFormat;
};

export async function runNew(argv: string[]): Promise<void> {
  const { flags } = parseArgs(argv);
  const collectionKey = normalizeCollectionKey(getStringFlag(flags, "type"));
  const rawFlagFormat =
    getStringFlag(flags, "format") ??
    (getFlag(flags, "mdx") ? "mdx" : undefined);
  const titleFromFlag = getStringFlag(flags, "title");
  const slugFromFlag = getStringFlag(flags, "slug");
  const dryRun = Boolean(getFlag(flags, "dry-run"));
  const interactive = !getFlag(flags, "no-prompt");

  const rawAnswers: PromptAnswers = interactive
    ? await askQuestions({
        collectionKey,
        title: titleFromFlag,
        slug: slugFromFlag,
        format: rawFlagFormat,
      })
    : {
        collectionKey,
        title: titleFromFlag,
        slug: slugFromFlag,
        format: rawFlagFormat,
      };

  const answers: NewAnswers = {
    ...rawAnswers,
    format: normalizeFormat(rawAnswers.format ?? "md"),
  };

  if (!answers.collectionKey) {
    throw new Error("`--type` is required when `--no-prompt` is used.");
  }

  if (!answers.title || !answers.title.trim()) {
    throw new Error("`--title` is required when `--no-prompt` is used.");
  }

  const resolvedSlug = answers.slug?.trim() || slugify(answers.title);
  if (!resolvedSlug) {
    throw new Error(
      "Could not derive a slug from the title. Please pass `--slug`.",
    );
  }

  if (!isValidSlug(resolvedSlug)) {
    throw new Error(
      "Slug must use lowercase letters, numbers, and hyphens only.",
    );
  }

  const collection = getCollection(answers.collectionKey);
  const filePath = path.join(
    collection.directory,
    `${resolvedSlug}.${answers.format}`,
  );

  const content = collection.createTemplate({
    title: answers.title.trim(),
    slug: resolvedSlug,
    date: today(),
  });

  if (dryRun) {
    process.stdout.write(`Would create ${filePath}\n\n${content}`);
    return;
  }

  await fs.mkdir(path.dirname(filePath), { recursive: true });

  try {
    await fs.writeFile(filePath, content, { encoding: "utf8", flag: "wx" });
  } catch (error: unknown) {
    if (getErrorCode(error) === "EEXIST") {
      throw new Error(`File already exists: ${filePath}`);
    }

    throw error;
  }

  process.stdout.write(
    [
      `Created ${filePath}`,
      `Route: /${collection.key}/${resolvedSlug}`,
      answers.collectionKey === "blog"
        ? "Next step: update the TODO frontmatter and keep `draft: true` until the post is ready."
        : "Next step: replace the placeholder image path and fill in the TODO sections.",
    ].join("\n") + "\n",
  );
}

async function askQuestions(
  initialValues: PromptAnswers,
): Promise<PromptAnswers> {
  const questions: PromptObject<PromptName>[] = [
    {
      type: initialValues.collectionKey ? null : "select",
      name: "collectionKey",
      message: "选择内容类型",
      choices: [
        { title: "Blog post", value: "blog" },
        { title: "Project", value: "projects" },
      ],
    },
    {
      type: initialValues.title ? null : "text",
      name: "title",
      message: "请输入标题",
      validate: (value) => (value.trim() ? true : "标题不能为空"),
    },
    {
      type: "text",
      name: "slug",
      message: "确认 slug",
      initial: (_previous, previousAnswers) =>
        initialValues.slug ??
        slugify(initialValues.title ?? previousAnswers.title ?? ""),
      validate: (value) =>
        isValidSlug(value.trim())
          ? true
          : "slug 只能包含小写字母、数字和连字符",
    },
    {
      type: initialValues.format ? null : "select",
      name: "format",
      message: "选择文件格式",
      choices: [
        { title: "Markdown (.md)", value: "md" },
        { title: "MDX (.mdx)", value: "mdx" },
      ],
    },
  ];

  const response = await prompts<PromptName>(questions, {
    onCancel: () => {
      throw new Error("Command cancelled.");
    },
  });

  return {
    collectionKey: initialValues.collectionKey ?? response.collectionKey,
    title: initialValues.title ?? response.title,
    slug: response.slug ?? initialValues.slug,
    format: initialValues.format ?? response.format,
  };
}

function normalizeFormat(value: string): ContentFormat {
  if (value === "md" || value === "mdx") {
    return value;
  }

  throw new Error("Format must be `md` or `mdx`.");
}

function getErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return undefined;
  }

  const { code } = error as { code?: unknown };
  return typeof code === "string" ? code : undefined;
}
