import type { BorderFeature, Category } from "@/lib/data/schemas";

/**
 * Colours that must live in JavaScript because WebGL cannot read CSS variables — the one sanctioned
 * exception to "no hex outside globals.css". The parchment tones are muted so ink strokes and pins
 * stay legible; a polity keeps its tone across snapshots because the hash is on its name.
 */
const POLITY_TONES = [
  "#d8c49b", "#c9ab7c", "#b9a58d", "#cfb48c", "#ab9479", "#d7c8a8",
  "#c5ae80", "#b49d78", "#a48e70", "#dccfaf", "#c8b38b", "#ae9b81",
  "#d2bb95", "#bfa682", "#b09776", "#cdbf9f",
] as const;

export const CATEGORY_COLORS: Record<Category, string> = {
  war: "#8f1d2c",
  politics: "#37457a",
  science: "#2c6b5b",
  culture: "#a4632a",
  exploration: "#1f7573",
  disaster: "#6d2a5d",
  economy: "#7d6a19",
  religion: "#5a3a8c",
};

export const COUNTRY_PIN_COLOR = "#3b2f1e";
export const ARC_COLORS: [string, string] = ["#8f1d2c", "#d4a73a"];
export const RING_COLOR = "#8f1d2c";

/** The name a snapshot polygon is keyed on: the ruling polity if any, else its own name. */
export function polityKey(feature: BorderFeature): string {
  const p = feature.properties;
  return (p.SUBJECTO || p.NAME || "unknown").trim();
}

/** What the polygon was called then, with its overlord in brackets when it had one. */
export function polityDisplayName(feature: BorderFeature): string {
  const name = (feature.properties.NAME || "Unnamed territory").trim();
  const subj = (feature.properties.SUBJECTO || "").trim();
  return subj && subj !== name ? `${name} (${subj})` : name;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function polityColor(name: string): string {
  return POLITY_TONES[hash(name) % POLITY_TONES.length]!;
}
