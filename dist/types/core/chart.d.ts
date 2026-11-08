export type ChartType = 'line' | 'bar' | 'area' | 'pie' | 'scatter' | 'geo' | 'wordcloud' | 'treemap' | 'heatmap' | 'radar' | 'sankey' | 'funnel';
export interface ChartAnnotation {
    x: string | number;
    label: string;
    color?: string;
}
export interface ChartCoreProps {
    /** How rows are read. See `docs/components.md`. */
    chartType: ChartType;
    /** Rows to draw. At most 500 are drawn. */
    data: Record<string, unknown>[];
    /** Full data for the table and CSV when the chart shows a summary. */
    sourceData?: Record<string, unknown>[];
    /** Title above the chart. */
    title?: string;
    /** Row key of the x-axis or category. Default depends on `chartType`. */
    xKey?: string;
    /** Row keys of the value series. Default: every key except `xKey`. */
    yKeys?: string[];
    /** Legend labels for `yKeys`. */
    yLabels?: string[];
    /** Label of the x-axis. */
    xLabel?: string;
    /** Label of the y-axis. */
    yLabel?: string;
    /** Series colours, as hex or CSS colour strings. */
    colors?: string[];
    /** Height in pixels. Default: 300. */
    height?: number;
    /** Vertical markers on line, bar, area and scatter charts. */
    annotations?: ChartAnnotation[];
}
export declare const ChartCore: import("react").FC<ChartCoreProps>;
//# sourceMappingURL=chart.d.ts.map