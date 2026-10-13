// Covers: QA-05 (the zod schemas must accept data the catalog allows and the
// components handle), SEC-03 (ids are checked, never coerced).
// Turns green: Phase 1b review fix for over-strict schemas. Green today.
// Strict rules guard ids, ks, urls, serverUrl and enums. Everything else must accept data the components handle.
import { describe, it, expect, afterEach } from 'vitest';
import { mount } from '../helpers/render';
import { checkProps } from '../../src/core/validate-props';
import { KalturaChartApi } from '../../src/schemas/chart';

(globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
  observe() {}
  disconnect() {}
  unobserve() {}
};

afterEach(() => {
  document.body.innerHTML = '';
});

const rows = [
  { name: 'a', value: 1, other: 2 },
  { name: 'b', value: 3, other: 4 },
];
const CHART_TYPES = ['line', 'bar', 'area', 'pie', 'scatter', 'geo', 'wordcloud', 'treemap', 'heatmap', 'radar', 'sankey', 'funnel'];

describe('QA-05: chart props: legitimate data is accepted', () => {
  const check = (extra: Record<string, unknown>) => checkProps(KalturaChartApi.schema, { chartType: 'line', data: rows, ...extra });

  it.each([[2024], ['2024'], ['Mon']])('QA-05: annotation x %j', x => {
    expect(check({ annotations: [{ x, label: 'L' }] })).toEqual({ invalid: [], pending: false });
  });

  it('QA-05: annotation with a colour, y and x keys, labels and colours', () => {
    expect(
      check({
        annotations: [{ x: 3, label: 'L', color: '#fff' }],
        xKey: 'name',
        yKeys: ['value', 'other'],
        yLabels: ['V', 'O'],
        colors: ['#111', 'red'],
        xLabel: 'X',
        yLabel: 'Y',
        title: 'T',
        height: 240.5,
        sourceData: rows,
      }),
    ).toEqual({ invalid: [], pending: false });
  });

  it('QA-05: rows with nested objects, nulls and arrays', () => {
    expect(check({ data: [{ name: 'a', value: null, extra: { deep: [1, 2] }, tags: ['x'] }] })).toEqual({ invalid: [], pending: false });
  });

  it('QA-05: an annotation x that is an object is still rejected', () => {
    expect(check({ annotations: [{ x: {}, label: 'L' }] }).invalid).toEqual(['annotations.0.x']);
  });

  // wordcloud needs a real canvas, which jsdom lacks, so it only gets the schema check here.
  it.each(CHART_TYPES)('QA-05: %s passes validation', chartType => {
    expect(check({ chartType, annotations: [{ x: 3, label: 'L' }] })).toEqual({ invalid: [], pending: false });
  });

  it.each(CHART_TYPES.filter(t => t !== 'wordcloud'))('QA-05: %s renders without an error box', async chartType => {
    const { ChartCore } = await import('../../src/core/chart');
    const { container } = await mount(ChartCore, { chartType, data: rows, annotations: [{ x: 3, label: 'L' }] });
    expect(container.querySelectorAll('[role="alert"]').length).toBe(0);
  });
});

describe('SEC-03: ids are not coerced: a numeric string partnerId is rejected (documented)', () => {
  it('SEC-03: player', async () => {
    const { PlayerCore } = await import('../../src/core/player');
    const { container } = await mount(PlayerCore, { partnerId: '123', uiconfId: 2, entryId: '0_a' });
    expect([container.textContent, container.querySelectorAll('iframe').length]).toEqual(['Failed to load player: Invalid partnerId', 0]);
  });

  it('SEC-03: analytics', async () => {
    const { AnalyticsCore } = await import('../../src/core/analytics');
    const { container } = await mount(AnalyticsCore, { partnerId: '123', ks: 'k' });
    expect([container.textContent, container.querySelectorAll('iframe').length]).toEqual(['Failed to load analytics: Invalid partnerId', 0]);
  });
});
