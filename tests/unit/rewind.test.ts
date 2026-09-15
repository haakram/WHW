import { describe, expect, it } from "vitest";
import { rewindFeature } from "@/lib/domain/rewind";
import type { BorderFeature } from "@/lib/data/schemas";

const ccw = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]; // counter-clockwise (RFC 7946 exterior)
const cw = [...ccw].reverse();
const hole = [[2, 2], [2, 4], [4, 4], [4, 2], [2, 2]]; // clockwise hole

describe("rewindFeature", () => {
  it("winds exterior rings clockwise and holes counter-clockwise, as d3-geo expects", () => {
    const f: BorderFeature = {
      type: "Feature",
      properties: { NAME: "Test" },
      geometry: { type: "Polygon", coordinates: [ccw, hole] },
    };
    const out = rewindFeature(f).geometry.coordinates as number[][][];
    expect(out[0]).toEqual(cw);
    expect(out[1]).toEqual([...hole].reverse());
  });

  it("leaves correctly wound rings alone and handles MultiPolygon", () => {
    const f: BorderFeature = {
      type: "Feature",
      properties: { NAME: "Test" },
      geometry: { type: "MultiPolygon", coordinates: [[cw], [ccw]] },
    };
    const out = rewindFeature(f).geometry.coordinates as number[][][][];
    expect(out[0]?.[0]).toEqual(cw);
    expect(out[1]?.[0]).toEqual(cw);
  });
});
