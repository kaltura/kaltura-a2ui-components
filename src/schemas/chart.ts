import { z } from 'zod';
import { CommonSchemas } from '@a2ui/web_core/v0_9';

export const KalturaChartApi = {
  name: 'KalturaChart',
  schema: z.object({
    chartType: z.enum([
      'line', 'bar', 'area', 'pie', 'scatter',
      'geo', 'wordcloud', 'treemap', 'heatmap',
      'radar', 'sankey', 'funnel',
    ]),
    data: z.array(z.record(z.any())),
    sourceData: z.array(z.record(z.any())).optional(),
    title: CommonSchemas.DynamicString.optional(),
    xKey: CommonSchemas.DynamicString.optional(),
    yKeys: z.array(z.string()).optional(),
    yLabels: z.array(z.string()).optional(),
    xLabel: CommonSchemas.DynamicString.optional(),
    yLabel: CommonSchemas.DynamicString.optional(),
    colors: z.array(z.string()).optional(),
    height: CommonSchemas.DynamicNumber.optional(),
    annotations: z.array(z.object({
      x: z.string(),
      label: z.string(),
      color: z.string().optional(),
    })).optional(),
  }),
};
