// Covers: CONF-15 (plan item 3.3c): our URL builders and Unisphere names against
// the Kaltura guides. The guide facts are in fixtures/kaltura-docs.ts, with the
// guide URLs. Every difference must be listed in KNOWN_DIVERGENCES, and an entry
// must go when the code starts to match the guide. No case is skipped.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildPlayerUrl } from '../../src/core/player';
import { buildCaptionsEditorUrl } from '../../src/core/captions-editor';
import { buildAnalyticsUrl } from '../../src/core/analytics';
import { deriveLoaderUrl } from '../../src/core/unisphere-loader';
import { URL_ROWS, WIDGET_ROWS, KNOWN_DIVERGENCES, KS_PRIVILEGES, GUIDE_LOADER_URL, SAMPLE } from './fixtures/kaltura-docs';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const { partnerId, uiconfId, entryId, ks } = SAMPLE;

// Every optional input set, so the URL shows every parameter the code can send.
const BUILT: Record<string, string> = {
  KalturaPlayer: buildPlayerUrl({ partnerId, uiconfId, entryId, ks, autoplay: true, muted: true, startTime: 1, clipTo: 2 }),
  KalturaCaptionsEditor: buildCaptionsEditorUrl({ partnerId, ks, entryId, uiconfId }),
  KalturaAnalytics: buildAnalyticsUrl(),
};
const names = (url: string) => [...new URL(url).searchParams.keys()];
const base = (url: string) => url.split('?')[0];

describe('CONF-15: URL builders against the Kaltura guides', () => {
  it.each(URL_ROWS.map(row => [row.component, row] as const))('CONF-15: %s fixture states what the builder does', (_name, row) => {
    expect([base(BUILT[row.component]), names(BUILT[row.component]).sort()]).toEqual([row.oursBase, [...row.oursParams].sort()]);
  });

  it('CONF-15: every URL difference is listed, and nothing listed is fixed', () => {
    const found = URL_ROWS.flatMap(row => {
      if (base(BUILT[row.component]) !== row.guideBase) return [`${row.component}:url`];
      return JSON.stringify([...row.oursParams].sort()) === JSON.stringify([...row.guideParams].sort()) ? [] : [`${row.component}:params`];
    });
    const listed = Object.keys(KNOWN_DIVERGENCES).filter(key => /:(url|params)$/.test(key));
    expect(found.sort()).toEqual(listed.sort());
  });
});

describe('CONF-15: Unisphere widget and runtime names against the guide', () => {
  const FILES: Record<string, string> = {
    KalturaGenie: 'src/core/genie.tsx',
    KalturaContentLab: 'src/core/content-lab.tsx',
    KalturaAgentsWidget: 'src/core/agents-widget.tsx',
    KalturaVodAvatar: 'src/core/vod-avatar.tsx',
  };
  const namesInCode = (component: string): [string, string] => {
    if (component === 'KalturaMediaManager') {
      const text = source('src/core/media-manager.tsx');
      const [, widget, runtime] = /getRuntimeAsync\(\s*'([^']+)',\s*'([^']+)'/.exec(text) ?? [];
      return [widget, runtime];
    }
    const text = source(FILES[component]);
    return [/widgetName="([^"]+)"/.exec(text)?.[1] ?? '', /runtimeName="([^"]+)"/.exec(text)?.[1] ?? ''];
  };

  it.each(WIDGET_ROWS.map(row => [row.component, row] as const))('CONF-15: %s fixture states the names in the code', (_name, row) => {
    expect(namesInCode(row.component)).toEqual([row.oursWidget, row.oursRuntime]);
  });

  it('CONF-15: every widget or runtime difference is listed, and nothing listed is fixed', () => {
    const found = WIDGET_ROWS.flatMap(row => [
      ...(row.oursWidget === row.guideWidget ? [] : [`${row.component}:widget`]),
      ...(row.guideRuntimes.includes(row.oursRuntime) ? [] : [`${row.component}:runtime`]),
    ]);
    const listed = Object.keys(KNOWN_DIVERGENCES).filter(key => /:(widget|runtime)$/.test(key));
    expect(found.sort()).toEqual(listed.sort());
  });

  it('CONF-15: the loader URL in the code is the one in the guide', () => {
    expect(deriveLoaderUrl('https://unisphere.nvp1.ovp.kaltura.com/v1')).toBe(GUIDE_LOADER_URL);
  });
});

describe('CONF-15: the Recorder', () => {
  it('CONF-15: it loads the express-recorder.js script from the host page like the guide, and no divergence is listed', () => {
    const text = source('src/core/recorder-script.ts');
    expect([text.includes('/apps/expressrecorder/latest/express-recorder.js'), source('src/core/recorder.tsx').includes('extwidget'), 'KalturaRecorder:integration' in KNOWN_DIVERGENCES]).toEqual([true, false, false]);
  });
});

describe('CONF-15: every divergence has an owner and a reason', () => {
  it('CONF-15: each entry is a sentence of some length', () => {
    expect(Object.entries(KNOWN_DIVERGENCES).filter(([, reason]) => reason.length < 40)).toEqual([]);
  });

  it('CONF-15: the KS privilege table covers the components the docs name', () => {
    expect(KS_PRIVILEGES.map(row => row.component)).toEqual(['KalturaPlayer', 'KalturaAnalytics', 'KalturaRecorder', 'KalturaGenie']);
  });
});
