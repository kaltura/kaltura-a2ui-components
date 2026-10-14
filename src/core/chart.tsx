import { useMemo } from 'react';
import {
  CartesianChart,
  PieChartRenderer,
  GeoMap,
  WordCloudChart,
  TreemapChart,
  HeatmapChart,
  RadarChart,
  SankeyChart,
  FunnelChart,
  SourceDataTable,
  ChartErrorBoundary,
} from './charts';
import { KalturaChartApi } from '../schemas/chart';
import { withValidatedProps } from './validate-props';

export type ChartType =
  | 'line' | 'bar' | 'area' | 'pie' | 'scatter'
  | 'geo' | 'wordcloud' | 'treemap' | 'heatmap'
  | 'radar' | 'sankey' | 'funnel';

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

// Rows drawn in the chart. Longer data is cut and the cut is shown under the chart.
// The source data table and the CSV still get every row.
const MAX_CHART_ROWS = 500;

function ChartView(props: ChartCoreProps) {
  const height = props.height || 300;
  const allRows = Array.isArray(props.data) ? props.data : [];
  const rows = allRows.length > MAX_CHART_ROWS ? allRows.slice(0, MAX_CHART_ROWS) : allRows;

  const { xKey, yKeys } = useMemo(() => {
    if (!rows.length) return { xKey: '', yKeys: [] as string[] };
    const keys = Object.keys(rows[0]);
    let x = props.xKey || '';
    if (!x) {
      if (props.chartType === 'pie' && keys.includes('name')) {
        x = 'name';
      } else if (props.chartType === 'wordcloud' && keys.includes('text')) {
        x = 'text';
      } else if (props.chartType === 'geo' && keys.includes('country')) {
        x = 'country';
      } else if (props.chartType === 'sankey' && keys.includes('source')) {
        x = 'source';
      } else {
        const firstKey = keys[0] || '';
        const firstValue = rows[0][firstKey];
        if (typeof firstValue === 'number' && keys.length > 1) {
          x = keys.find(k => typeof rows[0][k] !== 'number') || firstKey;
        } else {
          x = firstKey;
        }
      }
    }
    const y = props.yKeys || keys.filter(k => k !== x);
    return { xKey: x, yKeys: y };
  }, [rows, props.xKey, props.yKeys, props.chartType]);

  if (!rows.length) return null;

  const chartProps = {
    data: rows,
    xKey,
    yKeys,
    yLabels: props.yLabels,
    xLabel: props.xLabel,
    yLabel: props.yLabel,
    colors: props.colors,
    height,
  };

  const renderChart = () => {
    switch (props.chartType) {
      case 'line':
      case 'bar':
      case 'area':
      case 'scatter':
        return <CartesianChart {...chartProps} chartType={props.chartType as 'line' | 'bar' | 'area' | 'scatter'} annotations={props.annotations} />;
      case 'pie':
        return <PieChartRenderer {...chartProps} />;
      case 'geo':
        return <GeoMap {...chartProps} />;
      case 'wordcloud':
        return <WordCloudChart {...chartProps} />;
      case 'treemap':
        return <TreemapChart {...chartProps} />;
      case 'heatmap':
        return <HeatmapChart {...chartProps} />;
      case 'radar':
        return <RadarChart {...chartProps} />;
      case 'sankey':
        return <SankeyChart {...chartProps} />;
      case 'funnel':
        return <FunnelChart {...chartProps} />;
    }
  };

  return (
    <div className="kaltura-chart-container">
      {props.title && <h4 className="kaltura-chart-title">{props.title}</h4>}
      <ChartErrorBoundary key={props.chartType} resetKey={props.data}>
        <div className="kaltura-chart-body" role="img" aria-label={props.title || `${props.chartType} chart`}>
          {renderChart()}
        </div>
      </ChartErrorBoundary>
      {allRows.length > rows.length && (
        <div className="chart-source-data-count" role="status">
          Showing first {rows.length} of {allRows.length} rows.
        </div>
      )}
      <ChartErrorBoundary resetKey={props.data}>
        <SourceDataTable data={allRows} sourceData={props.sourceData} />
      </ChartErrorBoundary>
    </div>
  );
}

export const ChartCore = withValidatedProps(KalturaChartApi.schema, 'chart', ChartView, 'chart');
