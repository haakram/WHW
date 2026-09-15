import { describe, expect, it } from "vitest";
import { formatYear, nextYear, playStep, sliderToYear, yearToSlider } from "@/lib/domain/time-scale";
import { MAX_YEAR, MIN_YEAR } from "@/lib/data/schemas";

describe("time scale", () => {
  it("maps the slider ends to the year range", () => {
    expect(sliderToYear(0)).toBe(MIN_YEAR);
    expect(sliderToYear(1)).toBe(MAX_YEAR);
    expect(sliderToYear(-1)).toBe(MIN_YEAR);
    expect(sliderToYear(2)).toBe(MAX_YEAR);
  });

  it("is monotonic and never yields year 0", () => {
    let prev = MIN_YEAR;
    for (let t = 0; t <= 1; t += 0.001) {
      const y = sliderToYear(t);
      expect(y).toBeGreaterThanOrEqual(prev);
      expect(y).not.toBe(0);
      prev = y;
    }
  });

  it("round-trips a year within one play step", () => {
    for (const y of [-3000, -2500, -500, -44, 1, 476, 1000, 1453, 1500, 1789, 1900, 1950, 2026]) {
      const back = sliderToYear(yearToSlider(y));
      expect(Math.abs(back - y)).toBeLessThanOrEqual(playStep(y));
    }
  });

  it("steps coarsely in antiquity and by single years after 1500", () => {
    expect(playStep(-2000)).toBe(50);
    expect(playStep(-100)).toBe(25);
    expect(playStep(500)).toBe(20);
    expect(playStep(1200)).toBe(10);
    expect(playStep(1800)).toBe(1);
    expect(nextYear(-1)).toBe(1);
    expect(nextYear(-25)).toBe(1);
    expect(nextYear(MAX_YEAR)).toBe(MAX_YEAR);
    expect(nextYear(1, -1)).toBe(-1);
  });

  it("formats BC and AD years", () => {
    expect(formatYear(-500)).toBe("500 BC");
    expect(formatYear(476)).toBe("AD 476");
    expect(formatYear(1950)).toBe("1950");
  });
});
