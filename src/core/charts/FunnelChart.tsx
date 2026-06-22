import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { Group } from '@visx/group';
import { scaleLinear } from '@visx/scale';
import { CHART_COLORS, useThemeColors } from './theme';
import { formatNumber } from './utils';

interface FunnelProps {
  data: Record<string, unknown>[];
  xKey: string;
  yKeys: string[];
  colors?: string[];
  height: number;
}

interface FunnelStage {
  label: string;
  value: number;
  percent: number;
}

interface TooltipState {
  stage: FunnelStage;
  x: number;
  y: number;
}

function FunnelInner({ data, xKey, yKeys, colors, height, width }: FunnelProps & { width: number }) {
  const palette = colors || CHART_COLORS;
  const valueKey = yKeys[0] || 'value';
  const themeColors = useThemeColors();
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const stages: FunnelStage[] = useMemo(() => {
    const items = data
      .map(d => ({ label: String(d[xKey] || ''), value: Number(d[valueKey]) || 0 }))
      .filter(s => s.value > 0);

    if (!items.length) return [];
    const maxVal = Math.max(...items.map(s => s.value));
    return items.map(s => ({
      ...s,
      percent: Math.round((s.value / maxVal) * 100),
    }));
  }, [data, xKey, valueKey]);

  const margin = { top: 10, bottom: 10, left: 120, right: 20 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const stageHeight = stages.length ? innerHeight / stages.length : 0;
  const gap = 6;

  const widthScale = scaleLinear({ domain: [0, 100], range: [innerWidth * 0.3, innerWidth] });

  const handleMouseMove = useCallback((e: React.MouseEvent, stage: FunnelStage) => {
    const rect = (e.currentTarget as SVGElement).closest('.funnel-wrapper')?.getBoundingClientRect();
    setTooltip({
      stage,
      x: e.clientX - (rect?.left || 0),
      y: e.clientY - (rect?.top || 0) - 12,
    });
  }, []);

  if (!stages.length) return null;

  return (
    <div className="funnel-wrapper" style={{ position: 'relative' }}>
      <svg width={width} height={height} aria-label="Funnel chart">
        <Group top={margin.top} left={margin.left}>
          {stages.map((stage, i) => {
            const barWidth = widthScale(stage.percent);
            const y = i * stageHeight + gap / 2;
            const barH = stageHeight - gap;
            const x = (innerWidth - barWidth) / 2;

            return (
              <g
                key={stage.label}
                style={{ cursor: 'pointer' }}
                onMouseMove={(e) => handleMouseMove(e, stage)}
                onMouseLeave={() => setTooltip(null)}
                tabIndex={0}
                aria-label={`${stage.label}: ${formatNumber(stage.value)} (${stage.percent}%)`}
              >
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barH}
                  fill={palette[i % palette.length]}
                  rx={barH / 2}
                  style={{ transition: 'opacity 150ms ease' }}
                />
                <text
                  x={-8}
                  y={y + barH / 2}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={11}
                  fontFamily="Lato, sans-serif"
                  fill={themeColors.textSecondary}
                >
                  {stage.label}
                </text>
                {barWidth > 80 && (
                  <text
                    x={x + barWidth / 2}
                    y={y + barH / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={12}
                    fontFamily="Lato, sans-serif"
                    fontWeight={700}
                    fill="#fff"
                    pointerEvents="none"
                  >
                    {formatNumber(stage.value)} ({stage.percent}%)
                  </text>
                )}
              </g>
            );
          })}
        </Group>
      </svg>

      {tooltip && (
        <div className="chart-tooltip" style={{ left: tooltip.x, top: tooltip.y }} role="tooltip">
          <strong>{tooltip.stage.label}</strong>
          <span className="chart-tooltip-value">{formatNumber(tooltip.stage.value)} ({tooltip.stage.percent}% of top)</span>
        </div>
      )}
    </div>
  );
}

export function FunnelChart(props: FunnelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(420);

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
      <FunnelInner {...props} width={width} />
    </div>
  );
}
