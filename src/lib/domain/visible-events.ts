import type { HistoryEvent } from "@/lib/data/schemas";
import { playStep } from "@/lib/domain/time-scale";

/**
 * An event stays on the globe for a while after it happens so a viewer scrubbing the slider can
 * find it: longer for important events and in coarse eras, and through its whole span if it has
 * an endYear. Countries are not events — they are always pinned.
 */
export function isVisibleAt(event: HistoryEvent, year: number): boolean {
  const unit = playStep(event.year);
  const after = unit * (event.importance >= 4 ? 8 : event.importance === 3 ? 5 : 3);
  const before = unit;
  const end = event.endYear ?? event.year;
  return year >= event.year - before && year <= end + after;
}

export function visibleEvents(events: readonly HistoryEvent[], year: number): HistoryEvent[] {
  return events.filter((e) => isVisibleAt(e, year));
}

/** Events that "happen" while the year advances from `prev` (exclusive) to `year` (inclusive). */
export function eventsHappening(
  events: readonly HistoryEvent[],
  prev: number,
  year: number,
): HistoryEvent[] {
  const lo = Math.min(prev, year);
  const hi = Math.max(prev, year);
  return events.filter((e) => e.year > lo && e.year <= hi);
}

/** The most important event that happens in (prev, year] — what the Follow toggle flies to. */
export function headlineEvent(
  events: readonly HistoryEvent[],
  prev: number,
  year: number,
): HistoryEvent | undefined {
  return eventsHappening(events, prev, year).sort((a, b) => b.importance - a.importance)[0];
}
