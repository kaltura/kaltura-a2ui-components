export type ChartType = 'line' | 'bar' | 'area' | 'pie' | 'scatter' | 'geo' | 'wordcloud' | 'treemap' | 'heatmap' | 'radar' | 'sankey' | 'funnel';
export interface ChartAnnotation {
    x: string;
    label: string;
    color?: string;
}
export interface ChartCoreProps {
    chartType: ChartType;
    data: Record<string, unknown>[];
    sourceData?: Record<string, unknown>[];
    title?: string;
    xKey?: string;
    yKeys?: string[];
    yLabels?: string[];
    xLabel?: string;
    yLabel?: string;
    colors?: string[];
    height?: number;
    annotations?: ChartAnnotation[];
}
export declare function ChartCore(props: ChartCoreProps): import("react").JSX.Element | null;
//# sourceMappingURL=chart.d.ts.map