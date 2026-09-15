import type { BorderFeature } from "@/lib/data/schemas";

type Ring = number[][];

/**
 * three-globe triangulates polygon caps with d3-geo, whose spherical convention is the reverse of
 * RFC 7946: an exterior ring must be wound clockwise in the lng/lat plane, holes counter-clockwise.
 * A counter-clockwise exterior is read as "the whole sphere except this polygon", so every cap
 * covers the globe. The snapshots come out of mapshaper counter-clockwise; this rewinds them.
 */
function signedArea(ring: Ring): number {
  let area = 0;
  for (let i = 0, n = ring.length; i < n; i++) {
    const p = ring[i]!;
    const q = ring[(i + 1) % n]!;
    area += ((q[0] ?? 0) - (p[0] ?? 0)) * ((q[1] ?? 0) + (p[1] ?? 0));
  }
  return area; // > 0 = clockwise with lat pointing up
}

function wind(ring: Ring, clockwise: boolean): Ring {
  const isClockwise = signedArea(ring) > 0;
  return isClockwise === clockwise ? ring : [...ring].reverse();
}

function rewindPolygon(rings: Ring[]): Ring[] {
  return rings.map((ring, i) => wind(ring, i === 0));
}

export function rewindFeature(feature: BorderFeature): BorderFeature {
  const g = feature.geometry;
  if (g.type === "Polygon") {
    return { ...feature, geometry: { ...g, coordinates: rewindPolygon(g.coordinates as Ring[]) } };
  }
  return {
    ...feature,
    geometry: { ...g, coordinates: (g.coordinates as Ring[][]).map(rewindPolygon) },
  };
}
