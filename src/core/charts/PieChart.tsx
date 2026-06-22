import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { Pie } from '@visx/shape';
import { Group } from '@visx/group';
import { scaleOrdinal } from '@visx/scale';
import { CHART_COLORS } from './theme';
import { formatNumber } from './utils';

interface PieChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  yKeys: string[];
  colors?: string[];
  height: number;
}

interface PieDatum {
  label: string;
  value: number;
}

interface TooltipState {
  datum: PieDatum;
  x: number;
  y: number;
}

function PieChartInner({ data, xKey, yKeys, colors, height, width }: PieChartProps & { width: number }) {
  const palette = colors || CHART_COLORS;
  const valueKey = yKeys[0] || 'value';
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const pieData: PieDatum[] = useMemo(() =>
    data.map(d => ({
      label: String(d[xKey] || ''),
      value: Number(d[valueKey]) || 0,
    })).filter(d => d.value > 0),
    [data, xKey, valueKey],
  );

  const colorScale = useMemo(() =>
    scaleOrdinal({ domain: pieData.map(d => d.label), range: palette }),
    [pieData, palette],
  );

  const total = pieData.reduce((sum, d) => sum + d.value, 0);

  const chartSize = Math.min(width * 0.6, height);
  const radius = chartSize / 2 - 16;
  const centerX = chartSize / 2;
  const centerY = height / 2;

  const handleMouseMove = useCallback((e: React.MouseEvent, datum: PieDatum, i: number) => {
    const rect = (e.currentTarget as SVGElement).closest('.pie-chart-wrapper')?.getBoundingClientRect();
    setTooltip({
      datum,
      x: e.clientX - (rect?.left || 0),
      y: e.clientY - (rect?.top || 0) - 12,
    });
    setActiveIndex(i);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltip(null);
    setActiveIndex(null);
  }, []);

  return (
    <div className="pie-chart-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 16 }}>
      <svg width={chartSize} height={height} aria-label="Pie chart showing distribution">
        <Group top={centerY} left={centerX}>
          <Pie
            data={pieData}
            pieValue={d => d.value}
            outerRadius={radius}
            innerRadius={radius * 0.45}
            padAngle={0.025}
            cornerRadius={3}
          >
            {pie => pie.arcs.map((arc, i) => {
              const [cx, cy] = pie.path.centroid(arc);
              const fill = colorScale(arc.data.label);
              const isActive = activeIndex === i;
              return (
                <g
                  key={arc.data.label}
                  onMouseMove={(e) => handleMouseMove(e, arc.data, i)}
                  onMouseLeave={handleMouseLeave}
                  style={{ cursor: 'pointer' }}
                  tabIndex={0}
                  aria-label={`${arc.data.label}: ${formatNumber(arc.data.value)} (${Math.round((arc.data.value / total) * 100)}%)`}
                  onFocus={() => setActiveIndex(i)}
                  onBlur={() => setActiveIndex(null)}
                >
                  <path
                    d={pie.path(arc) || ''}
                    fill={fill}
                    opacity={activeIndex === null || isActive ? 1 : 0.6}
                    style={{
                      transition: 'opacity 150ms ease, transform 150ms ease',
                      transformOrigin: `${cx * 0.3}px ${cy * 0.3}px`,
                      transform: isActive ? 'scale(1.04)' : undefined,
                    }}
                  />
                  {arc.endAngle - arc.startAngle > 0.4 && (
                    <text
                      x={cx}
                      y={cy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={12}
                      fontWeight={600}
                      fontFamily="Lato, sans-serif"
                      fill="#fff"
                      pointerEvents="none"
                    >
                      {Math.round((arc.data.value / total) * 100)}%
                    </text>
                  )}
                </g>
              );
            })}
          </Pie>
          {/* Center total */}
          <text
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={13}
            fontWeight={700}
            fontFamily="Lato, sans-serif"
            fill="var(--page-text)"
            y={-4}
          >
            {formatNumber(total)}
          </text>
          <text
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={10}
            fontFamily="Lato, sans-serif"
            fill="var(--page-text-muted)"
            y={12}
          >
            total
          </text>
        </Group>
      </svg>

      {/* Legend (vertical, right side) */}
      <div className="chart-legend chart-legend--vertical">
        {pieData.map((d, i) => (
          <button
            key={d.label}
            className={`chart-legend-item ${activeIndex === i ? 'chart-legend-item--active' : ''}`}
            onMouseEnter={() => setActiveIndex(i)}
            onMouseLeave={() => setActiveIndex(null)}
            tabIndex={0}
            aria-label={`${d.label}: ${formatNumber(d.value)}`}
          >
            <span
              className="chart-legend-swatch"
              style={{ backgroundColor: colorScale(d.label) }}
            />
            <span className="chart-legend-label">{d.label}</span>
            <span className="chart-legend-value">{formatNumber(d.value)}</span>
          </button>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="chart-tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
          role="tooltip"
        >
          <strong>{tooltip.datum.label}</strong>
          <span className="chart-tooltip-value">
            {formatNumber(tooltip.datum.value)} ({Math.round((tooltip.datum.value / total) * 100)}%)
          </span>
        </div>
      )}
    </div>
  );
}

export function PieChartRenderer(props: PieChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(400);

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
      <PieChartInner {...props} width={width} />
    </div>
  );
}
