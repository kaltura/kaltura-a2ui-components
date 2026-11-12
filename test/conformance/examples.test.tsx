// Covers: T17, T21, T23. Every file in examples/a2ui/ is valid A2UI 1.0, loads in a
// MessageProcessor with the Kaltura catalog, and (unless it needs a Kaltura account)
// renders through A2uiSurface with no console error. The demo app plays these files.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { A2uiSurface, type ReactCatalogComponent } from '@a2ui/react';
import { MessageProcessor } from '@a2ui/web_core/v1_0';
import { buildKalturaCatalog, KALTURA_CATALOG_ID } from '../../src/adapters/react/index';
import { messageListValidator, kalturaNames, loadCatalog } from './helpers';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
// jsdom has no layout. The chart needs a width, so it leaves its empty state.
(globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
  constructor(private cb: (entries: unknown[]) => void) {}
  observe() {
    setTimeout(() => this.cb([{ contentRect: { width: 640, height: 300 } }]), 0);
  }
  disconnect() {}
  unobserve() {}
};

interface Example {
  name: string;
  description: string;
  exercises: string[];
  live?: boolean;
  messages: { version: string; createSurface?: { surfaceId: string; catalogId: string } }[];
  replies?: Record<string, unknown[]>;
}

const DIR = 'examples/a2ui';
const FILES = readdirSync(DIR).filter(file => file.endsWith('.json')).sort();
const load = (file: string) => JSON.parse(readFileSync(`${DIR}/${file}`, 'utf8')) as Example;
const validateList = messageListValidator();
const asList = (messages: unknown) => [validateList(messages), validateList.errors ?? []] as const;

describe('T17: examples/a2ui files', () => {
  it('T17: there are examples', () => {
    expect(FILES.length).toBeGreaterThanOrEqual(5);
  });

  it.each(FILES)('T17: %s has a name, a description and what it exercises', file => {
    const { name, description, exercises } = load(file);
    expect([typeof name, typeof description, Array.isArray(exercises) && exercises.length > 0]).toEqual(['string', 'string', true]);
  });

  it.each(FILES)('T17: %s messages are valid A2UI 1.0 for the Kaltura catalog', file => {
    expect(asList(load(file).messages)).toEqual([true, []]);
  });

  it.each(FILES)('T17: %s replies are valid A2UI 1.0', file => {
    const replies = Object.values(load(file).replies ?? {});
    expect(replies.map(asList).filter(([ok]) => !ok)).toEqual([]);
  });

  it.each(FILES)('T17: %s uses the v3 catalog id on its surface', file => {
    expect(load(file).messages[0].createSurface?.catalogId).toBe(KALTURA_CATALOG_ID);
  });

  it.each(FILES)('T17: %s loads in a MessageProcessor, and every reply applies to its surface', file => {
    const example = load(file);
    const processor = new MessageProcessor<ReactCatalogComponent>([buildKalturaCatalog()]);
    processor.processMessages(example.messages as never);
    for (const reply of Object.values(example.replies ?? {})) processor.processMessages(reply as never);
    expect(processor.model.getSurface(example.messages[0].createSurface?.surfaceId ?? '')).toBeDefined();
  });

  it('T17: every Kaltura component has an example', () => {
    const catalogNames = kalturaNames(loadCatalog());
    const used = new Set(FILES.flatMap(file => load(file).exercises));
    expect(catalogNames.filter(name => !used.has(name))).toEqual([]);
  });
});

describe('T17: offline examples render through A2uiSurface', () => {
  let host: HTMLElement;
  let root: Root;
  let errors: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    host = document.body.appendChild(document.createElement('div'));
    root = createRoot(host);
  });
  afterEach(() => {
    act(() => root.unmount());
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  const offline = FILES.filter(file => !load(file).live && !load(file).exercises.includes('allowlist'));

  it.each(offline)('T17: %s renders with no console error', async file => {
    const example = load(file);
    const processor = new MessageProcessor<ReactCatalogComponent>([buildKalturaCatalog()]);
    processor.processMessages(example.messages as never);
    const surface = processor.model.getSurface(example.messages[0].createSurface?.surfaceId ?? '');
    await act(async () => root.render(createElement(A2uiSurface, { surface: surface as never })));
    expect([(host.textContent?.length ?? 0) > 0, errors.mock.calls.map((call: unknown[]) => call.map(String).join(" ").slice(0, 400))]).toEqual([true, []]);
  });
});
