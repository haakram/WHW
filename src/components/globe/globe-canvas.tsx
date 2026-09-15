"use client";

import { useCallback, useEffect, useRef } from "react";
import Globe, { type GlobeMethods } from "react-globe.gl";
import type { BorderFeature } from "@/lib/data/schemas";
import { polityDisplayName } from "@/lib/domain/palette";
import { useContainerSize } from "./use-container-size";
import type { GlobeArc, GlobeCanvasProps, GlobePin, GlobeRing } from "./globe-types";

const HOME = { lat: 30, lng: 15, altitude: 2.2 };

/** Tooltips are HTML strings inside react-globe.gl, so every data-derived text is escaped first. */
function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

export default function GlobeCanvas(props: GlobeCanvasProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const { ref, width, height } = useContainerSize<HTMLDivElement>();
  const { onPinClick, onPolygonClick, onBackgroundClick, polygonColor } = props;

  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    const controls = g.controls();
    controls.autoRotate = props.autoRotate;
    controls.autoRotateSpeed = 0.35;
  }, [props.autoRotate]);

  useEffect(() => {
    const g = globeRef.current;
    const t = props.cameraTarget;
    if (!g || !t) return;
    g.pointOfView({ lat: t.lat, lng: t.lng, altitude: t.altitude }, t.durationMs ?? 1200);
  }, [props.cameraTarget]);

  const onReady = useCallback(() => {
    const g = globeRef.current;
    if (!g) return;
    g.pointOfView(HOME, 0);
    const controls = g.controls();
    controls.autoRotate = props.autoRotate;
    controls.autoRotateSpeed = 0.35;
    controls.minDistance = 120;
    controls.maxDistance = 600;
    // Textures load a moment after the globe is ready; a second POV set avoids the default zoom.
    window.setTimeout(() => g.pointOfView(HOME, 800), 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={ref} className="globe-stage" data-testid="globe-stage">
      {width > 0 && height > 0 && (
        <Globe
          ref={globeRef}
          width={width}
          height={height}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl="/textures/earth-blue-marble.jpg"
          bumpImageUrl="/textures/earth-topology.png"
          showAtmosphere
          atmosphereColor="#d9c28e"
          atmosphereAltitude={0.16}
          animateIn={false}
          onGlobeReady={onReady}
          onGlobeClick={() => onBackgroundClick?.()}
          polygonsData={props.polygons}
          polygonCapColor={(d) => polygonColor(d as BorderFeature)}
          polygonSideColor={() => "rgba(40, 30, 15, 0.25)"}
          polygonStrokeColor={() => "#3b2f1e"}
          polygonAltitude={0.006}
          polygonCapCurvatureResolution={4}
          polygonsTransitionDuration={0}
          polygonLabel={(d) =>
            `<div class="globe-tip">${esc(polityDisplayName(d as BorderFeature))}</div>`
          }
          onPolygonClick={(d) => onPolygonClick?.(d as BorderFeature)}
          pointsData={props.pins}
          pointLat="lat"
          pointLng="lng"
          pointColor="color"
          pointRadius="radius"
          pointAltitude={0.012}
          pointsMerge={false}
          pointLabel={(d) => `<div class="globe-tip">${esc((d as GlobePin).label)}</div>`}
          onPointClick={(d) => onPinClick?.(d as GlobePin)}
          arcsData={props.arcs}
          arcStartLat="startLat"
          arcStartLng="startLng"
          arcEndLat="endLat"
          arcEndLng="endLng"
          arcColor="color"
          arcAltitudeAutoScale={0.4}
          arcStroke={0.55}
          arcDashLength={0.35}
          arcDashGap={0.18}
          arcDashAnimateTime={1600}
          arcLabel={(d) => `<div class="globe-tip">${esc((d as GlobeArc).label ?? "")}</div>`}
          ringsData={props.rings}
          ringLat="lat"
          ringLng="lng"
          ringMaxRadius="maxRadius"
          ringPropagationSpeed={2.6}
          ringRepeatPeriod={650}
          ringColor={(d: object) => {
            const c = (d as GlobeRing).color;
            return (t: number) => `${c}${Math.round((1 - t) * 255).toString(16).padStart(2, "0")}`;
          }}
        />
      )}
    </div>
  );
}
