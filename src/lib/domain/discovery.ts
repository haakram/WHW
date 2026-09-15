import type { HistoryEvent } from "@/lib/data/schemas";

export interface DiscoveryState {
  events: string[];
  countries: string[];
  toursCompleted: string[];
}

export const EMPTY_DISCOVERY: DiscoveryState = { events: [], countries: [], toursCompleted: [] };

export interface Badge {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
}

function addUnique(list: readonly string[], id: string): string[] {
  return list.includes(id) ? [...list] : [...list, id];
}

export function discoverEvent(s: DiscoveryState, id: string): DiscoveryState {
  return { ...s, events: addUnique(s.events, id) };
}
export function discoverCountry(s: DiscoveryState, name: string): DiscoveryState {
  return { ...s, countries: addUnique(s.countries, name) };
}
export function completeTour(s: DiscoveryState, id: string): DiscoveryState {
  return { ...s, toursCompleted: addUnique(s.toursCompleted, id) };
}

/** Badge rules — pure so the HUD can show progress without side effects. */
export function computeBadges(s: DiscoveryState, events: readonly HistoryEvent[]): Badge[] {
  const opened = events.filter((e) => s.events.includes(e.id));
  const visitedBc = opened.some((e) => e.year < 0);
  const visitedModern = opened.some((e) => e.year >= 1900);
  return [
    { id: "first-steps", name: "First steps", description: "Open your first event", unlocked: s.events.length >= 1 },
    { id: "explorer", name: "Explorer", description: "Open 10 events", unlocked: s.events.length >= 10 },
    { id: "historian", name: "Historian", description: "Open 25 events", unlocked: s.events.length >= 25 },
    { id: "cartographer", name: "Cartographer", description: "Read 5 country dossiers", unlocked: s.countries.length >= 5 },
    { id: "time-traveller", name: "Time traveller", description: "Visit antiquity and the 20th century", unlocked: visitedBc && visitedModern },
    { id: "grand-tour", name: "Grand tour", description: "Finish a guided story tour", unlocked: s.toursCompleted.length >= 1 },
  ];
}
