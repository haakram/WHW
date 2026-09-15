"use client";

import { useEffect, useRef, useState } from "react";

/** react-globe.gl sizes itself to the window unless told otherwise; this measures the real container. */
export function useContainerSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setSize((prev) =>
        prev.width === Math.round(r.width) && prev.height === Math.round(r.height)
          ? prev
          : { width: Math.round(r.width), height: Math.round(r.height) },
      );
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, ...size };
}
