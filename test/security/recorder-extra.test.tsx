// Covers: SEC-03 extras (invalid input, encoding, re-render, unmount).
import { describe, it, expect, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { mount } from '../helpers/render';

afterEach(() => {
  document.body.innerHTML = '';
});

async function render(props: Record<string, unknown>) {
  const { RecorderCore } = await import('../../src/core/recorder');
  const { container, root } = await mount(RecorderCore, props);
  return { container: container.querySelector('.kaltura-recorder-container') as HTMLElement, root, RecorderCore };
}

describe('SEC-03: RecorderCore input validation', () => {
  const bad: Array<[string, Record<string, unknown>]> = [
    ['string partnerId', { partnerId: '123', ks: 'k' }],
    ['partnerId with path traversal', { partnerId: '1/../evil', ks: 'k' }],
    ['zero partnerId', { partnerId: 0, ks: 'k' }],
    ['negative partnerId', { partnerId: -5, ks: 'k' }],
    ['float partnerId', { partnerId: 1.5, ks: 'k' }],
    ['NaN partnerId', { partnerId: NaN, ks: 'k' }],
    ['Infinity partnerId', { partnerId: Infinity, ks: 'k' }],
    ['unsafe-integer partnerId', { partnerId: 2 ** 60, ks: 'k' }],
    ['exponent-form partnerId string', { partnerId: '1e3', ks: 'k' }],
    ['missing partnerId', { ks: 'k' }],
    ['string uiconfId', { partnerId: 1, uiconfId: '5', ks: 'k' }],
    ['negative uiconfId', { partnerId: 1, uiconfId: -1, ks: 'k' }],
    ['float uiconfId', { partnerId: 1, uiconfId: 0.5, ks: 'k' }],
    ['null uiconfId', { partnerId: 1, uiconfId: null, ks: 'k' }],
    ['missing ks', { partnerId: 1 }],
    ['empty ks', { partnerId: 1, ks: '' }],
    ['number ks', { partnerId: 1, ks: 5 }],
    ['ks with newline', { partnerId: 1, ks: 'a\nb' }],
    ['ks with NUL', { partnerId: 1, ks: 'a\u0000b' }],
    ['ks with tab', { partnerId: 1, ks: 'a\tb' }],
    ['ks with DEL', { partnerId: 1, ks: 'a\u007fb' }],
    ['ks with C1 control', { partnerId: 1, ks: 'a\u0085b' }],
  ];

  it.each(bad)('SEC-03: %s creates no iframe and shows a plain-text error', async (_name, props) => {
    const { container } = await render(props);
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.querySelector('.kaltura-load-error')?.textContent).toContain('Failed to load recorder');
  });

  it('SEC-03: error text does not echo hostile input and adds no elements besides the box', async () => {
    const { container } = await render({ partnerId: '<img src=x onerror=1>', ks: 'k' });
    expect(container.querySelectorAll('*').length).toBe(1);
    expect(container.textContent).not.toContain('<img');
  });

  it('SEC-03: uiconfId 0 maps to uiconf_id/0', async () => {
    const a = await render({ partnerId: 1, ks: 'k', uiconfId: 0 });
    expect(a.container.querySelector('iframe')!.getAttribute('src')).toContain('/uiconf_id/0/');
  });

  it('SEC-03: valid uiconfId goes into the path', async () => {
    const { container } = await render({ partnerId: 1, ks: 'k', uiconfId: 4242 });
    expect(container.querySelector('iframe')!.getAttribute('src')).toContain('/uiconf_id/4242/');
  });

  it('SEC-03: ks with `&`, `#`, `/` and unicode stays inside the ks parameter', async () => {
    const { container } = await render({ partnerId: 1, ks: 'a&partner_id=9#x/../‮' });
    const url = new URL(container.querySelector('iframe')!.getAttribute('src')!);
    expect([url.origin, url.searchParams.get('ks'), url.searchParams.get('partner_id'), url.hash]).toEqual([
      'https://www.kaltura.com',
      'a&partner_id=9#x/../‮',
      null,
      '',
    ]);
  });

  it('SEC-03: iframe keeps sandbox, allow and title; no srcdoc', async () => {
    const { container } = await render({ partnerId: 1, ks: 'k' });
    const f = container.querySelector('iframe')!;
    expect([
      f.getAttribute('sandbox'),
      f.getAttribute('title'),
      f.hasAttribute('allowfullscreen'),
      f.hasAttribute('srcdoc'),
      f.style.cssText,
    ]).toEqual([
      'allow-scripts allow-same-origin allow-forms allow-popups allow-downloads',
      'Kaltura Recorder',
      true,
      false,
      'width: 100%; height: 100%; border: 0px;',
    ]);
  });
});

describe('SEC-03: RecorderCore lifecycle', () => {
  it('SEC-03: props change replaces the iframe, no stale iframe remains', async () => {
    const { container, root, RecorderCore } = await render({ partnerId: 1, ks: 'one' });
    await act(async () => {
      root.render(createElement(RecorderCore, { partnerId: 1, ks: 'two' }));
    });
    const frames = container.querySelectorAll('iframe');
    expect([frames.length, frames[0]?.getAttribute('src')]).toEqual([1, expect.stringContaining('ks=two')]);
  });

  it('SEC-03: valid to invalid props removes the iframe', async () => {
    const { container, root, RecorderCore } = await render({ partnerId: 1, ks: 'one' });
    await act(async () => {
      root.render(createElement(RecorderCore, { partnerId: '1', ks: 'one' } as never));
    });
    expect([container.querySelectorAll('iframe').length, container.querySelectorAll('.kaltura-load-error').length]).toEqual([0, 1]);
  });

  it('SEC-03: invalid to valid props replaces the error with the iframe', async () => {
    const { container, root, RecorderCore } = await render({ partnerId: 'x', ks: 'one' });
    await act(async () => {
      root.render(createElement(RecorderCore, { partnerId: 1, ks: 'one' }));
    });
    expect([container.querySelectorAll('iframe').length, container.querySelectorAll('.kaltura-load-error').length]).toEqual([1, 0]);
  });

  it('SEC-03: unmount removes the iframe', async () => {
    const { container, root } = await render({ partnerId: 1, ks: 'one' });
    const holder = container.parentElement!;
    await act(async () => {
      root.unmount();
    });
    expect(holder.querySelectorAll('iframe').length).toBe(0);
  });
});
