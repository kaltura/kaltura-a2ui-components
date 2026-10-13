// Shared table for QA-18: one entry per Kaltura component. The core, web component
// and A2UI surface tests all run the same three checks on it:
// happy render, hostile input, unmount cleanup.
import { vi, expect } from 'vitest';
import { act, type ComponentType } from 'react';
import { setKsProvider } from '../../src/core/ks';

export const URL_A = 'https://unisphere.nvp1.ovp.kaltura.com/v1';
export const LOADER_URL = 'https://unisphere.nvp1.ovp.kaltura.com/v1/loader/index.esm.js';
export const PAYLOAD = '<img src=x onerror="window.__pwned=1">';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
  observe() {}
  disconnect() {}
  unobserve() {}
};

/** What the fake Unisphere remote did, and how it should fail. */
export const remote = { log: [] as string[], failWith: null as string | null };

const workspace = (name: string) => ({
  kill: () => remote.log.push(`kill ${name}`),
  getRuntimeAsync: async () => ({
    mountVisual: async () => 'visual-1',
    unmountVisual: () => remote.log.push('unmount visual'),
  }),
});

/** Fake module served for the allowed Unisphere loader URL. Call before importing a core. */
export function installRemote(): void {
  vi.doMock(LOADER_URL, () => ({
    loader: async () => {
      if (remote.failWith !== null) throw new Error(remote.failWith);
      remote.log.push('loader');
      return workspace('loader');
    },
    createWorkspace: async () => {
      if (remote.failWith !== null) throw new Error(remote.failWith);
      remote.log.push('create');
      return workspace('workspace');
    },
    // The avatar uses the embeds API.
    embeds: {
      workspace: async () => {
        if (remote.failWith !== null) throw new Error(remote.failWith);
        remote.log.push('embeds workspace');
        return {
          apis: {
            genieAvatar: {
              contained: () => {
                remote.log.push('contained');
                return { remove: () => remote.log.push('remove') };
              },
            },
          },
          destroy: () => remote.log.push('destroy'),
        };
      },
    },
  }));
}

export function resetFakes(): void {
  remote.log = [];
  remote.failWith = null;
  // The avatar takes its KS from the provider only. The others fall back to their ks prop.
  setKsProvider(widget => (widget === 'avatar' ? 'ks-1' : undefined));
  delete (window as { __pwned?: unknown }).__pwned;
}

/** Lets pending loads finish. */
export async function settle(): Promise<void> {
  await act(async () => {
    await new Promise(r => setTimeout(r, 30));
  });
}

/** Nothing from the hostile payload became live markup or ran. */
export function expectInert(el: Element): void {
  expect(el.querySelector('script,[onerror],[onload],[onclick],img[src="x"]')).toBeNull();
  expect((window as { __pwned?: unknown }).__pwned).toBeUndefined();
  // Hostile text never reaches an iframe URL raw. Every iframe is sandboxed except
  // the player and clip ones (a sandbox breaks downloads and Cast/Presentation).
  const frames = [...el.querySelectorAll('iframe')];
  const unsandboxed = (f: Element) => f.matches('.flashcard-clip-player') || !!f.closest('.kaltura-player-container');
  expect(frames.map(f => [/[<"\s]/.test(f.getAttribute('src') ?? ''), f.hasAttribute('sandbox') !== unsandboxed(f)])).toEqual(
    frames.map(() => [false, true]),
  );
}

const ok = { partnerId: 1, ks: 'ks-1', serverUrl: URL_A };
const badServer = { partnerId: 1, ks: 'ks-1', serverUrl: 'https://evil.example/v1' };
const rows = [
  { name: 'a', value: 1 },
  { name: 'b', value: 3 },
];

export interface Case {
  /** Name used in test titles. */
  name: string;
  /** Custom element tag. */
  tag: string;
  /** Catalog name for the A2UI surface. */
  component: string;
  /** Loads the core component. */
  load: () => Promise<ComponentType<never>>;
  valid: Record<string, unknown>;
  /** Fails validation: must give one plain-text alert. */
  invalid: Record<string, unknown>;
  /** Valid, with hostile text where the component takes free text or URLs. */
  hostile: Record<string, unknown>;
  /** Hostile text from the remote side (Unisphere error message). */
  remoteFailure?: boolean;
  /** The happy render is on screen. */
  happy: (el: HTMLElement) => void;
  /** What the component did outside the DOM after the happy render. */
  effect?: () => void;
  /** The component fills its wrapper from an effect, so unmount must empty it. */
  clearsWrapper?: boolean;
  /** What must be true after unmount. */
  afterUnmount?: () => void;
}

const iframeSrc = (el: HTMLElement) => el.querySelector('iframe')?.getAttribute('src') ?? '';

const widget = (
  name: string,
  tag: string,
  component: string,
  load: () => Promise<ComponentType<never>>,
  extra: Record<string, unknown> = {},
  kind: 'loader' | 'workspace' = 'loader',
): Case => ({
  name,
  tag,
  component,
  load,
  valid: { ...ok, ...extra },
  invalid: { ...badServer, ...extra },
  hostile: { ...ok, ...extra },
  remoteFailure: true,
  happy: el => expect(el.querySelector('div[id^="unisphere-"]')).not.toBeNull(),
  effect: () => expect(remote.log).toEqual([kind === 'loader' ? 'loader' : 'create']),
  afterUnmount: () =>
    expect(remote.log).toEqual(
      kind === 'loader' ? ['loader', 'kill loader'] : ['create', 'unmount visual', 'kill workspace'],
    ),
});

export const CASES: Case[] = [
  {
    name: 'player',
    tag: 'kaltura-player',
    component: 'KalturaPlayer',
    load: async () => (await import('../../src/core/player')).PlayerCore as ComponentType<never>,
    valid: { partnerId: 1, uiconfId: 2, entryId: '0_abc' },
    invalid: { partnerId: 1, uiconfId: 2, entryId: PAYLOAD },
    hostile: { partnerId: 1, uiconfId: 2, entryId: '0_abc', entryName: PAYLOAD, entryDescription: PAYLOAD },
    happy: el => expect(iframeSrc(el)).toContain('/partner_id/1/uiconf_id/2'),
  },
  {
    name: 'flashcards',
    tag: 'kaltura-flashcards',
    component: 'KalturaFlashcards',
    load: async () => (await import('../../src/core/flashcards')).FlashcardsCore as ComponentType<never>,
    valid: { title: 'Deck', cards: [{ title: 'Card one', content: 'Body' }] },
    invalid: { title: 'Deck', cards: 'not-a-list' },
    hostile: { title: PAYLOAD, summary: PAYLOAD, cards: [{ title: PAYLOAD, subtitle: PAYLOAD, content: PAYLOAD }] },
    happy: el => expect(el.textContent).toContain('Deck'),
  },
  widget('media manager', 'kaltura-media-manager', 'KalturaMediaManager', async () => (await import('../../src/core/media-manager')).MediaManagerCore as ComponentType<never>, {}, 'workspace'),
  {
    name: 'analytics',
    tag: 'kaltura-analytics',
    component: 'KalturaAnalytics',
    load: async () => (await import('../../src/core/analytics')).AnalyticsCore as ComponentType<never>,
    valid: { partnerId: 1, ks: 'ks-1' },
    invalid: { partnerId: 1, ks: 'ks-1', entryId: PAYLOAD },
    hostile: { partnerId: 1, ks: 'ks-1', reportType: PAYLOAD, fromDate: PAYLOAD, toDate: PAYLOAD },
    happy: el => expect(iframeSrc(el)).toContain('partnerId=1'),
  },
  {
    name: 'captions editor',
    tag: 'kaltura-captions-editor',
    component: 'KalturaCaptionsEditor',
    load: async () => (await import('../../src/core/captions-editor')).CaptionsEditorCore as ComponentType<never>,
    valid: { partnerId: 1, ks: 'ks-1', entryId: '0_abc' },
    invalid: { partnerId: 1, ks: 'ks-1', entryId: PAYLOAD },
    hostile: { partnerId: 1, ks: PAYLOAD, entryId: '0_abc' },
    happy: el => expect(iframeSrc(el)).toContain('entryid=0_abc'),
  },
  {
    name: 'recorder',
    tag: 'kaltura-recorder',
    component: 'KalturaRecorder',
    load: async () => (await import('../../src/core/recorder')).RecorderCore as ComponentType<never>,
    valid: { partnerId: 1, ks: 'ks-1' },
    invalid: { partnerId: -1, ks: 'ks-1' },
    hostile: { partnerId: 1, ks: PAYLOAD },
    clearsWrapper: true,
    happy: el => expect(iframeSrc(el)).toContain('/partner_id/1/'),
  },
  {
    name: 'avatar',
    tag: 'kaltura-avatar',
    component: 'KalturaAvatar',
    load: async () => (await import('../../src/core/avatar')).AvatarCore as ComponentType<never>,
    valid: { partnerId: 1, serverUrl: URL_A },
    invalid: { partnerId: 1, serverUrl: URL_A, theme: 'custom' },
    hostile: { partnerId: 1, serverUrl: URL_A, openingPhrase: PAYLOAD },
    // Remote error text is replaced by fixed text: test/security/avatar.test.tsx.
    clearsWrapper: true,
    happy: el => expect(el.querySelector('div[id^="kaltura-avatar-"]')).not.toBeNull(),
    effect: () => expect(remote.log).toEqual(['embeds workspace', 'contained']),
    afterUnmount: () => expect(remote.log).toEqual(['embeds workspace', 'contained', 'remove', 'destroy']),
  },
  widget('genie', 'kaltura-genie-widget', 'KalturaGenie', async () => (await import('../../src/core/genie')).GenieCore as ComponentType<never>),
  widget('content lab', 'kaltura-content-lab', 'KalturaContentLab', async () => (await import('../../src/core/content-lab')).ContentLabCore as ComponentType<never>),
  widget('agents widget', 'kaltura-agents-widget', 'KalturaAgentsWidget', async () => (await import('../../src/core/agents-widget')).AgentsWidgetCore as ComponentType<never>),
  widget('vod avatar', 'kaltura-vod-avatar-wc', 'KalturaVodAvatar', async () => (await import('../../src/core/vod-avatar')).VodAvatarCore as ComponentType<never>, { entryId: '0_abc' }),
  {
    name: 'chart',
    tag: 'kaltura-chart',
    component: 'KalturaChart',
    load: async () => (await import('../../src/core/chart')).ChartCore as ComponentType<never>,
    valid: { chartType: 'bar', data: rows, xKey: 'name', yKeys: ['value'], title: 'Visits' },
    invalid: { chartType: 'bar', data: 'not-rows' },
    hostile: { chartType: 'pie', data: [{ name: PAYLOAD, value: 2 }], xKey: 'name', yKeys: ['value'], title: PAYLOAD, xLabel: PAYLOAD, yLabel: PAYLOAD },
    happy: el => expect(el.querySelector('h4.kaltura-chart-title')?.textContent).toBe('Visits'),
  },
];
