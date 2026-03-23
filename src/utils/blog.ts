import type { CollectionEntry } from "astro:content";

export type BlogEntry = CollectionEntry<"blog">;
export type SortOrder = "asc" | "desc";
export type TaxonomyKind = "tag" | "series";
export type TaxonomyGroup = {
  name: string;
  slug: string;
  postCount: number;
  posts: BlogEntry[];
};

const TAXONOMY_SLUG_CHAR = /^[\p{Letter}\p{Number}]$/u;
const TAXONOMY_SLUG_SEPARATOR = /^[\s_-]$/u;

export function getPublishedBlogPosts(posts: BlogEntry[]) {
  return sortBlogPosts(posts.filter((post) => !post.data.draft));
}

export function sortBlogPosts(posts: BlogEntry[], order: SortOrder = "desc") {
  const direction = order === "asc" ? 1 : -1;

  return [...posts].sort(
    (a, b) => (a.data.date.valueOf() - b.data.date.valueOf()) * direction,
  );
}

export function groupPostsByYear(posts: BlogEntry[]) {
  const postsByYear = new Map<string, BlogEntry[]>();

  for (const post of posts) {
    const year = post.data.date.getFullYear().toString();
    const existingPosts = postsByYear.get(year) ?? [];
    existingPosts.push(post);
    postsByYear.set(year, existingPosts);
  }

  return [...postsByYear.entries()]
    .sort(([leftYear], [rightYear]) => Number(rightYear) - Number(leftYear))
    .map(([year, yearPosts]) => ({
      year,
      posts: sortBlogPosts(yearPosts),
    }));
}

export function getTagGroups(posts: BlogEntry[]) {
  return collectTaxonomyGroups(posts, (post) => post.data.tags ?? [], "name");
}

export function getSeriesGroups(posts: BlogEntry[]) {
  return collectTaxonomyGroups(
    posts,
    (post) => (post.data.series ? [post.data.series] : []),
    "latest",
  );
}

export function getTagPath(tag: string) {
  return `/blog/tags/${toTaxonomySlug(tag)}`;
}

export function getSeriesPath(series: string) {
  return `/blog/series/${toTaxonomySlug(series)}`;
}

export function toTaxonomySlug(value: string) {
  const normalizedValue = normalizeTaxonomyValue(value).toLowerCase();
  const parts: string[] = [];
  let needsSeparator = false;

  for (const char of normalizedValue) {
    if (TAXONOMY_SLUG_CHAR.test(char)) {
      if (needsSeparator && parts.length > 0) {
        parts.push("-");
      }

      parts.push(char);
      needsSeparator = false;
      continue;
    }

    if (TAXONOMY_SLUG_SEPARATOR.test(char)) {
      needsSeparator = parts.length > 0;
      continue;
    }

    if (needsSeparator && parts.length > 0) {
      parts.push("-");
      needsSeparator = false;
    }

    if (parts.length > 0 && parts[parts.length - 1] !== "-") {
      parts.push("-");
    }

    parts.push(`u${char.codePointAt(0)?.toString(16).padStart(4, "0")}`);
  }

  const normalized = parts
    .join("")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "untitled";
}

export function sortTaxonomyGroupsByUsage(groups: TaxonomyGroup[]) {
  return [...groups].sort(
    (leftGroup, rightGroup) =>
      rightGroup.postCount - leftGroup.postCount ||
      leftGroup.name.localeCompare(rightGroup.name),
  );
}

/**
 * Returns posts belonging to a series, sorted in ascending date order.
 * Note: If `series` is empty/falsy, this will match all posts without a series.
 * Callers should guard against this if an empty result is desired for missing series.
 */
export function getSeriesPosts(posts: BlogEntry[], series: string) {
  const seriesKey = getTaxonomyKey(series);

  return sortBlogPosts(
    posts.filter((post) => getTaxonomyKey(post.data.series) === seriesKey),
    "asc",
  );
}

function collectTaxonomyGroups(
  posts: BlogEntry[],
  selectValues: (post: BlogEntry) => string[],
  sortMode: "latest" | "name",
) {
  const groups = new Map<string, TaxonomyGroup>();

  for (const post of posts) {
    const seenSlugs = new Set<string>();

    for (const rawValue of selectValues(post)) {
      const name = normalizeTaxonomyValue(rawValue);

      if (!name) {
        continue;
      }

      const slug = getTaxonomyKey(name);

      if (seenSlugs.has(slug)) {
        continue;
      }

      seenSlugs.add(slug);
      const existingGroup = groups.get(slug);

      if (existingGroup) {
        existingGroup.posts.push(post);
        existingGroup.postCount += 1;
        continue;
      }

      groups.set(slug, {
        name,
        slug,
        postCount: 1,
        posts: [post],
      });
    }
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      posts:
        sortMode === "latest"
          ? sortBlogPosts(group.posts, "asc")
          : sortBlogPosts(group.posts),
    }))
    .sort((leftGroup, rightGroup) => {
      if (sortMode === "latest") {
        return (
          rightGroup.posts[rightGroup.posts.length - 1].data.date.valueOf() -
            leftGroup.posts[leftGroup.posts.length - 1].data.date.valueOf() ||
          leftGroup.name.localeCompare(rightGroup.name)
        );
      }

      return leftGroup.name.localeCompare(rightGroup.name);
    });
}

function normalizeTaxonomyValue(value?: string) {
  return value?.trim() ?? "";
}

function getTaxonomyKey(value?: string) {
  const normalizedValue = normalizeTaxonomyValue(value);

  if (!normalizedValue) {
    return "";
  }

  return toTaxonomySlug(normalizedValue);
}
