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

export type ChartType =
  | 'line' | 'bar' | 'area' | 'pie' | 'scatter'
  | 'geo' | 'wordcloud' | 'treemap' | 'heatmap'
  | 'radar' | 'sankey' | 'funnel';

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

export function ChartCore(props: ChartCoreProps) {
  const height = props.height || 300;

  const { xKey, yKeys } = useMemo(() => {
    if (!props.data.length) return { xKey: '', yKeys: [] as string[] };
    const keys = Object.keys(props.data[0]);
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
        const firstValue = props.data[0][firstKey];
        if (typeof firstValue === 'number' && keys.length > 1) {
          x = keys.find(k => typeof props.data[0][k] !== 'number') || firstKey;
        } else {
          x = firstKey;
        }
      }
    }
    const y = props.yKeys || keys.filter(k => k !== x);
    return { xKey: x, yKeys: y };
  }, [props.data, props.xKey, props.yKeys, props.chartType]);

  if (!props.data.length) return null;

  const chartProps = {
    data: props.data,
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
      <ChartErrorBoundary title={props.title}>
        <div className="kaltura-chart-body" role="img" aria-label={props.title || `${props.chartType} chart`}>
          {renderChart()}
        </div>
      </ChartErrorBoundary>
      <SourceDataTable data={props.data} sourceData={props.sourceData} />
    </div>
  );
}
