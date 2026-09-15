"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type Dispatch,
  type ReactNode,
} from "react";
import type { BorderFeature, Category, Country, Era, HistoryEvent, Tour } from "@/lib/data/schemas";
import {
  fetchCountries,
  fetchSnapshot,
  fetchSnapshotIndex,
  getEras,
  getEvents,
  getTours,
} from "@/lib/data/loaders";
import { MAX_YEAR } from "@/lib/data/schemas";
import { nextYear } from "@/lib/domain/time-scale";
import { pickSnapshotYear } from "@/lib/domain/snapshot";
import { eventsHappening, headlineEvent } from "@/lib/domain/visible-events";
import {
  completeTour,
  discoverCountry,
  discoverEvent,
  EMPTY_DISCOVERY,
  type DiscoveryState,
} from "@/lib/domain/discovery";
import { polityDisplayName } from "@/lib/domain/palette";
import type { GlobeCameraTarget } from "@/components/globe/globe-types";

export type Speed = 1 | 2 | 4;
export type Selection =
  | { kind: "event"; id: string }
  | { kind: "country"; feature: BorderFeature }
  | null;

export interface Pulse {
  id: string;
  lat: number;
  lng: number;
  importance: number;
  until: number;
}

export interface HistoryState {
  year: number;
  playing: boolean;
  speed: Speed;
  follow: boolean;
  selection: Selection;
  tour: { id: string; stop: number } | null;
  cameraTarget: GlobeCameraTarget | null;
  pulses: Pulse[];
  discovery: DiscoveryState;
  countries: Country[];
  snapshotYears: number[];
  snapshotYear: number | null;
  polygons: BorderFeature[];
  loadingSnapshot: boolean;
  hiddenCategories: Category[];
  error: string | null;
}

export type Action =
  | { type: "setYear"; year: number }
  | { type: "tick" }
  | { type: "setPlaying"; playing: boolean }
  | { type: "setSpeed"; speed: Speed }
  | { type: "toggleFollow" }
  | { type: "select"; selection: Selection; fly?: boolean }
  | { type: "startTour"; id: string }
  | { type: "tourStep"; delta: 1 | -1 }
  | { type: "endTour" }
  | { type: "flyTo"; target: GlobeCameraTarget }
  | { type: "countriesLoaded"; countries: Country[] }
  | { type: "snapshotIndexLoaded"; years: number[] }
  | { type: "snapshotRequested" }
  | { type: "snapshotLoaded"; year: number; features: BorderFeature[] }
  | { type: "error"; message: string }
  | { type: "toggleCategory"; category: Category }
  | { type: "discoveryLoaded"; discovery: DiscoveryState }
  | { type: "prunePulses"; now: number };

const START_YEAR = 1950;
const TICKS_PER_SECOND = 3;
const DISCOVERY_KEY = "whw-discovery-v1";

export const initialState: HistoryState = {
  year: START_YEAR,
  playing: false,
  speed: 1,
  follow: false,
  selection: null,
  tour: null,
  cameraTarget: null,
  pulses: [],
  discovery: EMPTY_DISCOVERY,
  countries: [],
  snapshotYears: [],
  snapshotYear: null,
  polygons: [],
  loadingSnapshot: false,
  hiddenCategories: [],
  error: null,
};

function applyStop(s: HistoryState, tour: Tour, idx: number): HistoryState {
  const stop = tour.stops[idx];
  const ev = stop ? getEvents().find((e) => e.id === stop.eventId) : undefined;
  if (!stop || !ev) return s;
  return {
    ...s,
    tour: { id: tour.id, stop: idx },
    year: ev.year,
    playing: false,
    selection: { kind: "event", id: ev.id },
    cameraTarget: { lat: ev.lat, lng: ev.lng, altitude: stop.altitude, durationMs: 1800 },
    discovery: discoverEvent(s.discovery, ev.id),
  };
}

export function reducer(s: HistoryState, a: Action): HistoryState {
  switch (a.type) {
    case "setYear":
      return { ...s, year: a.year };
    case "tick": {
      const next = nextYear(s.year, 1);
      if (next === s.year || s.year >= MAX_YEAR) return { ...s, playing: false };
      const events = getEvents();
      const now = Date.now();
      const born = eventsHappening(events, s.year, next).map<Pulse>((e) => ({
        id: `${e.id}@${next}`,
        lat: e.lat,
        lng: e.lng,
        importance: e.importance,
        until: now + 2400,
      }));
      const pulses = [...s.pulses.filter((p) => p.until > now), ...born];
      const head = s.follow ? headlineEvent(events, s.year, next) : undefined;
      return {
        ...s,
        year: next,
        pulses,
        ...(head && head.importance >= 4
          ? { cameraTarget: { lat: head.lat, lng: head.lng, altitude: 1.6, durationMs: 900 } }
          : {}),
      };
    }
    case "setPlaying":
      return { ...s, playing: a.playing, ...(a.playing ? { tour: null } : {}) };
    case "setSpeed":
      return { ...s, speed: a.speed };
    case "toggleFollow":
      return { ...s, follow: !s.follow };
    case "select": {
      if (a.selection === null) return { ...s, selection: null };
      if (a.selection.kind === "event") {
        const sel = a.selection;
        const ev = getEvents().find((e) => e.id === sel.id);
        return {
          ...s,
          selection: sel,
          discovery: discoverEvent(s.discovery, sel.id),
          ...(a.fly && ev
            ? { cameraTarget: { lat: ev.lat, lng: ev.lng, altitude: 1.2, durationMs: 1200 } }
            : {}),
        };
      }
      return {
        ...s,
        selection: a.selection,
        discovery: discoverCountry(s.discovery, polityDisplayName(a.selection.feature)),
      };
    }
    case "startTour": {
      const tour = getTours().find((t) => t.id === a.id);
      return tour ? applyStop(s, tour, 0) : s;
    }
    case "tourStep": {
      if (!s.tour) return s;
      const tour = getTours().find((t) => t.id === s.tour?.id);
      if (!tour) return { ...s, tour: null };
      const idx = s.tour.stop + a.delta;
      if (idx < 0) return s;
      if (idx >= tour.stops.length) {
        return { ...s, tour: null, discovery: completeTour(s.discovery, tour.id) };
      }
      return applyStop(s, tour, idx);
    }
    case "endTour":
      return { ...s, tour: null };
    case "flyTo":
      return { ...s, cameraTarget: a.target };
    case "countriesLoaded":
      return { ...s, countries: a.countries };
    case "snapshotIndexLoaded":
      return { ...s, snapshotYears: a.years };
    case "snapshotRequested":
      return { ...s, loadingSnapshot: true };
    case "snapshotLoaded":
      return { ...s, loadingSnapshot: false, snapshotYear: a.year, polygons: a.features };
    case "error":
      return { ...s, loadingSnapshot: false, error: a.message };
    case "toggleCategory":
      return {
        ...s,
        hiddenCategories: s.hiddenCategories.includes(a.category)
          ? s.hiddenCategories.filter((c) => c !== a.category)
          : [...s.hiddenCategories, a.category],
      };
    case "discoveryLoaded":
      return { ...s, discovery: a.discovery };
    case "prunePulses":
      return s.pulses.some((p) => p.until <= a.now)
        ? { ...s, pulses: s.pulses.filter((p) => p.until > a.now) }
        : s;
    default:
      return s;
  }
}

interface HistoryContextValue {
  state: HistoryState;
  dispatch: Dispatch<Action>;
  events: HistoryEvent[];
  tours: Tour[];
  eras: Era[];
}

const HistoryContext = createContext<HistoryContextValue | null>(null);

function loadDiscovery(): DiscoveryState | null {
  try {
    const raw = window.localStorage.getItem(DISCOVERY_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const p = parsed as Partial<DiscoveryState>;
    const arr = (v: unknown): string[] =>
      Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
    return { events: arr(p.events), countries: arr(p.countries), toursCompleted: arr(p.toursCompleted) };
  } catch {
    return null;
  }
}

export function HistoryProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const wantedSnapshot = useRef<number | null>(null);

  // Static data is parsed once through the Zod contracts.
  const events = useMemo(() => getEvents(), []);
  const tours = useMemo(() => getTours(), []);
  const eras = useMemo(() => getEras(), []);

  // Generated data (countries, snapshot index).
  useEffect(() => {
    fetchCountries()
      .then((countries) => dispatch({ type: "countriesLoaded", countries }))
      .catch((e: unknown) => dispatch({ type: "error", message: String(e) }));
    fetchSnapshotIndex()
      .then((years) => dispatch({ type: "snapshotIndexLoaded", years }))
      .catch((e: unknown) => dispatch({ type: "error", message: String(e) }));
  }, []);

  // Border snapshot for the current year (latest snapshot ≤ year), fetched lazily and cached.
  useEffect(() => {
    if (state.snapshotYears.length === 0) return;
    const target = pickSnapshotYear(state.year, state.snapshotYears);
    if (target === state.snapshotYear || wantedSnapshot.current === target) return;
    wantedSnapshot.current = target;
    dispatch({ type: "snapshotRequested" });
    fetchSnapshot(target)
      .then((features) => {
        if (wantedSnapshot.current === target) {
          dispatch({ type: "snapshotLoaded", year: target, features });
        }
      })
      .catch((e: unknown) => dispatch({ type: "error", message: String(e) }));
  }, [state.year, state.snapshotYears, state.snapshotYear]);

  // Play loop.
  useEffect(() => {
    if (!state.playing) return;
    const id = window.setInterval(
      () => dispatch({ type: "tick" }),
      1000 / (TICKS_PER_SECOND * state.speed),
    );
    return () => window.clearInterval(id);
  }, [state.playing, state.speed]);

  // Ring pulses fade out even while paused.
  useEffect(() => {
    if (state.pulses.length === 0) return;
    const id = window.setInterval(() => dispatch({ type: "prunePulses", now: Date.now() }), 500);
    return () => window.clearInterval(id);
  }, [state.pulses.length]);

  // Discovery progress persists per browser.
  useEffect(() => {
    const saved = loadDiscovery();
    if (saved) dispatch({ type: "discoveryLoaded", discovery: saved });
  }, []);
  useEffect(() => {
    try {
      window.localStorage.setItem(DISCOVERY_KEY, JSON.stringify(state.discovery));
    } catch {
      /* storage may be unavailable; progress is a convenience */
    }
  }, [state.discovery]);

  // Keyboard: space = play/pause, escape = close panel / leave tour, ← → = tour stops.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "BUTTON", "SELECT"].includes(target.tagName)) return;
      if (e.code === "Space") {
        e.preventDefault();
        dispatch({ type: "setPlaying", playing: !state.playing });
      } else if (e.key === "Escape") {
        dispatch(state.tour ? { type: "endTour" } : { type: "select", selection: null });
      } else if (e.key === "ArrowRight" && state.tour) {
        dispatch({ type: "tourStep", delta: 1 });
      } else if (e.key === "ArrowLeft" && state.tour) {
        dispatch({ type: "tourStep", delta: -1 });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.playing, state.tour]);

  const value = useMemo(
    () => ({ state, dispatch, events, tours, eras }),
    [state, events, tours, eras],
  );
  return <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>;
}

export function useHistory(): HistoryContextValue {
  const ctx = useContext(HistoryContext);
  if (!ctx) throw new Error("useHistory must be used inside <HistoryProvider>");
  return ctx;
}
