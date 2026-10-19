// Covers: QA-18 (chart renderers draw real shapes for every chart type).
// ResizeObserver reports a width, so the responsive charts leave their empty state.
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { ChartCoreProps } from '../../src/core/chart';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
vi.setConfig({ testTimeout: 30000, hookTimeout: 60000 });

const WIDTH = 640;
(globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
  constructor(private cb: (entries: unknown[]) => void) {}
  observe() {
    setTimeout(() => this.cb([{ contentRect: { width: WIDTH, height: 300 } }]), 0);
  }
  disconnect() {}
  unobserve() {}
};

const named = [
  { name: 'Alpha', value: 4, other: 2 },
  { name: 'Beta', value: 7, other: 5 },
  { name: 'Gamma', value: 3, other: 6 },
  { name: 'Delta', value: 9, other: 1 },
];
const byType: Record<string, Partial<ChartCoreProps>> = {
  line: { xKey: 'name', yKeys: ['value', 'other'], annotations: [{ x: 'Beta', label: 'Launch', color: '#f00' }] },
  bar: { xKey: 'name', yKeys: ['value'], xLabel: 'Name', yLabel: 'Count', yLabels: ['Count'] },
  area: { xKey: 'name', yKeys: ['value', 'other'], colors: ['#111', '#999'] },
  scatter: { xKey: 'name', yKeys: ['value'] },
  pie: { xKey: 'name', yKeys: ['value'] },
  funnel: { xKey: 'name', yKeys: ['value'] },
  treemap: { xKey: 'name', yKeys: ['value'] },
  radar: { xKey: 'name', yKeys: ['value', 'other'] },
  heatmap: {
    data: [
      { x: 'Mon', y: 'AM', value: 1 },
      { x: 'Mon', y: 'PM', value: 5 },
      { x: 'Tue', y: 'AM', value: 3 },
      { x: 'Tue', y: 'PM', value: 8 },
    ],
  },
  sankey: {
    data: [
      { source: 'A', target: 'B', value: 5 },
      { source: 'A', target: 'C', value: 3 },
      { source: 'B', target: 'C', value: 2 },
    ],
  },
  geo: { data: [{ country: 'France', value: 4 }, { country: 'Japan', value: 9 }] },
};

let root: Root;
let host: HTMLElement;
beforeAll(() => {
  // GeoMap fetches the world map. A failed fetch gives an empty map, which is fine here.
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 500 })));
});
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  host = document.body.appendChild(document.createElement('div'));
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('QA-18: chart renderers', () => {
  it.each(Object.keys(byType))('QA-18: %s draws without an error box', async chartType => {
    const { ChartCore } = await import('../../src/core/chart');
    const props = { chartType, data: named, ...byType[chartType] } as unknown as ChartCoreProps;
    await act(async () => root.render(createElement(ChartCore, props)));
    await act(async () => {
      await new Promise(r => setTimeout(r, 50));
    });
    const shapes = host.querySelector('.kaltura-chart-body')?.querySelectorAll('svg *').length ?? 0;
    expect([host.querySelectorAll('[role="alert"]').length, shapes > 0]).toEqual([0, true]);
  });
});
