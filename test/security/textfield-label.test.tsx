// Covers: the basic TextField label and Slider label name their input. The 1.0 element renders a
// <label> with no `for`, so a screen reader announces an unnamed field (axe: label, critical).
import { describe, it, expect, afterEach } from 'vitest';
import { act } from 'react';
import { kalturaReactCatalog } from '../../src/adapters/react/index';
import { renderSurface } from './surface-helper';

let mounted: Array<{ root: { unmount(): void } }> = [];

afterEach(() => {
  for (const m of mounted) act(() => m.root.unmount());
  mounted = [];
  document.body.innerHTML = '';
});

async function show(extra: Record<string, unknown>) {
  const view = await renderSurface(kalturaReactCatalog, [{ id: 'root', component: 'TextField', label: 'Search for', value: '', ...extra }]);
  mounted.push(view);
  await act(async () => new Promise(r => setTimeout(r, 20)));
  return view.host;
}

describe('TextField label', () => {
  it('ties the label to a single-line input', async () => {
    const host = await show({});
    const input = host.querySelector('input');
    expect([input?.id !== '', host.querySelector('label')?.htmlFor === input?.id]).toEqual([true, true]);
  });

  it('ties the label to a long-text textarea', async () => {
    const host = await show({ variant: 'longText' });
    const area = host.querySelector('textarea');
    expect([area?.id !== '', host.querySelector('label')?.htmlFor === area?.id]).toEqual([true, true]);
  });

  it('gives two fields different ids', async () => {
    const view = await renderSurface(kalturaReactCatalog, [
      { id: 'root', component: 'Column', children: ['a', 'b'] },
      { id: 'a', component: 'TextField', label: 'A', value: '' },
      { id: 'b', component: 'TextField', label: 'B', value: '' },
    ]);
    mounted.push(view);
    await act(async () => new Promise(r => setTimeout(r, 20)));
    const ids = [...view.host.querySelectorAll('input')].map(i => i.id);
    expect([ids.length, new Set(ids).size]).toEqual([2, 2]);
  });
});

describe('Slider label', () => {
  it('names the range input with the label text', async () => {
    const view = await renderSurface(kalturaReactCatalog, [{ id: 'root', component: 'Slider', label: 'Rating', min: 1, max: 5, value: 3 }]);
    mounted.push(view);
    await act(async () => new Promise(r => setTimeout(r, 20)));
    const text = view.host.querySelector('.a2ui-slider-label');
    const range = view.host.querySelector('input');
    expect([text?.id !== '', range?.getAttribute('aria-labelledby') === text?.id]).toEqual([true, true]);
  });
});
