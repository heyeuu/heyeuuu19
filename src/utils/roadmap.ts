import type { CollectionEntry } from "astro:content";

export type RoadmapEntry = CollectionEntry<"roadmap">;
export type RoadmapStatus = RoadmapEntry["data"]["status"];

export const ROADMAP_STATUS_ORDER: Record<RoadmapStatus, number> = {
  doing: 0,
  todo: 1,
  done: 2,
};

export const ROADMAP_STATUS_LABELS: Record<RoadmapStatus, string> = {
  doing: "In progress",
  todo: "Planned",
  done: "Shipped",
};

const ROADMAP_STATUS_CLASSNAMES: Record<RoadmapStatus, string> = {
  doing: "border-primary/70 bg-primary/20 text-foreground",
  todo: "border-secondary/40 bg-background text-secondary",
  done: "border-secondary/40 bg-secondary/10 text-secondary",
};

export function compareRoadmapEntries(left: RoadmapEntry, right: RoadmapEntry) {
  const statusDiff =
    ROADMAP_STATUS_ORDER[left.data.status] -
    ROADMAP_STATUS_ORDER[right.data.status];

  if (statusDiff !== 0) {
    return statusDiff;
  }

  const leftPriority = left.data.priority;
  const rightPriority = right.data.priority;

  if (leftPriority !== undefined || rightPriority !== undefined) {
    if (leftPriority === undefined) return 1;
    if (rightPriority === undefined) return -1;
    if (leftPriority !== rightPriority) return leftPriority - rightPriority;
  }

  const leftDate = left.data.date?.valueOf();
  const rightDate = right.data.date?.valueOf();

  if (leftDate !== undefined || rightDate !== undefined) {
    if (leftDate === undefined) return 1;
    if (rightDate === undefined) return -1;

    if (leftDate !== rightDate) {
      if (left.data.status === "done" && right.data.status === "done") {
        return rightDate - leftDate;
      }

      return leftDate - rightDate;
    }
  }

  return left.id.localeCompare(right.id);
}

export function sortRoadmapEntries(entries: RoadmapEntry[]) {
  return [...entries].sort(compareRoadmapEntries);
}

export function groupRoadmapEntries(entries: RoadmapEntry[]) {
  const groupedByStatus: Record<RoadmapStatus, RoadmapEntry[]> = {
    doing: [],
    todo: [],
    done: [],
  };

  for (const entry of entries) {
    groupedByStatus[entry.data.status].push(entry);
  }

  return (Object.keys(ROADMAP_STATUS_ORDER) as RoadmapStatus[])
    .sort((leftStatus, rightStatus) => {
      return (
        ROADMAP_STATUS_ORDER[leftStatus] - ROADMAP_STATUS_ORDER[rightStatus]
      );
    })
    .map((status) => ({
      status,
      label: ROADMAP_STATUS_LABELS[status],
      entries: groupedByStatus[status],
    }));
}

export function getRoadmapStatusLabel(status: RoadmapStatus) {
  return ROADMAP_STATUS_LABELS[status];
}

export function getRoadmapStatusClassName(status: RoadmapStatus) {
  return ROADMAP_STATUS_CLASSNAMES[status];
}
