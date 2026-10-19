// Covers: QA-06 / SEC-15 (remaining parts: reset on data change, table inside a
// boundary, row cap, unique keys, non-array data).
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { ChartCoreProps } from '../../src/core/chart';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
  observe() {}
  disconnect() {}
  unobserve() {}
};

// Each test re-imports the chart modules, which is slow on a busy machine.
vi.setConfig({ testTimeout: 30000 });

const ERROR_TEXT = 'Unable to render chart.';
const roots: Root[] = [];

function mountRoot() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push(root);
  return { container, root };
}

const rowsOf = (n: number) => Array.from({ length: n }, (_, i) => ({ n: `r${i}`, v: i + 1 }));

afterEach(() => {
  roots.splice(0).forEach(r => act(() => r.unmount()));
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.doUnmock('../../src/core/charts/RadarChart');
  vi.resetModules();
});

describe('QA-06: boundary reset on data change', () => {
  it('QA-06: the error fallback goes away when the data changes', async () => {
    vi.resetModules();
    vi.doMock('../../src/core/charts/RadarChart', () => ({
      RadarChart: ({ data }: { data: { v: number }[] }) => {
        if (data[0].v === 1) throw new Error('bad data');
        return createElement('p', null, 'radar ok');
      },
    }));
    const { ChartCore } = await import('../../src/core/chart');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container, root } = mountRoot();
    const radar = (data: { n: string; v: number }[]): ChartCoreProps => ({ chartType: 'radar', data, xKey: 'n', yKeys: ['v'] });
    await act(async () => root.render(createElement(ChartCore, radar(rowsOf(4)))));
    expect(container.textContent).toContain(ERROR_TEXT);
    await act(async () => root.render(createElement(ChartCore, radar(rowsOf(4).map(r => ({ ...r, v: r.v + 1 }))))));
    expect(container.textContent).toContain('radar ok');
  });

  it('QA-06: the same data after an error stays on the fallback', async () => {
    vi.resetModules();
    vi.doMock('../../src/core/charts/RadarChart', () => ({
      RadarChart: () => {
        throw new Error('bad data');
      },
    }));
    const { ChartCore } = await import('../../src/core/chart');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container, root } = mountRoot();
    const props: ChartCoreProps = { chartType: 'radar', data: rowsOf(4), xKey: 'n', yKeys: ['v'] };
    await act(async () => root.render(createElement(ChartCore, props)));
    await act(async () => root.render(createElement(ChartCore, props)));
    expect(container.querySelectorAll('[role="alert"]')).toHaveLength(1);
  });
});

describe('SEC-15: source data table inside a boundary', () => {
  const explosive = { toString() { throw new Error('boom'); } };

  it('SEC-15: a table that throws shows the fallback, not a crash', async () => {
    const { ChartCore } = await import('../../src/core/chart');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container, root } = mountRoot();
    const props = { chartType: 'bar', data: rowsOf(3), xKey: 'n', yKeys: ['v'], sourceData: [{ a: explosive }] } as unknown as ChartCoreProps;
    await expect(act(async () => root.render(createElement(ChartCore, props)))).resolves.not.toThrow();
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(ERROR_TEXT);
  });

  it('SEC-15: a table that throws leaves the chart on screen', async () => {
    const { ChartCore } = await import('../../src/core/chart');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container, root } = mountRoot();
    const props = { chartType: 'bar', data: rowsOf(3), xKey: 'n', yKeys: ['v'], sourceData: [{ a: explosive }] } as unknown as ChartCoreProps;
    await act(async () => root.render(createElement(ChartCore, props)));
    expect(container.querySelector('.kaltura-chart-body')).not.toBeNull();
  });
});

describe('QA-06: row cap', () => {
  it('QA-06: more than 500 rows show a visible "first 500 of N" note', async () => {
    const { ChartCore } = await import('../../src/core/chart');
    const { container, root } = mountRoot();
    await act(async () => root.render(createElement(ChartCore, { chartType: 'pie', data: rowsOf(600), xKey: 'n', yKeys: ['v'] })));
    expect(container.querySelector('[role="status"]')?.textContent).toBe('Showing first 500 of 600 rows.');
  });

  it('QA-06: the chart gets only the first 500 rows', async () => {
    vi.resetModules();
    const seen: number[] = [];
    vi.doMock('../../src/core/charts/RadarChart', () => ({
      RadarChart: ({ data }: { data: unknown[] }) => {
        seen.push(data.length);
        return null;
      },
    }));
    const { ChartCore } = await import('../../src/core/chart');
    const { root } = mountRoot();
    await act(async () => root.render(createElement(ChartCore, { chartType: 'radar', data: rowsOf(600), xKey: 'n', yKeys: ['v'] })));
    expect(seen[0]).toBe(500);
  });

  it('QA-06: 500 rows or fewer show no note', async () => {
    const { ChartCore } = await import('../../src/core/chart');
    const { container, root } = mountRoot();
    await act(async () => root.render(createElement(ChartCore, { chartType: 'pie', data: rowsOf(500), xKey: 'n', yKeys: ['v'] })));
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it('QA-06: the source data table still lists every row count', async () => {
    const { ChartCore } = await import('../../src/core/chart');
    const { container, root } = mountRoot();
    await act(async () => root.render(createElement(ChartCore, { chartType: 'pie', data: rowsOf(600), xKey: 'n', yKeys: ['v'] })));
    expect(container.querySelector('summary .chart-source-data-count')?.textContent).toBe('600 rows');
  });

  it('QA-06: the table note says "first N of M"', async () => {
    const { SourceDataTable } = await import('../../src/core/charts/SourceDataTable');
    const { container, root } = mountRoot();
    await act(async () => root.render(createElement(SourceDataTable, { data: rowsOf(150) })));
    expect(container.querySelector('.chart-source-data-truncated')?.textContent).toBe('Showing first 100 of 150 rows. Download the CSV for all rows.');
  });
});

describe('QA-06: duplicate labels', () => {
  const dup = [{ n: 'same', v: 1 }, { n: 'same', v: 2 }, { n: 'same', v: 3 }];

  it.each(['pie', 'funnel', 'treemap', 'wordcloud', 'bar', 'radar'] as const)(
    'QA-06: %s with duplicate labels logs no duplicate-key warning',
    async chartType => {
      const { ChartCore } = await import('../../src/core/chart');
      const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { root } = mountRoot();
      await act(async () => root.render(createElement(ChartCore, { chartType, data: dup, xKey: 'n', yKeys: ['v'] })));
      expect(errors.mock.calls.filter(c => String(c[0]).includes('same key'))).toEqual([]);
    },
  );

  it('QA-06: duplicate yKeys in a bar chart log no duplicate-key warning', async () => {
    const { ChartCore } = await import('../../src/core/chart');
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { root } = mountRoot();
    await act(async () => root.render(createElement(ChartCore, { chartType: 'bar', data: dup, xKey: 'n', yKeys: ['v', 'v'] })));
    expect(errors.mock.calls.filter(c => String(c[0]).includes('same key'))).toEqual([]);
  });
});

describe('QA-06: non-array data', () => {
  it.each([undefined, null, 'x', { length: 1 }])('QA-06: ChartView with data %j renders nothing and does not throw', async data => {
    vi.resetModules();
    vi.doMock('../../src/core/validate-props', () => ({
      withValidatedProps: (_schema: unknown, _name: string, View: unknown) => View,
    }));
    try {
      const { ChartCore } = await import('../../src/core/chart');
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const { container, root } = mountRoot();
      const props = { chartType: 'bar', data } as unknown as ChartCoreProps;
      await act(async () => root.render(createElement(ChartCore, props)));
      expect(container.innerHTML).toBe('');
    } finally {
      vi.doUnmock('../../src/core/validate-props');
    }
  });
});
