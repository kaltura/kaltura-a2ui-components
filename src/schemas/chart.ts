import { z } from 'zod';
import { CommonSchemas } from '@a2ui/web_core/v0_9';

// Colors reach SVG paint attributes, so `url(...)` and other CSS functions must not pass.
const COLOR = /^(#[0-9a-f]{3,8}|(rgb|hsl)a?\([\d\s.,%/a-z-]*\)|var\(--[\w-]+\)|[a-z]{3,30})$/i;
const color = z.string().max(64).regex(COLOR);

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
    colors: z.array(color).optional(),
    height: CommonSchemas.DynamicNumber.optional(),
    annotations: z.array(z.object({
      x: z.union([z.string(), z.number()]),
      label: z.string(),
      color: color.optional(),
    })).optional(),
    action: CommonSchemas.Action.optional(),
  }),
};
