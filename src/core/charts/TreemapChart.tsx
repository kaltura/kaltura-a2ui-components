import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { Treemap, hierarchy, treemapSquarify } from '@visx/hierarchy';
import { Group } from '@visx/group';
import { scaleOrdinal } from '@visx/scale';
import { CHART_COLORS } from './theme';
import { formatNumber } from './utils';

interface TreemapProps {
  data: Record<string, unknown>[];
  xKey: string;
  yKeys: string[];
  colors?: string[];
  height: number;
}

interface TreeNode {
  name: string;
  value: number;
}

interface TooltipDatum {
  name: string;
  value: number;
  percent: number;
}

function TreemapInner({ data, xKey, yKeys, colors, height, width }: TreemapProps & { width: number }) {
  const palette = colors || CHART_COLORS;
  const valueKey = yKeys[0] || 'value';
  const [tooltip, setTooltip] = useState<(TooltipDatum & { x: number; y: number }) | null>(null);

  const nodes: TreeNode[] = useMemo(() =>
    data
      .map(d => ({ name: String(d[xKey] || ''), value: Number(d[valueKey]) || 0 }))
      .filter(n => n.value > 0)
      .sort((a, b) => b.value - a.value),
    [data, xKey, valueKey],
  );

  const total = nodes.reduce((sum, n) => sum + n.value, 0);

  const root = useMemo(() =>
    hierarchy({ name: 'root', value: 0, children: nodes } as TreeNode & { children: TreeNode[] })
      .sum(d => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0)),
    [nodes],
  );

  const colorScale = useMemo(() =>
    scaleOrdinal({ domain: nodes.map(n => n.name), range: palette }),
    [nodes, palette],
  );

  const handleMouseMove = useCallback((e: React.MouseEvent, node: TreeNode) => {
    const rect = (e.currentTarget as SVGElement).closest('.treemap-wrapper')?.getBoundingClientRect();
    setTooltip({
      name: node.name,
      value: node.value,
      percent: Math.round((node.value / total) * 100),
      x: e.clientX - (rect?.left || 0),
      y: e.clientY - (rect?.top || 0) - 12,
    });
  }, [total]);

  return (
    <div className="treemap-wrapper" style={{ position: 'relative' }}>
      <svg width={width} height={height} aria-label="Treemap showing composition">
        <Treemap
          root={root}
          size={[width, height]}
          tile={treemapSquarify}
          round
          paddingInner={3}
        >
          {treemap => (
            <Group>
              {treemap.descendants().filter(n => n.depth === 1).map(node => {
                const nodeData = node.data as TreeNode;
                const w = (node.x1 || 0) - (node.x0 || 0);
                const h = (node.y1 || 0) - (node.y0 || 0);
                const fill = colorScale(nodeData.name);

                return (
                  <g
                    key={nodeData.name}
                    style={{ cursor: 'pointer' }}
                    onMouseMove={(e) => handleMouseMove(e, nodeData)}
                    onMouseLeave={() => setTooltip(null)}
                    tabIndex={0}
                    aria-label={`${nodeData.name}: ${formatNumber(nodeData.value)}`}
                  >
                    <rect
                      x={node.x0}
                      y={node.y0}
                      width={w}
                      height={h}
                      fill={fill}
                      rx={4}
                      style={{ transition: 'opacity 150ms ease' }}
                    />
                    {w > 50 && h > 28 && (
                      <text
                        x={(node.x0 || 0) + 8}
                        y={(node.y0 || 0) + 18}
                        fontSize={12}
                        fontFamily="Lato, sans-serif"
                        fontWeight={700}
                        fill="#fff"
                        pointerEvents="none"
                      >
                        {nodeData.name.length > w / 7.5
                          ? nodeData.name.slice(0, Math.floor(w / 7.5)) + '…'
                          : nodeData.name}
                      </text>
                    )}
                    {w > 50 && h > 44 && (
                      <text
                        x={(node.x0 || 0) + 8}
                        y={(node.y0 || 0) + 34}
                        fontSize={10}
                        fontFamily="Lato, sans-serif"
                        fill="rgba(255,255,255,0.8)"
                        pointerEvents="none"
                      >
                        {formatNumber(nodeData.value)}
                      </text>
                    )}
                  </g>
                );
              })}
            </Group>
          )}
        </Treemap>
      </svg>

      {tooltip && (
        <div className="chart-tooltip" style={{ left: tooltip.x, top: tooltip.y }} role="tooltip">
          <strong>{tooltip.name}</strong>
          <span className="chart-tooltip-value">{formatNumber(tooltip.value)} ({tooltip.percent}%)</span>
        </div>
      )}
    </div>
  );
}

export function TreemapChart(props: TreemapProps) {
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
      <TreemapInner {...props} width={width} />
    </div>
  );
}
