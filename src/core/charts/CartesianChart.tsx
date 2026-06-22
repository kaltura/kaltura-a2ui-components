import { useRef, useState, useEffect, useMemo } from 'react';
import {
  XYChart,
  LineSeries,
  BarSeries,
  AreaSeries,
  GlyphSeries,
  Axis,
  Grid,
  Tooltip,
  AnnotationLineSubject,
  AnnotationLabel,
  Annotation,
} from '@visx/xychart';
import { curveMonotoneX } from '@visx/curve';
import { useChartTheme, CHART_COLORS } from './theme';
import { formatNumber } from './utils';

export interface ChartAnnotation {
  x: string;
  label: string;
  color?: string;
}

export interface CartesianChartProps {
  chartType: 'line' | 'bar' | 'area' | 'scatter';
  data: Record<string, unknown>[];
  xKey: string;
  yKeys: string[];
  yLabels?: string[];
  xLabel?: string;
  yLabel?: string;
  colors?: string[];
  height: number;
  annotations?: ChartAnnotation[];
}

export function CartesianChart({
  chartType, data, xKey, yKeys, yLabels, xLabel, yLabel, colors, height, annotations,
}: CartesianChartProps) {
  const theme = useChartTheme();
  const palette = colors || CHART_COLORS;
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(el);
    setWidth(el.clientWidth);
    return () => observer.disconnect();
  }, []);

  const xAccessor = useMemo(
    () => (d: Record<string, unknown>) => d[xKey] as string | number,
    [xKey],
  );
  const yAccessor = useMemo(
    () => (key: string) => (d: Record<string, unknown>) => Number(d[key]) || 0,
    [],
  );

  const autoAnnotations = useMemo(() => {
    if (annotations?.length) return annotations;
    if (chartType !== 'area' && chartType !== 'line') return undefined;
    if (!yKeys.includes('viewers') || data.length < 10) return undefined;

    const results: ChartAnnotation[] = [];
    let biggestDrop = { idx: -1, pct: 0 };
    for (let i = 1; i < data.length; i++) {
      const prev = Number(data[i - 1].viewers) || 0;
      const curr = Number(data[i].viewers) || 0;
      if (prev > 0) {
        const drop = ((prev - curr) / prev) * 100;
        if (drop > biggestDrop.pct) {
          biggestDrop = { idx: i, pct: drop };
        }
      }
    }
    if (biggestDrop.idx > 0 && biggestDrop.pct > 10) {
      results.push({
        x: String(data[biggestDrop.idx][xKey]),
        label: `▼ ${Math.round(biggestDrop.pct)}% drop`,
        color: '#FF6B6B',
      });
    }

    for (let i = 2; i < data.length && results.length < 4; i++) {
      const prev = Number(data[i - 1].viewers) || 0;
      const curr = Number(data[i].viewers) || 0;
      if (prev > 0 && curr > prev) {
        const rise = ((curr - prev) / prev) * 100;
        if (rise > 5) {
          results.push({
            x: String(data[i][xKey]),
            label: '↑ rewatch',
            color: '#00C9A7',
          });
        }
      }
    }
    return results.length ? results : undefined;
  }, [annotations, chartType, data, xKey, yKeys]);

  if (!data.length || !yKeys.length) return null;

  const maxLabelLen = Math.max(0, ...data.map(d => String(d[xKey] ?? '').length));
  const hasLongLabels = maxLabelLen > 12;
  const rotateLabels = chartType === 'bar' || data.length > 8 || hasLongLabels;
  // Reserve more vertical room when rotated labels are long so they aren't
  // clipped. ~5px per char at the -45° projection, capped so the plot stays
  // usable. (Was a flat 72 that clipped long entry names.)
  const rotatedRoom = Math.min(132, 56 + Math.min(maxLabelLen, 22) * 4);
  const bottomMargin = rotateLabels ? rotatedRoom : (xLabel ? 48 : 36);
  const margin = { top: 16, right: 16, bottom: bottomMargin, left: yLabel ? 56 : 48 };

  return (
    <div ref={containerRef} style={{ width: '100%', height }}>
      {width > 0 && (
        <XYChart
          width={width}
          height={height}
          theme={theme}
          margin={margin}
          xScale={{ type: 'band', paddingInner: 0.3 }}
          yScale={{ type: 'linear', nice: true }}
        >
          <Grid columns={false} numTicks={5} lineStyle={{ opacity: 0.4 }} />
          <Axis
            orientation="bottom"
            label={xLabel}
            numTicks={Math.min(data.length, 12)}
            tickFormat={v => {
              const s = String(v);
              // Wider budget so names like "Welcome to your Kaltura account"
              // stay legible; only truncate genuinely long labels.
              return s.length > 24 ? s.slice(0, 23) + '…' : s;
            }}
            tickLabelProps={{
              angle: rotateLabels ? -45 : 0,
              textAnchor: rotateLabels ? 'end' : 'middle',
              fontSize: 12,
              dy: rotateLabels ? 2 : 0,
            }}
          />
          <Axis
            orientation="left"
            label={yLabel}
            numTicks={5}
            tickFormat={v => formatNumber(Number(v))}
          />

          {yKeys.map((key, i) => {
            const label = yLabels?.[i] || key;
            const color = palette[i % palette.length];

            switch (chartType) {
              case 'line':
                return (
                  <LineSeries
                    key={key}
                    dataKey={label}
                    data={data}
                    xAccessor={xAccessor}
                    yAccessor={yAccessor(key)}
                    stroke={color}
                    curve={curveMonotoneX}
                  />
                );
              case 'area':
                return (
                  <AreaSeries
                    key={key}
                    dataKey={label}
                    data={data}
                    xAccessor={xAccessor}
                    yAccessor={yAccessor(key)}
                    fill={color}
                    fillOpacity={0.12}
                    lineProps={{ stroke: color }}
                    curve={curveMonotoneX}
                  />
                );
              case 'bar':
                return (
                  <BarSeries
                    key={key}
                    dataKey={label}
                    data={data}
                    xAccessor={xAccessor}
                    yAccessor={yAccessor(key)}
                    colorAccessor={() => color}
                  />
                );
              case 'scatter':
                return (
                  <GlyphSeries
                    key={key}
                    dataKey={label}
                    data={data}
                    xAccessor={xAccessor}
                    yAccessor={yAccessor(key)}
                    colorAccessor={() => color}
                  />
                );
            }
          })}

          {autoAnnotations?.map((ann, i) => {
            const datum = data.find(d => String(d[xKey]) === ann.x);
            if (!datum) return null;
            return (
              <Annotation
                key={`ann-${i}`}
                dataKey={yLabels?.[0] || yKeys[0]}
                datum={datum}
                dx={0}
                dy={-20}
              >
                <AnnotationLineSubject
                  orientation="vertical"
                  stroke={ann.color || '#FF6B6B'}
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                />
                <AnnotationLabel
                  title={ann.label}
                  showAnchorLine={false}
                  backgroundFill="var(--agent-bubble, #1c2128)"
                  backgroundPadding={{ top: 2, bottom: 2, left: 6, right: 6 }}
                  titleFontSize={10}
                  titleFontWeight={600}
                  titleProps={{ fill: ann.color || '#FF6B6B' }}
                />
              </Annotation>
            );
          })}

          <Tooltip
            snapTooltipToDatumX
            snapTooltipToDatumY
            showVerticalCrosshair
            verticalCrosshairStyle={{ stroke: 'var(--page-text-muted)', strokeDasharray: '4 2', opacity: 0.5 }}
            renderTooltip={({ tooltipData }) => {
              if (!tooltipData?.nearestDatum) return null;
              const datum = tooltipData.nearestDatum.datum as Record<string, unknown>;
              return (
                <div className="chart-tooltip-content">
                  <strong className="chart-tooltip-header">{String(datum[xKey])}</strong>
                  {yKeys.map((key, i) => (
                    <div key={key} className="chart-tooltip-row">
                      <span className="chart-tooltip-dot" style={{ backgroundColor: palette[i % palette.length] }} />
                      <span className="chart-tooltip-label">{yLabels?.[i] || key}</span>
                      <span className="chart-tooltip-value">{formatNumber(Number(datum[key]) || 0)}</span>
                    </div>
                  ))}
                </div>
              );
            }}
          />
        </XYChart>
      )}
    </div>
  );
}
