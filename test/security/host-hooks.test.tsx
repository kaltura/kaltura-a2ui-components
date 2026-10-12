// Covers: plan item 3.3e (typed error states with codes, setErrorHandler and setEventHandler).
// Every code is reachable, a throwing handler does not break rendering, and no
// payload holds a prop value, a remote error text or the KS.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, createElement } from 'react';
import { URL_A, loaderUrl, render, fakeWorkspaceModule, type MountedVisual } from '../lifecycle/harness';
import type { KalturaError, KalturaEvent } from '../../src/core/host-hooks';

const KS = 'SECRET_KS_VALUE';
const HOSTILE = '<img src=x onerror=alert(1)>HOSTILE_MARKER';
const ALL_CODES = ['invalid-props', 'invalid-ks', 'origin-not-allowed', 'load-failed', 'url-rejected', 'render-failed'];

let errors: KalturaError[];

beforeEach(() => {
  vi.resetModules();
  errors = [];
});
afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

/** Imports fresh modules after resetModules and sets the error handler on the same copy. */
async function hooks() {
  const mod = await import('../../src/core/host-hooks');
  mod.setErrorHandler(e => errors.push(e));
  return mod;
}

function loaderModule(mock: Record<string, unknown>) {
  vi.doMock(loaderUrl(URL_A), () => mock);
}

/** One case per code. Each returns the props it used, for the leak check. */
const CASES: Record<string, () => Promise<Record<string, unknown>>> = {
  'invalid-props': async () => {
    const { PlayerCore } = await import('../../src/core/player');
    const props = { partnerId: 1, uiconfId: 2, entryId: HOSTILE, ks: KS };
    await render(PlayerCore, props);
    return props;
  },
  'invalid-ks': async () => {
    const { AnalyticsCore } = await import('../../src/core/analytics');
    const props = { partnerId: 1, ks: `${KS}\u0001${HOSTILE}` };
    await render(AnalyticsCore, props);
    return props;
  },
  'origin-not-allowed': async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { GenieCore } = await import('../../src/core/genie');
    const props = { partnerId: 1, ks: KS, serverUrl: `https://evil.invalid/${HOSTILE}` };
    await render(GenieCore, props);
    return props;
  },
  'load-failed': async () => {
    loaderModule({
      get loader() {
        throw new Error(`remote said ${HOSTILE} ${KS}`);
      },
    });
    const { GenieCore } = await import('../../src/core/genie');
    const props = { partnerId: 1, ks: KS, serverUrl: URL_A };
    await render(GenieCore, props);
    return props;
  },
  'url-rejected': async () => {
    const { buildKalturaCatalog } = await import('../../src/adapters/react/index');
    const { renderSurface } = await import('./surface-helper');
    const url = `https://evil.invalid/x.png?ks=${KS}&m=${HOSTILE}`;
    const { root } = await renderSurface(buildKalturaCatalog(), [{ id: 'root', component: 'Image', url }]);
    act(() => root.unmount());
    return { url };
  },
  'render-failed': async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { ChartErrorBoundary } = await import('../../src/core/charts/ChartErrorBoundary');
    const Boom = () => {
      throw new Error(`data ${HOSTILE} ${KS}`);
    };
    await render(ChartErrorBoundary, { children: createElement(Boom) });
    return {};
  },
};

describe('3.3e: setErrorHandler gets a typed error for each error state', () => {
  it('3.3e: the case list covers every code', () => {
    expect(Object.keys(CASES).sort()).toEqual([...ALL_CODES].sort());
  });

  it.each(Object.keys(CASES))('3.3e: %s is reported with its code', async code => {
    await hooks();
    await CASES[code]();
    expect(errors.map(e => e.code)).toContain(code);
  });

  it.each(Object.keys(CASES))('3.3e: %s payload holds no prop value, remote text or KS', async code => {
    await hooks();
    await CASES[code]();
    const text = JSON.stringify(errors);
    expect([text.includes(KS), text.includes('HOSTILE_MARKER'), text.includes('evil.invalid'), errors.length > 0]).toEqual([
      false,
      false,
      false,
      true,
    ]);
  });

  it('3.3e: an invalid prop names the widget and the prop', async () => {
    await hooks();
    await CASES['invalid-props']();
    expect(errors).toEqual([{ code: 'invalid-props', widget: 'player', message: 'Failed to load player: Invalid entryId' }]);
  });

  it('3.3e: a bad recorder ks is reported as invalid-ks', async () => {
    await hooks();
    const { RecorderCore } = await import('../../src/core/recorder');
    await render(RecorderCore, { partnerId: 1, ks: '' });
    expect(errors).toEqual([{ code: 'invalid-ks', widget: 'recorder', message: 'Failed to load recorder: Invalid ks' }]);
  });

  it('3.3e: a missing createWorkspace export is load-failed for media-manager', async () => {
    await hooks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    loaderModule({ createWorkspace: undefined });
    const { MediaManagerCore } = await import('../../src/core/media-manager');
    await render(MediaManagerCore, { partnerId: 1, ks: KS, serverUrl: URL_A });
    expect(errors).toEqual([
      { code: 'load-failed', widget: 'media-manager', message: 'Failed to load Media Manager: Unisphere createWorkspace is missing' },
    ]);
  });

  it('3.3e: a remote load error is reported without its text', async () => {
    await hooks();
    await CASES['load-failed']();
    expect(errors).toEqual([{ code: 'load-failed', widget: 'genie', message: 'Failed to load Kaltura Genie' }]);
  });

  it('3.3e: a throwing error handler does not break the error state', async () => {
    const { setErrorHandler } = await import('../../src/core/host-hooks');
    setErrorHandler(() => {
      throw new Error('host bug');
    });
    const { PlayerCore } = await import('../../src/core/player');
    const view = await render(PlayerCore, { partnerId: 'x', uiconfId: 2, entryId: '0_a' });
    expect(view.container.querySelector('[role=alert]')?.textContent).toBe('Failed to load player: Invalid partnerId');
  });

  it('3.3e: a throwing error handler does not break a load error', async () => {
    const { setErrorHandler } = await import('../../src/core/host-hooks');
    setErrorHandler(() => {
      throw new Error('host bug');
    });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { GenieCore } = await import('../../src/core/genie');
    const view = await render(GenieCore, { partnerId: 1, ks: KS, serverUrl: 'https://evil.invalid/v1' });
    expect(view.container.querySelector('[role=alert]')?.textContent).toBe(
      'Failed to load Kaltura Genie: serverUrl is not an allowed Unisphere origin',
    );
  });

  it('3.3e: a valid widget reports nothing', async () => {
    await hooks();
    const { PlayerCore } = await import('../../src/core/player');
    await render(PlayerCore, { partnerId: 1, uiconfId: 2, entryId: '0_a' });
    expect(errors).toEqual([]);
  });

  it('3.3e: setErrorHandler(undefined) removes the handler', async () => {
    const mod = await hooks();
    mod.setErrorHandler(undefined);
    await CASES['invalid-props']();
    expect(errors).toEqual([]);
  });
});

describe('3.3e: setEventHandler gets the Media Manager selection', () => {
  async function selectFromManager(onEvent: (e: KalturaEvent) => void) {
    const visuals: MountedVisual[] = [];
    loaderModule(fakeWorkspaceModule({ log: [], configs: [], visuals }));
    const { setEventHandler } = await import('../../src/core/host-hooks');
    setEventHandler(onEvent);
    const { MediaManagerCore } = await import('../../src/core/media-manager');
    const view = await render(MediaManagerCore, { partnerId: 1, ks: KS, serverUrl: URL_A });
    const buttons = (visuals[0].settings.rowActions as { buttons: { onClick(r: unknown): void }[] }).buttons;
    return { view, select: (row: unknown) => act(() => buttons[0].onClick(row)) };
  }

  it('3.3e: a selected row calls the event handler with the DOM event detail', async () => {
    const events: KalturaEvent[] = [];
    const { select } = await selectFromManager(e => events.push(e));
    select({ id: '0_abc', name: 'Intro' });
    expect(events).toEqual([
      {
        type: 'entry-selected',
        widget: 'media-manager',
        detail: { entryId: '0_abc', name: 'Intro', instanceId: expect.stringMatching(/^unisphere-mm-/) },
      },
    ]);
  });

  it('3.3e: a throwing event handler does not stop the DOM event', async () => {
    const { view, select } = await selectFromManager(() => {
      throw new Error('host bug');
    });
    const seen: Event[] = [];
    view.container.addEventListener('kaltura-entry-selected', e => seen.push(e));
    select({ id: '0_abc', name: 'Intro' });
    expect(seen).toHaveLength(1);
  });
});
