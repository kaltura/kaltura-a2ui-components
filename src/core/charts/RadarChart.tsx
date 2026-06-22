import { useMemo, useRef, useState, useEffect } from 'react';
import { Group } from '@visx/group';
import { scaleLinear } from '@visx/scale';
import { Line } from '@visx/shape';
import { Point } from '@visx/point';
import { Text } from '@visx/text';
import { CHART_COLORS, useThemeColors } from './theme';

interface RadarProps {
  data: Record<string, unknown>[];
  xKey: string;
  yKeys: string[];
  yLabels?: string[];
  colors?: string[];
  height: number;
}

function RadarInner({ data, xKey, yKeys, yLabels, colors, height, width }: RadarProps & { width: number }) {
  const palette = colors || CHART_COLORS;
  const themeColors = useThemeColors();
  const size = Math.min(width, height);
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size / 2 - 44;

  const axes = useMemo(() => data.map(d => String(d[xKey] || '')), [data, xKey]);
  const numAxes = axes.length;

  if (numAxes < 3) return null;

  const maxValue = useMemo(() => {
    let max = 0;
    for (const row of data) {
      for (const key of yKeys) {
        const v = Number(row[key]) || 0;
        if (v > max) max = v;
      }
    }
    return max || 1;
  }, [data, yKeys]);

  const radialScale = scaleLinear({ domain: [0, maxValue], range: [0, radius] });
  const angleStep = (2 * Math.PI) / numAxes;

  function polarToCartesian(angle: number, distance: number): Point {
    const x = distance * Math.cos(angle - Math.PI / 2);
    const y = distance * Math.sin(angle - Math.PI / 2);
    return new Point({ x, y });
  }

  const levels = [0.2, 0.4, 0.6, 0.8, 1.0];
  const gridColor = themeColors.isDark ? 'rgba(139, 163, 189, 0.15)' : 'rgba(15, 26, 42, 0.08)';

  return (
    <svg width={size} height={size} aria-label="Radar chart">
      <Group top={centerY} left={centerX}>
        {levels.map(level => (
          <polygon
            key={level}
            points={Array.from({ length: numAxes }, (_, i) => {
              const p = polarToCartesian(i * angleStep, radius * level);
              return `${p.x},${p.y}`;
            }).join(' ')}
            fill="none"
            stroke={gridColor}
            strokeWidth={1}
          />
        ))}

        {axes.map((_, i) => {
          const end = polarToCartesian(i * angleStep, radius);
          return (
            <Line
              key={`axis-${i}`}
              from={{ x: 0, y: 0 }}
              to={{ x: end.x, y: end.y }}
              stroke={gridColor}
              strokeWidth={1}
            />
          );
        })}

        {yKeys.map((key, keyIdx) => {
          const points = data.map((row, i) => {
            const val = Number(row[key]) || 0;
            return polarToCartesian(i * angleStep, radialScale(val));
          });
          const pathStr = points.map((p, i) =>
            `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
          ).join(' ') + ' Z';

          return (
            <g key={key}>
              <path
                d={pathStr}
                fill={palette[keyIdx % palette.length]}
                fillOpacity={0.12}
                stroke={palette[keyIdx % palette.length]}
                strokeWidth={2}
              />
              {points.map((p, i) => (
                <circle
                  key={`dot-${keyIdx}-${i}`}
                  cx={p.x}
                  cy={p.y}
                  r={3.5}
                  fill={palette[keyIdx % palette.length]}
                />
              ))}
            </g>
          );
        })}

        {axes.map((label, i) => {
          const labelPoint = polarToCartesian(i * angleStep, radius + 20);
          return (
            <Text
              key={`label-${i}`}
              x={labelPoint.x}
              y={labelPoint.y}
              textAnchor="middle"
              verticalAnchor="middle"
              fontSize={11}
              fontFamily="Lato, sans-serif"
              fill={themeColors.textSecondary}
            >
              {label}
            </Text>
          );
        })}
      </Group>

      {yKeys.length > 1 && (
        <Group top={size - 20} left={12}>
          {yKeys.map((key, i) => (
            <g key={key} transform={`translate(${i * 100}, 0)`}>
              <rect width={10} height={10} fill={palette[i % palette.length]} rx={3} />
              <Text x={14} y={9} fontSize={11} fontFamily="Lato, sans-serif" fill={themeColors.textSecondary}>
                {yLabels?.[i] || key}
              </Text>
            </g>
          ))}
        </Group>
      )}
    </svg>
  );
}

export function RadarChart(props: RadarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(300);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) setWidth(Math.max(entry.contentRect.width, 200));
    });
    observer.observe(containerRef.current);
    setWidth(Math.max(containerRef.current.offsetWidth, 200));
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <RadarInner {...props} width={width} />
    </div>
  );
}
