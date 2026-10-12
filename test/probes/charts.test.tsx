// Covers: QA-06 / SEC-15 (Radar breaks hook order, error boundary never
// resets, data=[null] throws outside the boundary).
// Turns green: plan item 2.6 (charts).
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

const two = [{ n: 'a', v: 1 }, { n: 'b', v: 2 }];
const four = [{ n: 'a', v: 1 }, { n: 'b', v: 2 }, { n: 'c', v: 3 }, { n: 'd', v: 4 }];
const ERROR_TEXT = 'Unable to render chart.';

const roots: Root[] = [];
function mountRoot() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push(root);
  return { container, root };
}

afterEach(() => {
  roots.splice(0).forEach(r => act(() => r.unmount()));
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('QA-06: chart robustness', () => {
  it('QA-06: RadarChart survives a change from 2 to 4 rows (hook order)', async () => {
    const { RadarChart } = await import('../../src/core/charts/RadarChart');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { root } = mountRoot();
    const props = { xKey: 'n', yKeys: ['v'], height: 300 };
    await act(async () => root.render(createElement(RadarChart, { data: two, ...props })));
    await expect(
      act(async () => root.render(createElement(RadarChart, { data: four, ...props }))),
    ).resolves.not.toThrow();
  });

  it('QA-06: ChartCore does not show the error fallback after a 2 to 4 row radar update', async () => {
    const { ChartCore } = await import('../../src/core/chart');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container, root } = mountRoot();
    const radar = (data: typeof two): ChartCoreProps => ({ chartType: 'radar', data, xKey: 'n', yKeys: ['v'] });
    await act(async () => root.render(createElement(ChartCore, radar(two))));
    await act(async () => root.render(createElement(ChartCore, radar(four))));
    expect(container.textContent).not.toContain(ERROR_TEXT);
  });

  it('QA-06: ChartCore error boundary resets when the chart type changes', async () => {
    const { ChartCore } = await import('../../src/core/chart');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container, root } = mountRoot();
    const radar = (data: typeof two): ChartCoreProps => ({ chartType: 'radar', data, xKey: 'n', yKeys: ['v'] });
    await act(async () => root.render(createElement(ChartCore, radar(two))));
    await act(async () => root.render(createElement(ChartCore, radar(four))));
    await act(async () => root.render(createElement(ChartCore, { chartType: 'bar', data: four })));
    expect(container.textContent).not.toContain(ERROR_TEXT);
  });

  it('QA-06: data=[null] does not throw outside the error boundary', async () => {
    const { ChartCore } = await import('../../src/core/chart');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { root } = mountRoot();
    const props = { chartType: 'bar', data: [null] } as unknown as ChartCoreProps;
    await expect(act(async () => root.render(createElement(ChartCore, props)))).resolves.not.toThrow();
  });
});
