// Covers: SEC-05 (a KS in agent output or the data model) and the serverUrl catalog example.
// Agents have no ks prop. The host supplies the KS with setKsProvider.
import { describe, it, expect } from 'vitest';
import catalog from '../../src/catalog/kaltura_catalog.json';
import { deriveLoaderUrl } from '../../src/core/unisphere-loader';
import { KalturaPlayerApi } from '../../src/schemas/player';
import { KalturaFlashcardsApi } from '../../src/schemas/flashcards';
import { KalturaMediaManagerApi } from '../../src/schemas/media-manager';
import { KalturaCaptionsEditorApi } from '../../src/schemas/captions-editor';
import { KalturaRecorderApi } from '../../src/schemas/recorder';
import { KalturaGenieApi } from '../../src/schemas/genie';
import { KalturaContentLabApi } from '../../src/schemas/content-lab';
import { KalturaAgentsWidgetApi } from '../../src/schemas/agents-widget';
import { KalturaVodAvatarApi } from '../../src/schemas/vod-avatar';
import { KalturaAnalyticsApi } from '../../src/schemas/analytics';
import { KalturaAvatarApi } from '../../src/schemas/avatar';
import { KalturaChartApi } from '../../src/schemas/chart';

const ALL_APIS = {
  KalturaPlayer: KalturaPlayerApi,
  KalturaFlashcards: KalturaFlashcardsApi,
  KalturaMediaManager: KalturaMediaManagerApi,
  KalturaCaptionsEditor: KalturaCaptionsEditorApi,
  KalturaRecorder: KalturaRecorderApi,
  KalturaGenie: KalturaGenieApi,
  KalturaContentLab: KalturaContentLabApi,
  KalturaAgentsWidget: KalturaAgentsWidgetApi,
  KalturaVodAvatar: KalturaVodAvatarApi,
  KalturaAnalytics: KalturaAnalyticsApi,
  KalturaAvatar: KalturaAvatarApi,
  KalturaChart: KalturaChartApi,
};

type Prop = { description?: string };
type Component = { allOf: Array<{ properties?: Record<string, Prop>; required?: string[] }> };

function catalogProps(name: string): Record<string, Prop> {
  const component = (catalog.components as unknown as Record<string, Component>)[name];
  return Object.assign({}, ...component.allOf.map(part => part.properties ?? {}));
}

const withProp = (prop: string) =>
  Object.keys(catalog.components).flatMap(name => {
    const description = catalogProps(name)[prop]?.description;
    return description === undefined ? [] : [[name, description] as const];
  });

describe('SEC-05: agents have no ks prop', () => {
  it.each(Object.entries(ALL_APIS))('SEC-05: the %s schema has no ks', (_name, api) => {
    expect(Object.keys(api.schema.shape)).not.toContain('ks');
  });

  it.each(Object.keys(catalog.components).filter(name => name.startsWith('Kaltura')))('SEC-05: catalog %s has no ks', name => {
    expect(Object.keys(catalogProps(name))).not.toContain('ks');
  });
});

describe('SEC-05: catalog serverUrl examples', () => {
  const urls = withProp('serverUrl');

  it('SEC-05: the catalog documents serverUrl for the Unisphere components', () => {
    expect(urls.length).toBe(6);
  });

  it.each(urls)('SEC-05: %s example is accepted by the loader allowlist', (_name, description) => {
    const example = /e\.g\. '([^']+)'/.exec(description)?.[1] ?? '';
    expect([example, deriveLoaderUrl(example)]).toEqual([
      'https://unisphere.nvp1.ovp.kaltura.com/v1',
      'https://unisphere.nvp1.ovp.kaltura.com/v1/loader/index.esm.js',
    ]);
  });
});
