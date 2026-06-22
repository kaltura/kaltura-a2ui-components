import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { sankey as d3Sankey, sankeyJustify, sankeyLinkHorizontal } from '@visx/sankey';
import { Group } from '@visx/group';
import { CHART_COLORS, useThemeColors } from './theme';
import { formatNumber } from './utils';

const MARGIN = { top: 10, right: 10, bottom: 10, left: 10 };

interface SankeyProps {
  data: Record<string, unknown>[];
  xKey: string;
  yKeys: string[];
  colors?: string[];
  height: number;
}

interface SankeyNode {
  name: string;
  index?: number;
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
}

interface SankeyLink {
  source: number | SankeyNode;
  target: number | SankeyNode;
  value: number;
  width?: number;
  y0?: number;
  y1?: number;
}

interface TooltipState {
  source: string;
  target: string;
  value: number;
  x: number;
  y: number;
}

function SankeyInner({ data, xKey, yKeys, colors, height, width }: SankeyProps & { width: number }) {
  const palette = colors || CHART_COLORS;
  const themeColors = useThemeColors();
  const sourceKey = xKey || 'source';
  const targetKey = yKeys[0] || 'target';
  const valueKey = yKeys[1] || 'value';
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const { nodes, links } = useMemo(() => {
    const nodeNames = new Set<string>();
    const linkData: { source: string; target: string; value: number }[] = [];

    for (const row of data) {
      const src = String(row[sourceKey] || '');
      const tgt = String(row[targetKey] || '');
      const val = Number(row[valueKey]) || 0;
      if (src && tgt && val > 0) {
        nodeNames.add(src);
        nodeNames.add(tgt);
        linkData.push({ source: src, target: tgt, value: val });
      }
    }

    const nodeArray = [...nodeNames].map(name => ({ name }));
    const nameIndex = new Map(nodeArray.map((n, i) => [n.name, i]));

    const sankeyLinks: SankeyLink[] = linkData.map(l => ({
      source: nameIndex.get(l.source) || 0,
      target: nameIndex.get(l.target) || 0,
      value: l.value,
    }));

    return { nodes: nodeArray, links: sankeyLinks };
  }, [data, sourceKey, targetKey, valueKey]);

  const sankeyLayout = useMemo(() => {
    const layout = d3Sankey<SankeyNode, SankeyLink>()
      .nodeWidth(18)
      .nodePadding(14)
      .nodeAlign(sankeyJustify)
      .extent([
        [MARGIN.left, MARGIN.top],
        [width - MARGIN.right, height - MARGIN.bottom],
      ]);

    return layout({ nodes: [...nodes], links: [...links] });
  }, [nodes, links, width, height]);

  const linkPath = sankeyLinkHorizontal();

  const handleMouseMove = useCallback((e: React.MouseEvent, source: string, target: string, value: number) => {
    const rect = (e.currentTarget as SVGElement).closest('.sankey-wrapper')?.getBoundingClientRect();
    setTooltip({
      source,
      target,
      value,
      x: e.clientX - (rect?.left || 0),
      y: e.clientY - (rect?.top || 0) - 12,
    });
  }, []);

  if (!sankeyLayout.nodes.length) return null;

  return (
    <div className="sankey-wrapper" style={{ position: 'relative' }}>
      <svg width={width} height={height} aria-label="Sankey flow diagram">
        <Group>
          {sankeyLayout.links.map((link, i) => {
            const src = link.source as SankeyNode;
            const tgt = link.target as SankeyNode;
            return (
              <path
                key={`link-${i}`}
                d={linkPath(link as Parameters<typeof linkPath>[0]) || ''}
                fill="none"
                stroke={palette[(src.index || 0) % palette.length]}
                strokeWidth={Math.max(1, link.width || 1)}
                strokeOpacity={0.35}
                style={{ cursor: 'pointer', transition: 'stroke-opacity 150ms ease' }}
                onMouseMove={(e) => handleMouseMove(e, src.name, tgt.name, link.value)}
                onMouseLeave={() => setTooltip(null)}
                onMouseEnter={(e) => (e.currentTarget.style.strokeOpacity = '0.7')}
              />
            );
          })}

          {sankeyLayout.nodes.map((node, i) => (
            <g key={`node-${i}`}>
              <rect
                x={node.x0}
                y={node.y0}
                width={(node.x1 || 0) - (node.x0 || 0)}
                height={(node.y1 || 0) - (node.y0 || 0)}
                fill={palette[i % palette.length]}
                rx={3}
              />
              <text
                x={(node.x1 || 0) + 8}
                y={((node.y0 || 0) + (node.y1 || 0)) / 2}
                dominantBaseline="middle"
                fontSize={11}
                fontFamily="Lato, sans-serif"
                fill={themeColors.textSecondary}
              >
                {node.name}
              </text>
            </g>
          ))}
        </Group>
      </svg>

      {tooltip && (
        <div className="chart-tooltip" style={{ left: tooltip.x, top: tooltip.y }} role="tooltip">
          <strong>{tooltip.source} → {tooltip.target}</strong>
          <span className="chart-tooltip-value">{formatNumber(tooltip.value)}</span>
        </div>
      )}
    </div>
  );
}

export function SankeyChart(props: SankeyProps) {
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
      <SankeyInner {...props} width={width} />
    </div>
  );
}
