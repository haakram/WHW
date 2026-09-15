import eventsJson from "@/data/events.json";
import toursJson from "@/data/tours.json";
import erasJson from "@/data/eras.json";
import {
  BorderSnapshotSchema,
  CountriesSchema,
  ErasSchema,
  HistoryEventsSchema,
  SnapshotIndexSchema,
  ToursSchema,
  type BorderFeature,
  type Country,
  type Era,
  type HistoryEvent,
  type Tour,
} from "@/lib/data/schemas";
import { COUNTRIES_URL, SNAPSHOT_INDEX_URL, snapshotUrl } from "@/lib/data/paths";
import { rewindFeature } from "@/lib/domain/rewind";

/** Curated JSON is parsed once through the contracts (AI_RULES R8): bad data fails at startup, loudly. */
let events: HistoryEvent[] | undefined;
let tours: Tour[] | undefined;
let eras: Era[] | undefined;

export function getEvents(): HistoryEvent[] {
  return (events ??= HistoryEventsSchema.parse(eventsJson));
}
export function getTours(): Tour[] {
  return (tours ??= ToursSchema.parse(toursJson));
}
export function getEras(): Era[] {
  return (eras ??= ErasSchema.parse(erasJson));
}

let countriesPromise: Promise<Country[]> | undefined;
export function fetchCountries(): Promise<Country[]> {
  return (countriesPromise ??= fetch(COUNTRIES_URL)
    .then((r) => {
      if (!r.ok) throw new Error(`countries ${r.status}`);
      return r.json();
    })
    .then((j) => CountriesSchema.parse(j)));
}

let indexPromise: Promise<number[]> | undefined;
export function fetchSnapshotIndex(): Promise<number[]> {
  return (indexPromise ??= fetch(SNAPSHOT_INDEX_URL)
    .then((r) => {
      if (!r.ok) throw new Error(`snapshot index ${r.status}`);
      return r.json();
    })
    .then((j) => SnapshotIndexSchema.parse(j).years));
}

const snapshotCache = new Map<number, Promise<BorderFeature[]>>();
/** Generated GeoJSON is data, never code: parsed through the schema, features only. */
export function fetchSnapshot(year: number): Promise<BorderFeature[]> {
  let p = snapshotCache.get(year);
  if (!p) {
    p = fetch(snapshotUrl(year))
      .then((r) => {
        if (!r.ok) throw new Error(`snapshot ${year}: ${r.status}`);
        return r.json();
      })
      .then((j) => BorderSnapshotSchema.parse(j).features.map(rewindFeature));
    snapshotCache.set(year, p);
  }
  return p;
}
