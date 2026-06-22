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
export declare function CartesianChart({ chartType, data, xKey, yKeys, yLabels, xLabel, yLabel, colors, height, annotations, }: CartesianChartProps): import("react").JSX.Element | null;
//# sourceMappingURL=CartesianChart.d.ts.map