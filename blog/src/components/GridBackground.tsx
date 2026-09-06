import React from "react";

// Zoomed in ~1.3x from the source SVG's native 64.44px cell — cells now
// read as visibly larger/more spacious without breaking the underlying
// 8-tile cross rhythm (all values scaled by the same factor, so proportions
// stay identical to the original asset)
const FINE = 83.77;            // one grid cell
const CROSS_TILE = FINE * 8;   // 670.16 — one cross repeat unit
const CROSS_OFFSET = FINE * 4; // 335.08 — diagonal offset between interleaved cross layers
const ARM = 16.9;              // half-length of each cross arm, scaled with FINE

const fineTile = (stroke: string) =>
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${FINE}" height="${FINE}" viewBox="0 0 ${FINE} ${FINE}" shape-rendering="geometricPrecision">` +
    `<path d="M0 0H${FINE}M0 0V${FINE}" stroke="${stroke}" stroke-width="0.85" vector-effect="non-scaling-stroke"/>` +
    `</svg>`
  );

const crossTile = (stroke: string) => {
  const c = CROSS_TILE / 2;
  return encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CROSS_TILE}" height="${CROSS_TILE}" viewBox="0 0 ${CROSS_TILE} ${CROSS_TILE}" shape-rendering="geometricPrecision">` +
    `<path d="M${c} ${c - ARM}V${c + ARM}M${c - ARM} ${c}H${c + ARM}" stroke="${stroke}" stroke-width="1.1" stroke-linecap="round" vector-effect="non-scaling-stroke"/>` +
    `</svg>`
  );
};

// Fine grid kept at the same subtle weight; cross opacity pulled down
// further so it reads as a soft glint rather than a printed mark
const fineLightSvg = fineTile("rgba(76,76,76,0.13)");
const crossLightSvg = crossTile("rgba(76,76,76,0.11)");

const fineDarkSvg = fineTile("rgba(255,255,255,0.14)");
const crossDarkSvg = crossTile("rgba(255,255,255,0.13)");

const VIGNETTE_MASK =
  "linear-gradient(to bottom, black 0%, black 65%, transparent 100%)";

const layerStyle = (fineSvg: string, crossSvg: string): React.CSSProperties => ({
  backgroundImage: [
    `url("data:image/svg+xml,${fineSvg}")`,
    `url("data:image/svg+xml,${crossSvg}")`,
    `url("data:image/svg+xml,${crossSvg}")`,
  ].join(", "),
  backgroundSize: `${FINE}px ${FINE}px, ${CROSS_TILE}px ${CROSS_TILE}px, ${CROSS_TILE}px ${CROSS_TILE}px`,
  backgroundPosition: `0 0, 0 0, ${CROSS_OFFSET}px ${CROSS_OFFSET}px`,
  backgroundRepeat: "repeat, repeat, repeat",
  maskImage: VIGNETTE_MASK,
  WebkitMaskImage: VIGNETTE_MASK,
});

const GridBackground = () => {
  return (
    <div
      aria-hidden
      className="absolute top-0 left-0 -z-10 w-full bg-white dark:bg-brand-dark"
      style={{ aspectRatio: "1440 / 1271" }}
    >
      <div
        className="absolute inset-0 block dark:hidden"
        style={layerStyle(fineLightSvg, crossLightSvg)}
      />
      <div
        className="absolute inset-0 hidden dark:block"
        style={layerStyle(fineDarkSvg, crossDarkSvg)}
      />
    </div>
  );
};

export default GridBackground;