"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import GlobeLoader from "@/components/globe/globe-loader";
import type { GlobeArc, GlobePin, GlobeRing } from "@/components/globe/globe-types";
import { HistoryProvider, useHistory } from "@/lib/store/history-store";
import type { BorderFeature, Category, HistoryEvent, WikiSummaryResponse } from "@/lib/data/schemas";
import { formatYear, sliderToYear, yearToSlider } from "@/lib/domain/time-scale";
import { eraForYear } from "@/lib/domain/eras";
import { visibleEvents } from "@/lib/domain/visible-events";
import { battleArcs } from "@/lib/domain/battles";
import { computeBadges } from "@/lib/domain/discovery";
import {
  CATEGORY_COLORS,
  COUNTRY_PIN_COLOR,
  RING_COLOR,
  polityColor,
  polityDisplayName,
  polityKey,
} from "@/lib/domain/palette";

const CATEGORIES = Object.keys(CATEGORY_COLORS) as Category[];

export default function WorldHistoryApp() {
  return (
    <HistoryProvider>
      <Shell />
    </HistoryProvider>
  );
}

function Shell() {
  const { state, dispatch, events, eras, tours } = useHistory();
  const era = eraForYear(state.year, eras);
  const selectedId = state.selection?.kind === "event" ? state.selection.id : null;
  const selectedFeature = state.selection?.kind === "country" ? state.selection.feature : null;

  const visible = useMemo(
    () => visibleEvents(events, state.year).filter((e) => !state.hiddenCategories.includes(e.category)),
    [events, state.year, state.hiddenCategories],
  );
  const pins = useMemo<GlobePin[]>(() => {
    const evPins = visible.map<GlobePin>((e) => ({
      id: e.id, kind: "event", lat: e.lat, lng: e.lng,
      color: e.id === selectedId ? "#d4a73a" : CATEGORY_COLORS[e.category],
      radius: (e.id === selectedId ? 0.55 : 0.28) + e.importance * 0.1,
      label: `${e.title} · ${formatYear(e.year)}`, importance: e.importance,
    }));
    const cPins = state.countries
      .filter((c) => c.inceptionYear === null || c.inceptionYear <= state.year)
      .map<GlobePin>((c) => ({
        id: `country:${c.iso2}`, kind: "country", lat: c.lat, lng: c.lng, color: COUNTRY_PIN_COLOR,
        radius: 0.16, label: `${c.name}${c.inceptionYear ? ` · since ${formatYear(c.inceptionYear)}` : ""}`, importance: 1,
      }));
    return [...cPins, ...evPins];
  }, [visible, state.countries, state.year, selectedId]);
  const arcs = useMemo<GlobeArc[]>(() => battleArcs(visible, state.year), [visible, state.year]);
  const rings = useMemo<GlobeRing[]>(
    () => state.pulses.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng, color: RING_COLOR, maxRadius: 2 + p.importance })),
    [state.pulses],
  );
  const polygonColor = (f: BorderFeature) => (f === selectedFeature ? "#d4a73a" : polityColor(polityKey(f)));

  return (
    <div className="stage">
      <div className="globe-layer">
        <GlobeLoader
          polygons={state.polygons}
          polygonColor={polygonColor}
          pins={pins}
          arcs={arcs}
          rings={rings}
          cameraTarget={state.cameraTarget}
          autoRotate={!state.playing && !state.selection && !state.tour}
          onPinClick={(pin) => {
            if (pin.kind === "event") dispatch({ type: "select", selection: { kind: "event", id: pin.id } });
            else {
              const c = state.countries.find((x) => `country:${x.iso2}` === pin.id);
              const f = state.polygons.find((p) => c && (p.properties.NAME ?? "").toLowerCase() === c.name.toLowerCase());
              if (f) dispatch({ type: "select", selection: { kind: "country", feature: f } });
              else if (c) dispatch({ type: "select", selection: { kind: "country", feature: { type: "Feature", properties: { NAME: c.name }, geometry: { type: "Polygon", coordinates: [] } } } });
            }
          }}
          onPolygonClick={(f) => dispatch({ type: "select", selection: { kind: "country", feature: f } })}
          onBackgroundClick={() => dispatch({ type: "select", selection: null })}
        />
      </div>
      <header className="masthead">
        <h1>World History Web</h1>
        <p>An atlas of everything that happened, 3000 BC to today · {events.length} curated events · {state.countries.length} countries</p>
      </header>
      <div className="year-badge">
        <div className="year">{formatYear(state.year)}</div>
        <div className="era">{era?.name ?? ""}{state.snapshotYear !== null ? ` · borders of ${formatYear(state.snapshotYear)}` : ""}</div>
      </div>
      <Badges />
      <Legend count={visible.length} />
      {state.selection?.kind === "event" && <EventPanel id={state.selection.id} />}
      {state.selection?.kind === "country" && <CountryPanel feature={state.selection.feature} />}
      {state.tour && <TourPlayer />}
      <div className="timeline">
        <div className="controls">
          <button className={`btn ${state.playing ? "active" : ""}`} onClick={() => dispatch({ type: "setPlaying", playing: !state.playing })}>
            {state.playing ? "❚❚ Pause" : "▶ Play"}
          </button>
          <button className="btn secondary" onClick={() => dispatch({ type: "setSpeed", speed: state.speed === 1 ? 2 : state.speed === 2 ? 4 : 1 })}>
            {state.speed}×
          </button>
          <button className={`btn secondary ${state.follow ? "active" : ""}`} onClick={() => dispatch({ type: "toggleFollow" })} title="Fly to the biggest event of each year while playing">
            Follow
          </button>
          <select className="btn secondary" value="" onChange={(e) => {
              if (e.target.value) dispatch({ type: "startTour", id: e.target.value });
            }}>
            <option value="">Story tours…</option>
            {tours.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </div>
        <div className="track">
          <div className="eras">
            {eras.map((e) => {
              const l = yearToSlider(e.from) * 100, r = yearToSlider(e.to) * 100;
              return (
                <span key={e.id} style={{ left: `${l}%`, width: `${r - l}%`, background: `var(--${e.tone})` }} title={e.name}>
                  {r - l > 11 && <label style={{ left: "50%" }}>{e.name}</label>}
                </span>
              );
            })}
          </div>
          <input type="range" min={0} max={1000} step={1} value={Math.round(yearToSlider(state.year) * 1000)}
            onChange={(e) => dispatch({ type: "setYear", year: sliderToYear(Number(e.target.value) / 1000) })} aria-label="Year" />
        </div>
        <div className="readout">{formatYear(state.year)}</div>
      </div>
    </div>
  );
}

function Legend({ count }: { count: number }) {
  const { state, dispatch } = useHistory();
  return (
    <div className="legend">
      <div style={{ marginBottom: 4 }}><b>{count}</b> events in view · click to filter</div>
      {CATEGORIES.map((c) => (
        <button key={c} className={state.hiddenCategories.includes(c) ? "off" : ""} onClick={() => dispatch({ type: "toggleCategory", category: c })}>
          <i style={{ background: CATEGORY_COLORS[c] }} /> {c}
        </button>
      ))}
      <div style={{ marginTop: 6, color: "#5a5142" }}>● country pins · borders approximate</div>
    </div>
  );
}

function Badges() {
  const { state, events } = useHistory();
  const badges = computeBadges(state.discovery, events);
  return (
    <div className="badges">
      <div><b>Discovery</b> · {state.discovery.events.length} events · {state.discovery.countries.length} countries</div>
      {badges.map((b) => <div key={b.id} className={`b ${b.unlocked ? "on" : ""}`} title={b.description}>{b.unlocked ? "★" : "☆"} {b.name}</div>)}
    </div>
  );
}

function useWiki(title: string | null) {
  const [result, setResult] = useState<{ title: string; data: WikiSummaryResponse } | null>(null);
  useEffect(() => {
    if (!title) return;
    let alive = true;
    fetch(`/api/wiki/summary?title=${encodeURIComponent(title)}`)
      .then((r) => r.json() as Promise<WikiSummaryResponse>)
      .then((data) => {
        if (alive) setResult({ title, data });
      })
      .catch(() => {
        if (alive) setResult({ title, data: { ok: false, reason: "network" } });
      });
    return () => {
      alive = false;
    };
  }, [title]);
  return result && result.title === title ? result.data : null;
}

function WikiBlock({ title, fallback }: { title: string; fallback?: string }) {
  const data = useWiki(title);
  const fb = useWiki(data && !data.ok && fallback ? fallback : null);
  const d = data?.ok ? data : fb?.ok ? fb : null;
  if (!data) return <p className="credit">Fetching from Wikipedia…</p>;
  if (!d) return <p className="credit">No live Wikipedia summary available ({data.ok ? "" : data.reason}).</p>;
  return (
    <div>
      {d.thumbnailUrl && (
        <div className="frame" style={{ height: 220 }}>
          <Image src={d.thumbnailUrl} alt={d.title} fill unoptimized style={{ objectFit: "cover" }} sizes="400px" />
        </div>
      )}
      <p>{d.extract}</p>
      <p className="credit">From Wikipedia, <a href={d.pageUrl} target="_blank" rel="noreferrer">“{d.title}”</a> · text CC BY-SA 4.0</p>
    </div>
  );
}

function EventPanel({ id }: { id: string }) {
  const { events, dispatch } = useHistory();
  const e = events.find((x) => x.id === id);
  if (!e) return null;
  return (
    <aside className="panel">
      <button className="close" onClick={() => dispatch({ type: "select", selection: null })} aria-label="Close">×</button>
      <span className="chip" style={{ background: CATEGORY_COLORS[e.category] }}>{e.category}</span>
      <div className="meta" style={{ marginTop: 8 }}>{formatYear(e.year)}{e.endYear ? ` – ${formatYear(e.endYear)}` : ""} · importance {e.importance}/5</div>
      <h2>{e.title}</h2>
      <p>{e.summary}</p>
      {e.videoUrl && (
        <div className="frame">
          <video controls preload="metadata" src={e.videoUrl} />
          <div className="credit" style={{ padding: "4px 6px" }}>{e.videoCredit ?? "Wikimedia Commons"}</div>
        </div>
      )}
      <WikiBlock title={e.wikipediaTitle} />
      {e.belligerents && (
        <p className="credit">Sides: {e.belligerents.filter((b) => b.side === "a").map((b) => b.name).join(", ")} vs {e.belligerents.filter((b) => b.side === "b").map((b) => b.name).join(", ")}</p>
      )}
      <p className="credit">Sources: {e.sources.map((s, i) => <a key={s} href={s} target="_blank" rel="noreferrer">[{i + 1}] </a>)}</p>
    </aside>
  );
}

function CountryPanel({ feature }: { feature: BorderFeature }) {
  const { state, events, dispatch } = useHistory();
  const name = (feature.properties.NAME ?? "").trim();
  const country = state.countries.find((c) => c.name.toLowerCase() === name.toLowerCase());
  const list: HistoryEvent[] = events.filter((e) => country && e.countryIso === country.iso2).sort((a, b) => a.year - b.year);
  const title = country ? `History of ${country.name}` : name;
  return (
    <aside className="panel">
      <button className="close" onClick={() => dispatch({ type: "select", selection: null })} aria-label="Close">×</button>
      <div className="meta">In {formatYear(state.year)}</div>
      <h2>{polityDisplayName(feature)}</h2>
      {country && (
        <p className="credit">
          {country.flagUrl && <Image src={country.flagUrl} alt="" width={28} height={18} unoptimized style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />}
          Today: <b>{country.name}</b>{country.capital ? ` · capital ${country.capital}` : ""}{country.inceptionYear ? ` · founded ${formatYear(country.inceptionYear)}` : ""}{country.population ? ` · ${country.population.toLocaleString("en")} people` : ""}
        </p>
      )}
      <WikiBlock title={title} fallback={country?.name ?? name} />
      {list.length > 0 && (
        <div className="list">
          <div className="meta" style={{ margin: "8px 0 4px" }}>Events here</div>
          {list.map((e) => (
            <button key={e.id} onClick={() => { dispatch({ type: "setYear", year: e.year }); dispatch({ type: "select", selection: { kind: "event", id: e.id }, fly: true }); }}>
              <span className="meta">{formatYear(e.year)}</span> · {e.title}
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}

function TourPlayer() {
  const { state, tours, events, dispatch } = useHistory();
  const tour = tours.find((t) => t.id === state.tour?.id);
  const stop = tour?.stops[state.tour?.stop ?? 0];
  const ev = stop && events.find((e) => e.id === stop.eventId);
  if (!tour || !stop) return null;
  return (
    <div className="tour">
      <div className="meta" style={{ color: "#b8892b" }}>{tour.title} · stop {(state.tour?.stop ?? 0) + 1} of {tour.stops.length}</div>
      <h3>{ev ? `${formatYear(ev.year)} — ${ev.title}` : stop.eventId}</h3>
      <p>{stop.narration}</p>
      <div className="controls">
        <button className="btn" onClick={() => dispatch({ type: "tourStep", delta: -1 })}>← Back</button>
        <button className="btn" onClick={() => dispatch({ type: "tourStep", delta: 1 })}>Next →</button>
        <button className="btn" onClick={() => dispatch({ type: "endTour" })}>Exit</button>
      </div>
    </div>
  );
}
