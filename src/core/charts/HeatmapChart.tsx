import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { scaleLinear, scaleBand } from '@visx/scale';
import { Group } from '@visx/group';
import { CHART_COLORS, useThemeColors } from './theme';
import { formatNumber } from './utils';

export interface HeatmapProps {
  data: Record<string, unknown>[];
  xKey: string;
  yKeys: string[];
  colors?: string[];
  height: number;
}

interface TooltipDatum {
  x: string;
  y: string;
  value: number;
}

function HeatmapInner({ data, xKey, yKeys, colors, height, width }: HeatmapProps & { width: number }) {
  const valueKey = yKeys[0] || 'value';
  const yKey = yKeys.length > 1 ? yKeys[1] : 'row';
  const baseColor = colors?.[0] || CHART_COLORS[0];
  const themeColors = useThemeColors();
  const [tooltip, setTooltip] = useState<(TooltipDatum & { px: number; py: number }) | null>(null);

  const { xLabels, yLabels, bins, maxValue } = useMemo(() => {
    const xs = [...new Set(data.map(d => String(d[xKey] || '')))];
    const ys = [...new Set(data.map(d => String(d[yKey] || '')))];

    const lookup = new Map<string, number>();
    let max = 0;
    for (const d of data) {
      const key = `${String(d[xKey])}|${String(d[yKey])}`;
      const val = Number(d[valueKey]) || 0;
      lookup.set(key, val);
      if (val > max) max = val;
    }

    const binData = ys.map(y => ({
      bin: y,
      bins: xs.map(x => ({
        bin: x,
        count: lookup.get(`${x}|${y}`) || 0,
      })),
    }));

    return { xLabels: xs, yLabels: ys, bins: binData, maxValue: max || 1 };
  }, [data, xKey, yKey, valueKey]);

  const margin = { top: 10, right: 10, bottom: 30, left: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const xScale = scaleBand({ domain: xLabels, range: [0, innerWidth], padding: 0.06 });
  const yScale = scaleBand({ domain: yLabels, range: [0, innerHeight], padding: 0.06 });
  const colorScale = scaleLinear<string>({ domain: [0, maxValue], range: [themeColors.emptyFill, baseColor] });

  const cellWidth = xScale.bandwidth();
  const cellHeight = yScale.bandwidth();

  const handleMouseMove = useCallback((e: React.MouseEvent, datum: TooltipDatum) => {
    const rect = (e.currentTarget as SVGElement).closest('.heatmap-wrapper')?.getBoundingClientRect();
    setTooltip({
      ...datum,
      px: e.clientX - (rect?.left || 0),
      py: e.clientY - (rect?.top || 0) - 12,
    });
  }, []);

  return (
    <div className="heatmap-wrapper" style={{ position: 'relative' }}>
      <svg width={width} height={height} aria-label="Heatmap visualization">
        <Group top={margin.top} left={margin.left}>
          {bins.map((row, rowIdx) =>
            row.bins.map((cell, colIdx) => {
              const x = xScale(xLabels[colIdx]) || 0;
              const y = yScale(yLabels[rowIdx]) || 0;
              const fill = cell.count > 0 ? colorScale(cell.count) : themeColors.emptyFill;

              return (
                <rect
                  key={`hm-${rowIdx}-${colIdx}`}
                  x={x}
                  y={y}
                  width={cellWidth}
                  height={cellHeight}
                  fill={fill}
                  rx={3}
                  style={{ cursor: cell.count > 0 ? 'pointer' : 'default', transition: 'fill 150ms ease' }}
                  onMouseMove={(e) => handleMouseMove(e, { x: xLabels[colIdx] || '', y: yLabels[rowIdx] || '', value: cell.count })}
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            })
          )}

          {xLabels.map(label => (
            <text
              key={`x-${label}`}
              x={(xScale(label) || 0) + xScale.bandwidth() / 2}
              y={innerHeight + 18}
              textAnchor="middle"
              fontSize={10}
              fontFamily="Lato, sans-serif"
              fill={themeColors.textMuted}
            >
              {label}
            </text>
          ))}

          {yLabels.map(label => (
            <text
              key={`y-${label}`}
              x={-6}
              y={(yScale(label) || 0) + yScale.bandwidth() / 2}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={10}
              fontFamily="Lato, sans-serif"
              fill={themeColors.textMuted}
            >
              {label}
            </text>
          ))}
        </Group>
      </svg>

      {tooltip && (
        <div className="chart-tooltip" style={{ left: tooltip.px, top: tooltip.py }} role="tooltip">
          <strong>{tooltip.y} / {tooltip.x}</strong>
          <span className="chart-tooltip-value">{formatNumber(tooltip.value)}</span>
        </div>
      )}
    </div>
  );
}

export function HeatmapChart(props: HeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(480);

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
      <HeatmapInner {...props} width={width} />
    </div>
  );
}
