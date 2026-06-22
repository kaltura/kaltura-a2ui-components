import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Mercator } from '@visx/geo';
import { scaleLinear } from '@visx/scale';
import * as topojson from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import { CHART_COLORS, useThemeColors } from './theme';
import { formatNumber } from './utils';
import { resolveCountryValue, normalizeCountryCode } from './countryCodes';

const WORLD_TOPO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

interface GeoMapProps {
  data: Record<string, unknown>[];
  xKey: string;
  yKeys: string[];
  colors?: string[];
  height: number;
  title?: string;
}

interface CountryFeature {
  type: 'Feature';
  geometry: GeoJSON.Geometry;
  properties: { name: string };
  id: string;
}

interface TooltipState {
  name: string;
  value: number;
  x: number;
  y: number;
}

function GeoMapInner({ data, xKey, yKeys, colors, height, width }: GeoMapProps & { width: number }) {
  const [world, setWorld] = useState<CountryFeature[] | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const themeColors = useThemeColors();
  const valueKey = yKeys[0] || 'value';
  const primaryColor = colors?.[0] || CHART_COLORS[0];

  useEffect(() => {
    fetch(WORLD_TOPO_URL)
      .then(r => r.json())
      .then((topo: Topology) => {
        const geo = topojson.feature(
          topo,
          topo.objects.countries as GeometryCollection
        ) as unknown as GeoJSON.FeatureCollection;
        setWorld(geo.features as unknown as CountryFeature[]);
      })
      .catch(() => setWorld([]));
  }, []);

  const dataMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of data) {
      const raw = String(row[xKey] || '').toLowerCase();
      const country = normalizeCountryCode(raw);
      const value = Number(row[valueKey]) || 0;
      const existing = map.get(country) || 0;
      map.set(country, existing + value);
    }
    return map;
  }, [data, xKey, valueKey]);

  const maxValue = useMemo(() => {
    let max = 1;
    for (const v of dataMap.values()) { if (v > max) max = v; }
    return max;
  }, [dataMap]);

  const colorScale = useMemo(() =>
    scaleLinear<string>({ domain: [0, maxValue], range: [primaryColor + '18', primaryColor] }),
    [maxValue, primaryColor],
  );

  const handleMouseMove = useCallback((e: React.MouseEvent, name: string, value: number) => {
    if (value > 0) {
      const rect = (e.currentTarget as SVGElement).closest('.geo-map-wrapper')?.getBoundingClientRect();
      setTooltip({
        name,
        value,
        x: e.clientX - (rect?.left || 0),
        y: e.clientY - (rect?.top || 0) - 12,
      });
    }
  }, []);

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  const legendWidth = Math.min(width * 0.4, 200);
  const legendHeight = 10;
  const mapHeight = height - 44;

  if (!world) {
    return (
      <div className="chart-loading" role="status" aria-label="Loading map">
        <div className="chart-loading-spinner" />
        <span>Loading map...</span>
      </div>
    );
  }

  return (
    <div className="geo-map-wrapper" style={{ position: 'relative', width }}>
      <svg
        width={width}
        height={mapHeight}
        role="img"
        aria-label="Geographic distribution map"
      >
        <Mercator
          data={world}
          scale={width / 6.2}
          translate={[width / 2, mapHeight / 1.4]}
        >
          {mercator => (
            <g>
              {mercator.features.map(({ feature, path }) => {
                const name = (feature as CountryFeature).properties?.name || '';
                const value = resolveCountryValue(dataMap, name);
                const fill = value > 0 ? colorScale(value) : themeColors.emptyFill;

                return (
                  <path
                    key={`map-${(feature as CountryFeature).id || name}`}
                    d={path || ''}
                    fill={fill}
                    stroke={themeColors.stroke}
                    strokeWidth={0.5}
                    style={{ cursor: value > 0 ? 'pointer' : 'default', transition: 'fill 200ms ease' }}
                    onMouseMove={(e) => handleMouseMove(e, name, value)}
                    onMouseLeave={handleMouseLeave}
                    tabIndex={value > 0 ? 0 : undefined}
                    aria-label={value > 0 ? `${name}: ${formatNumber(value)}` : undefined}
                    onFocus={() => value > 0 && setTooltip({ name, value, x: width / 2, y: mapHeight / 2 })}
                    onBlur={handleMouseLeave}
                  />
                );
              })}
            </g>
          )}
        </Mercator>
      </svg>

      {/* Color legend */}
      <div className="geo-map-legend" aria-label="Value scale">
        <span className="geo-map-legend-label">0</span>
        <svg width={legendWidth} height={legendHeight} aria-hidden="true">
          <defs>
            <linearGradient id="geo-legend-grad">
              <stop offset="0%" stopColor={primaryColor + '18'} />
              <stop offset="100%" stopColor={primaryColor} />
            </linearGradient>
          </defs>
          <rect
            width={legendWidth}
            height={legendHeight}
            rx={legendHeight / 2}
            fill="url(#geo-legend-grad)"
          />
        </svg>
        <span className="geo-map-legend-label">{formatNumber(maxValue)}</span>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="chart-tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
          role="tooltip"
        >
          <strong>{tooltip.name}</strong>
          <span className="chart-tooltip-value">{formatNumber(tooltip.value)}</span>
        </div>
      )}
    </div>
  );
}

export function GeoMap(props: GeoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(500);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) setWidth(Math.max(entry.contentRect.width, 280));
    });
    observer.observe(containerRef.current);
    setWidth(Math.max(containerRef.current.offsetWidth, 280));
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <GeoMapInner {...props} width={width} />
    </div>
  );
}
