import type { MarkdownHeading } from "astro";

export type TableOfContentsHeading = MarkdownHeading & { depth: 2 | 3 };

export function getTableOfContentsHeadings(headings: MarkdownHeading[]) {
  return headings.filter(
    (heading): heading is TableOfContentsHeading =>
      heading.depth === 2 || heading.depth === 3,
  );
}

export function shouldRenderTableOfContents(
  headings: TableOfContentsHeading[],
) {
  return headings.length >= 2;
}
