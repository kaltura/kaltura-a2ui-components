// Covers: SEC-05 (a KS in agent output or the data model), plus the serverUrl example fix from 1.2.
// Plan items 1.6b and 3.1: ks is an optional DynamicString, the host supplies it and agents never set it.
import { describe, it, expect } from 'vitest';
import catalog from '../../src/catalog/kaltura_catalog.json';
import { deriveLoaderUrl } from '../../src/core/unisphere-loader';
import { KalturaPlayerApi } from '../../src/schemas/player';
import { KalturaFlashcardsApi } from '../../src/schemas/flashcards';
import { KalturaMediaManagerApi } from '../../src/schemas/media-manager';
import { KalturaAnalyticsApi } from '../../src/schemas/analytics';
import { KalturaCaptionsEditorApi } from '../../src/schemas/captions-editor';
import { KalturaRecorderApi } from '../../src/schemas/recorder';
import { KalturaGenieApi } from '../../src/schemas/genie';
import { KalturaContentLabApi } from '../../src/schemas/content-lab';
import { KalturaAgentsWidgetApi } from '../../src/schemas/agents-widget';
import { KalturaVodAvatarApi } from '../../src/schemas/vod-avatar';

const WITH_KS = [
  KalturaPlayerApi,
  KalturaFlashcardsApi,
  KalturaMediaManagerApi,
  KalturaAnalyticsApi,
  KalturaCaptionsEditorApi,
  KalturaRecorderApi,
  KalturaGenieApi,
  KalturaContentLabApi,
  KalturaAgentsWidgetApi,
  KalturaVodAvatarApi,
] as const;

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

type Field = { safeParse(v: unknown): { success: boolean } };

describe('SEC-05: ks is optional in every schema', () => {
  it.each(WITH_KS.map(api => [api.name, api] as const))('SEC-05: %s accepts a component without ks', (_name, api) => {
    expect((api.schema.shape as Record<string, Field>).ks.safeParse(undefined).success).toBe(true);
  });

  it.each(WITH_KS.map(api => [api.name, api] as const))('SEC-05: %s ks still takes a binding, for older hosts', (_name, api) => {
    expect((api.schema.shape as Record<string, Field>).ks.safeParse({ path: '/session/ks' }).success).toBe(true);
  });

  it.each(Object.keys(catalog.components))('SEC-05: catalog %s does not require ks', name => {
    const component = (catalog.components as unknown as Record<string, Component>)[name];
    expect(component.allOf.flatMap(part => part.required ?? [])).not.toContain('ks');
  });
});

describe('SEC-05: catalog ks descriptions', () => {
  const ksDescriptions = withProp('ks');

  it('SEC-05: the catalog documents ks for the components that take one', () => {
    expect(ksDescriptions.length).toBeGreaterThanOrEqual(9);
  });

  it.each(ksDescriptions)('SEC-05: %s says the host supplies ks and agents never set or ask for it', (_name, description) => {
    expect([
      description.includes('The host supplies it'),
      description.includes('Agents must never set this prop or ask for a KS'),
      description.includes('/session/ks'),
    ]).toEqual([true, true, false]);
  });

  it.each(ksDescriptions.filter(([name]) => name !== 'KalturaAnalytics'))(
    'SEC-05: %s asks for a USER KS and does not mention ADMIN',
    (_name, description) => {
      expect([description.includes('USER KS'), /ADMIN/.test(description)]).toEqual([true, false]);
    },
  );

  it('SEC-05: Media Manager no longer asks for an ADMIN KS in manage mode', () => {
    expect(catalogProps('KalturaMediaManager').ks.description).not.toMatch(/ADMIN|type=2|manage mode/);
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
