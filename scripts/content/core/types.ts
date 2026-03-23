export type FlagScalar = string | boolean;

export type FlagValue = FlagScalar | FlagScalar[];

export interface ParsedArgs {
  positional: string[];
  flags: Record<string, FlagValue | undefined>;
}

export type FrontmatterScalar = string | number | boolean | null;

export type FrontmatterValue =
  | FrontmatterScalar
  | FrontmatterObject
  | FrontmatterValue[];

export interface FrontmatterObject {
  [key: string]: FrontmatterValue | undefined;
}

export function isPlainObject(value: unknown): value is FrontmatterObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export interface ContentIssue {
  level: "error" | "warning";
  path: string;
  message: string;
}

export interface CreateTemplateInput {
  title: string;
  slug: string;
  date: string;
}

export interface CollectionDefinition {
  key: "blog" | "projects";
  label: string;
  directory: string;
  fieldOrder: readonly string[];
  requiredFields: readonly string[];
  createTemplate(input: CreateTemplateInput): string;
  validate(data: FrontmatterObject, relativePath: string): ContentIssue[];
}

export type SupportedCollectionKey = CollectionDefinition["key"];
