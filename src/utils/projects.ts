import type { CollectionEntry } from "astro:content";

export type ProjectEntry = CollectionEntry<"projects">;

export function compareProjects(left: ProjectEntry, right: ProjectEntry) {
  const leftOrder = left.data.order;
  const rightOrder = right.data.order;

  if (leftOrder !== undefined || rightOrder !== undefined) {
    if (leftOrder === undefined) return 1;
    if (rightOrder === undefined) return -1;
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
  }

  const leftDate = left.data.date?.valueOf();
  const rightDate = right.data.date?.valueOf();

  if (leftDate !== undefined || rightDate !== undefined) {
    if (leftDate === undefined) return 1;
    if (rightDate === undefined) return -1;
    if (leftDate !== rightDate) return rightDate - leftDate;
  }

  return left.id.localeCompare(right.id);
}

export function sortProjects(projects: ProjectEntry[]) {
  return [...projects].sort(compareProjects);
}
