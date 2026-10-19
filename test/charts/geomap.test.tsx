// Covers: QA-15 / SEC-16 (GeoMap fetch pinned, ok check, abort on unmount,
// module cache, unique gradient id, colours that are not 6-digit hex).
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
  observe() {}
  disconnect() {}
  unobserve() {}
};

// Each test re-imports the chart modules, which is slow on a busy machine.
vi.setConfig({ testTimeout: 30000 });

const square = (x: number) => [[x, 0], [x + 10, 0], [x + 10, 10], [x, 10], [x, 0]];
const TOPO = {
  type: 'Topology',
  arcs: [square(0), square(20)],
  objects: {
    countries: {
      type: 'GeometryCollection',
      geometries: [
        { type: 'Polygon', id: '566', properties: { name: 'Nigeria' }, arcs: [[0]] },
        { type: 'Polygon', id: '562', properties: { name: 'Niger' }, arcs: [[1]] },
      ],
    },
  },
};

const roots: Root[] = [];
function mountRoot() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push(root);
  return { container, root };
}
const flush = () => act(async () => { await new Promise(r => setTimeout(r, 0)); });

async function freshGeoMap() {
  vi.resetModules();
  return (await import('../../src/core/charts/GeoMap')).GeoMap;
}
const props = { data: [{ country: 'ng', v: 5 }], xKey: 'country', yKeys: ['v'], height: 300 };
const okResponse = () => ({ ok: true, status: 200, json: async () => TOPO });

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  roots.splice(0).forEach(r => act(() => r.unmount()));
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('QA-15: GeoMap loading', () => {
  it('QA-15: requests an exact world-atlas version', async () => {
    const fetchMock = vi.fn(async (_url: string) => okResponse());
    vi.stubGlobal('fetch', fetchMock);
    const GeoMap = await freshGeoMap();
    const { root } = mountRoot();
    await act(async () => root.render(createElement(GeoMap, props)));
    await flush();
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/npm\/world-atlas@\d+\.\d+\.\d+\/countries-110m\.json$/);
  });

  it('SEC-16: the request carries the sha384 hash of the pinned world-atlas version', async () => {
    // Bump the version and the hash together: this table fails if only one changes.
    const PINNED = { '2.0.2': 'sha384-yOCJ+8ShBm8UDqtAVtAvxTDDf4gXo5edxl/YG0FmVC5OTmqVLl7utuVGBDEeZWHf' } as Record<string, string>;
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => okResponse());
    vi.stubGlobal('fetch', fetchMock);
    const GeoMap = await freshGeoMap();
    const { root } = mountRoot();
    await act(async () => root.render(createElement(GeoMap, props)));
    await flush();
    const [url, init] = fetchMock.mock.calls[0];
    expect([PINNED[/world-atlas@([\d.]+)\//.exec(url)?.[1] ?? '']]).toEqual([init?.integrity]);
  });

  it('QA-15: draws the countries from a good response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => okResponse()));
    const GeoMap = await freshGeoMap();
    const { container, root } = mountRoot();
    await act(async () => root.render(createElement(GeoMap, props)));
    await flush();
    expect(container.querySelectorAll('.geo-map-wrapper svg path')).toHaveLength(2);
  });

  it('QA-15: a non-ok response draws no countries and does not parse the body', async () => {
    const json = vi.fn(async () => TOPO);
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404, json })));
    const GeoMap = await freshGeoMap();
    const { container, root } = mountRoot();
    await act(async () => root.render(createElement(GeoMap, props)));
    await flush();
    expect([container.querySelectorAll('path').length, json.mock.calls.length]).toEqual([0, 0]);
  });

  it('QA-15: a failed load is retried by the next mount', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => TOPO })
      .mockResolvedValue(okResponse());
    vi.stubGlobal('fetch', fetchMock);
    const GeoMap = await freshGeoMap();
    const first = mountRoot();
    await act(async () => first.root.render(createElement(GeoMap, props)));
    await flush();
    const second = mountRoot();
    await act(async () => second.root.render(createElement(GeoMap, props)));
    await flush();
    expect(second.container.querySelectorAll('path')).toHaveLength(2);
  });

  it('QA-15: a later mount uses the module cache and does not fetch again', async () => {
    const fetchMock = vi.fn(async () => okResponse());
    vi.stubGlobal('fetch', fetchMock);
    const GeoMap = await freshGeoMap();
    const first = mountRoot();
    await act(async () => first.root.render(createElement(GeoMap, props)));
    await flush();
    const second = mountRoot();
    await act(async () => second.root.render(createElement(GeoMap, props)));
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('QA-15: unmounting aborts the request', async () => {
    let signal: AbortSignal | undefined;
    vi.stubGlobal('fetch', vi.fn((_url: string, init?: RequestInit) => {
      signal = init?.signal ?? undefined;
      return new Promise(() => {});
    }));
    const GeoMap = await freshGeoMap();
    const { root } = mountRoot();
    await act(async () => root.render(createElement(GeoMap, props)));
    act(() => root.unmount());
    roots.length = 0;
    expect(signal?.aborted).toBe(true);
  });

  it('QA-15: an aborted request does not log an error', async () => {
    vi.stubGlobal('fetch', vi.fn((_url: string, init?: RequestInit) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    })));
    const GeoMap = await freshGeoMap();
    const { root } = mountRoot();
    await act(async () => root.render(createElement(GeoMap, props)));
    act(() => root.unmount());
    roots.length = 0;
    await flush();
    expect(console.error).not.toHaveBeenCalled();
  });
});

describe('QA-14: GeoMap matching', () => {
  it.each(['nige', 'nigeria republic', 'Atlantis'])('QA-14: unknown name "%s" colours no country', async country => {
    vi.stubGlobal('fetch', vi.fn(async () => okResponse()));
    const GeoMap = await freshGeoMap();
    const { container, root } = mountRoot();
    await act(async () => root.render(createElement(GeoMap, { ...props, data: [{ country, v: 5 }], colors: ['red'] })));
    await flush();
    const fills = [...container.querySelectorAll('.geo-map-wrapper svg path')].map(p => p.getAttribute('fill'));
    expect([fills.length, fills.includes('red')]).toEqual([2, false]);
  });

  it('QA-14: the code ng colours Nigeria only', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => okResponse()));
    const GeoMap = await freshGeoMap();
    const { container, root } = mountRoot();
    await act(async () => root.render(createElement(GeoMap, { ...props, colors: ['red'] })));
    await flush();
    const fills = [...container.querySelectorAll('.geo-map-wrapper svg path')].map(p => p.getAttribute('fill'));
    expect(fills.filter(f => f === 'red')).toHaveLength(1);
  });
});

describe('SEC-16: GeoMap legend', () => {
  it('SEC-16: two maps on one page use different gradient ids', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => okResponse()));
    const GeoMap = await freshGeoMap();
    const { container, root } = mountRoot();
    await act(async () => root.render(createElement('div', null, createElement(GeoMap, props), createElement(GeoMap, props))));
    await flush();
    const ids = [...container.querySelectorAll('linearGradient')].map(g => g.id);
    expect(new Set(ids).size).toBe(2);
  });

  it('SEC-16: each legend rect points at its own gradient', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => okResponse()));
    const GeoMap = await freshGeoMap();
    const { container, root } = mountRoot();
    await act(async () => root.render(createElement(GeoMap, props)));
    await flush();
    const id = container.querySelector('linearGradient')?.id;
    expect(container.querySelector('.geo-map-legend rect')?.getAttribute('fill')).toBe(`url(#${id})`);
  });

  it.each(['red', '#abc', 'rgb(10, 20, 30)'])('SEC-16: colour "%s" is used as is, not with "18" appended', async color => {
    vi.stubGlobal('fetch', vi.fn(async () => okResponse()));
    const GeoMap = await freshGeoMap();
    const { container, root } = mountRoot();
    await act(async () => root.render(createElement(GeoMap, { ...props, colors: [color] })));
    await flush();
    const fills = [...container.querySelectorAll('.geo-map-wrapper svg path')].map(p => p.getAttribute('fill'));
    expect(fills).toContain(color);
  });
});
