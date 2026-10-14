// Covers: CONF-21. The types of "./webcomponent" (src/adapters/webcomponent/global.ts) describe the
// script: the global, one typed element for every tag and the kaltura-action event. The checks
// are type assertions, so `npm run typecheck` is what fails when a type is wrong.
import { describe, it, expect, expectTypeOf } from 'vitest';
import type { ChartCoreProps } from '../../src/core/chart';
import type { PlayerCoreProps } from '../../src/core/player';
import type { KalturaActionContext } from '../../src/core/host-hooks';
import { KALTURA_WC_TAGS } from '../../src/adapters/webcomponent/host';
import { loadCatalog } from './helpers';
import '../../src/adapters/webcomponent/global';

describe('CONF-21: types of the web component script', () => {
  it('CONF-21: every tag the bundle defines has an element type', () => {
    expectTypeOf<(typeof KALTURA_WC_TAGS)[number]>().toExtend<keyof HTMLElementTagNameMap>();
    expect([...KALTURA_WC_TAGS]).toEqual((loadCatalog()['x-kaltura-adapters'] as { webcomponent: { customElements: string[] } }).webcomponent.customElements);
  });

  it('CONF-21: config is typed by the component props', () => {
    const chart = document.createElement('kaltura-chart');
    const player = document.createElement('kaltura-player');
    expectTypeOf(chart.config).toEqualTypeOf<(Partial<ChartCoreProps> & { action?: { event: { name: string } } }) | null>();
    expectTypeOf(player.config).toExtend<(Partial<PlayerCoreProps> & { action?: unknown }) | null>();
    // @ts-expect-error chartType is one of the 12 names
    chart.config = { chartType: 'nope' };
    // @ts-expect-error partnerId is a number
    player.config = { partnerId: '1' };
    expect(true).toBe(true);
  });

  it('CONF-21: the kaltura-action event carries a name and the fixed context', () => {
    const el = document.createElement('kaltura-chart');
    el.addEventListener('kaltura-action', event => {
      expectTypeOf(event.detail).toEqualTypeOf<{ name: string; context: KalturaActionContext }>();
    });
    expect(true).toBe(true);
  });

  it('CONF-21: the global holds the host options and the definers', () => {
    expectTypeOf<Window['KalturaA2UIWebComponents']['setKsProvider']>().toBeFunction();
    expectTypeOf<Window['KalturaA2UIWebComponents']['defineKalturaWebComponents']>().toEqualTypeOf<() => void>();
    expect(true).toBe(true);
  });
});
