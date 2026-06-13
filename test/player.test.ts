import { describe, it, expect } from 'vitest';
import { buildPlayerUrl } from '../src/core/player';

const BASE_PROPS = {
  partnerId: 1234567,
  uiconfId: 47011143,
  entryId: '1_abc123',
};

describe('buildPlayerUrl', () => {
  it('builds the correct base URL with partnerId, uiconfId, entryId, and plugins', () => {
    const url = buildPlayerUrl(BASE_PROPS);

    expect(url).toContain('https://cdnapisec.kaltura.com');
    expect(url).toContain(`/p/${BASE_PROPS.partnerId}/embedPlaykitJs`);
    expect(url).toContain(`/partner_id/${BASE_PROPS.partnerId}`);
    expect(url).toContain(`/uiconf_id/${BASE_PROPS.uiconfId}`);
    expect(url).toContain(`entry_id=${BASE_PROPS.entryId}`);
    expect(url).toContain('iframeembed=true');
    expect(url).toContain('plugins=uiManagers%2Cyoutube%2Cdualscreen%2Ctimeline%2CkalturaCuepoints%2Civq%2Ckava');
  });

  it('rounds startTime and clipTo to integers for kalturaSeekFrom and kalturaClipTo', () => {
    const url = buildPlayerUrl({ ...BASE_PROPS, startTime: 12.7, clipTo: 99.3 });
    const parsed = new URL(url);

    expect(parsed.searchParams.get('kalturaSeekFrom')).toBe('13');
    expect(parsed.searchParams.get('kalturaClipTo')).toBe('99');
  });

  it('sets ks param when ks is provided, omits it when absent', () => {
    const withKs = buildPlayerUrl({ ...BASE_PROPS, ks: 'djJ8MTIzNDU2N3w...' });
    const withoutKs = buildPlayerUrl(BASE_PROPS);

    const parsedWith = new URL(withKs);
    const parsedWithout = new URL(withoutKs);

    expect(parsedWith.searchParams.get('ks')).toBe('djJ8MTIzNDU2N3w...');
    expect(parsedWithout.searchParams.has('ks')).toBe(false);
  });

  it('sets autoplay and mute params when autoplay/muted are true, omits them when false/absent', () => {
    const with_ = buildPlayerUrl({ ...BASE_PROPS, autoplay: true, muted: true });
    const without = buildPlayerUrl({ ...BASE_PROPS, autoplay: false, muted: false });
    const absent = buildPlayerUrl(BASE_PROPS);

    const parsedWith = new URL(with_);
    expect(parsedWith.searchParams.get('autoplay')).toBe('true');
    expect(parsedWith.searchParams.get('mute')).toBe('true');

    const parsedWithout = new URL(without);
    expect(parsedWithout.searchParams.has('autoplay')).toBe(false);
    expect(parsedWithout.searchParams.has('mute')).toBe(false);

    const parsedAbsent = new URL(absent);
    expect(parsedAbsent.searchParams.has('autoplay')).toBe(false);
    expect(parsedAbsent.searchParams.has('mute')).toBe(false);
  });
});
