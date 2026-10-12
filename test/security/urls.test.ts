// Covers: SEC-07 (query-string injection in captions and analytics URLs),
// SEC-11 (path injection in the player URL).
import { describe, it, expect, afterEach } from 'vitest';
import { buildCaptionsEditorUrl, buildCaptionsUrl, CaptionsEditorCore } from '../../src/core/captions-editor';
import { buildAnalyticsUrl, AnalyticsCore } from '../../src/core/analytics';
import { buildPlayerUrl, PlayerCore } from '../../src/core/player';
import { mount } from '../helpers/render';

afterEach(() => {
  document.body.innerHTML = '';
});

const INJECT = 'a&serviceurl=https://evil.example&x=1#frag';
const BAD_IDS = [
  '1/../2', '1_a/../../x', '1_a?x=1', '1_a#x', '1_a b', '1_a%2e%2e', '1_a\n', '..', '', '1_a∕b',
  1, null, undefined, {}, ['1_abc'],
];
const BAD_INTS = [
  '1/../2', '123?x=1', '123#x', '123&serviceurl=https://evil.example', '12 3', '0x10', '1e3',
  0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, null, undefined, {}, [1],
];

describe('SEC-07: buildCaptionsEditorUrl', () => {
  const base = { partnerId: 123, ks: 'ks1', entryId: '1_abc123' };

  it('SEC-07: valid input keeps every parameter and origin', () => {
    const u = new URL(buildCaptionsEditorUrl({ ...base, uiconfId: 55 }));
    expect(`${u.origin}${u.pathname}`).toBe('https://www.kaltura.com/apps/captionstudio/latest/index.html');
    expect(Object.fromEntries(u.searchParams)).toEqual({
      pid: '123',
      ks: 'ks1',
      entryid: '1_abc123',
      cdnurl: 'https://cdnapisec.kaltura.com',
      serviceurl: 'https://www.kaltura.com',
      uiconfid: '55',
    });
  });

  it('SEC-07: omits uiconfid when not given', () => {
    expect(new URL(buildCaptionsEditorUrl(base)).searchParams.has('uiconfid')).toBe(false);
  });

  it('SEC-07: buildCaptionsUrl is the same builder', () => {
    expect(buildCaptionsUrl(base)).toBe(buildCaptionsEditorUrl(base));
  });

  it('SEC-07: serviceurl appears exactly once with the fixed value', () => {
    const u = new URL(buildCaptionsEditorUrl({ ...base, uiconfId: 55 }));
    expect(u.searchParams.getAll('serviceurl')).toEqual(['https://www.kaltura.com']);
  });

  it('SEC-07: hostile ks stays inside the ks value, percent-encoded', () => {
    const url = buildCaptionsEditorUrl({ ...base, ks: INJECT });
    const u = new URL(url);
    expect(u.searchParams.getAll('serviceurl').length).toBe(1);
    expect(u.searchParams.get('ks')).toBe(INJECT);
    expect(url).toContain('ks=a%26serviceurl%3Dhttps%3A%2F%2Fevil.example%26x%3D1%23frag');
    expect(u.hash).toBe('');
  });

  it.each(BAD_INTS.map(v => [v]))('SEC-07: rejects partnerId %j', (v) => {
    expect(() => buildCaptionsEditorUrl({ ...base, partnerId: v as number })).toThrow(/partnerId/);
  });

  it.each(BAD_INTS.filter(v => v != null).map(v => [v]))('SEC-07: rejects uiconfId %j', (v) => {
    expect(() => buildCaptionsEditorUrl({ ...base, uiconfId: v as number })).toThrow(/uiconfId/);
  });

  it.each(BAD_IDS.map(v => [v]))('SEC-07: rejects entryId %j', (v) => {
    expect(() => buildCaptionsEditorUrl({ ...base, entryId: v as string })).toThrow(/entryId/);
  });

  it('SEC-07: component shows a plain-text error and no iframe for bad input', async () => {
    const { container } = await mount(CaptionsEditorCore, {
      partnerId: '123&serviceurl=https://evil.example',
      ks: 'k',
      entryId: '1_abc',
    });
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.textContent).toContain('Invalid partnerId');
    expect(container.querySelectorAll('*').length).toBe(1);
  });

  it('SEC-07: component mounts the iframe for valid input', async () => {
    const { container } = await mount(CaptionsEditorCore, { partnerId: 123, ks: 'k', entryId: '1_abc' });
    expect(container.querySelector('iframe')).not.toBeNull();
  });
});

describe('SEC-07: buildAnalyticsUrl', () => {
  const base = { partnerId: 123, ks: 'ks1' };

  it('SEC-07: valid input keeps every parameter and origin', () => {
    const u = new URL(
      buildAnalyticsUrl({ ...base, entryId: '1_abc', reportType: 'engagement', fromDate: '2026-01-01', toDate: '2026-02-01' }),
    );
    expect(`${u.origin}${u.pathname}`).toBe('https://kmc.kaltura.com/index.php/kmcng/analytics');
    expect(Object.fromEntries(u.searchParams)).toEqual({
      ks: 'ks1',
      partnerId: '123',
      entryId: '1_abc',
      reportType: 'engagement',
      fromDate: '2026-01-01',
      toDate: '2026-02-01',
    });
  });

  it('SEC-07: omits optional parameters when not given', () => {
    expect([...new URL(buildAnalyticsUrl(base)).searchParams.keys()]).toEqual(['ks', 'partnerId']);
  });

  it.each(['ks', 'reportType', 'fromDate', 'toDate'] as const)(
    'SEC-07: hostile %s cannot add or replace parameters',
    (key) => {
      const url = buildAnalyticsUrl({ ...base, [key]: INJECT });
      const u = new URL(url);
      expect(u.searchParams.get(key)).toBe(INJECT);
      expect(u.searchParams.has('serviceurl')).toBe(false);
      expect(u.searchParams.getAll('partnerId')).toEqual(['123']);
      expect(u.hash).toBe('');
    },
  );

  it.each(BAD_INTS.map(v => [v]))('SEC-07: rejects partnerId %j', (v) => {
    expect(() => buildAnalyticsUrl({ ...base, partnerId: v as number })).toThrow(/partnerId/);
  });

  it.each(BAD_IDS.filter(v => v !== '' && v != null).map(v => [v]))('SEC-07: rejects entryId %j', (v) => {
    expect(() => buildAnalyticsUrl({ ...base, entryId: v as string })).toThrow(/entryId/);
  });

  it('SEC-07: component shows a plain-text error and no iframe for bad input', async () => {
    const { container } = await mount(AnalyticsCore, { partnerId: '1&ks=x', ks: 'k' });
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.textContent).toContain('Invalid partnerId');
    expect(container.querySelectorAll('*').length).toBe(1);
  });

  it('SEC-07: component mounts the iframe for valid input', async () => {
    const { container } = await mount(AnalyticsCore, { partnerId: 123, ks: 'k' });
    expect(container.querySelector('iframe')).not.toBeNull();
  });
});

describe('SEC-11: buildPlayerUrl', () => {
  const base = { partnerId: 123, uiconfId: 456, entryId: '1_abc123' };

  it('SEC-11: valid input gives the same URL as before', () => {
    expect(buildPlayerUrl(base)).toBe(
      'https://cdnapisec.kaltura.com/p/123/embedPlaykitJs/partner_id/123/uiconf_id/456' +
        '?iframeembed=true&entry_id=1_abc123&plugins=uiManagers%2Cyoutube%2Cdualscreen%2Ctimeline%2CkalturaCuepoints%2Civq%2Ckava',
    );
  });

  it.each(BAD_INTS.map(v => [v]))('SEC-11: rejects partnerId %j', (v) => {
    expect(() => buildPlayerUrl({ ...base, partnerId: v as number })).toThrow(/partnerId/);
  });

  it.each(BAD_INTS.map(v => [v]))('SEC-11: rejects uiconfId %j', (v) => {
    expect(() => buildPlayerUrl({ ...base, uiconfId: v as number })).toThrow(/uiconfId/);
  });

  it.each(BAD_IDS.map(v => [v]))('SEC-11: rejects entryId %j', (v) => {
    expect(() => buildPlayerUrl({ ...base, entryId: v as string })).toThrow(/entryId/);
  });

  it('SEC-11: component shows a plain-text error and no iframe for a path-traversal id', async () => {
    const { container } = await mount(PlayerCore, { ...base, partnerId: '1/../../x' });
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.textContent).toContain('Invalid partnerId');
    expect(container.querySelectorAll('*').length).toBe(1);
  });

  it('SEC-11: component mounts the iframe for valid input', async () => {
    const { container } = await mount(PlayerCore, base);
    expect(container.querySelector('iframe')!.getAttribute('src')).toBe(buildPlayerUrl(base));
  });
});
