// Review regression tests for the Phase 1 fixes. Inputs that the earlier
// security tests did not cover: unicode hosts, nested markup, odd types.
import { describe, it, expect } from 'vitest';
import { deriveLoaderUrl } from '../../src/core/unisphere-loader';
import { sanitizeMarkdownHtml, toKalturaCdnUrl } from '../../src/core/safe-markdown';
import { invalidProps } from '../../src/core/validate-props';
import { buildPlayerUrl } from '../../src/core/player';
import { buildClipUrl, buildThumbnailUrl } from '../../src/core/flashcards';
import { KalturaPlayerApi } from '../../src/schemas/player';
import { KalturaGenieApi } from '../../src/schemas/genie';
import { mount } from '../helpers/render';

const parse = (html: string) => {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el;
};

describe('SEC-01: deriveLoaderUrl rejects unicode and encoded hosts', () => {
  it.each([
    'https://unisphere.nvp1.ovp.kaltura。com/v1', // ideographic dot
    'https://unisphere.nvp1.ovp.kaltura．com/v1', // fullwidth dot
    'https://unisphere.nvp1.ovp.kałtura.com/v1', // lookalike letter
    'https://unisphere%2envp1.ovp.kaltura.com/v1',
    'https://unisphere.nvp1.ovp.kaltura.com/%76%31',
    'https://unisphere.nvp1.ovp.kaltura.com/v1%2f..%2f',
    'https:\\\\unisphere.nvp1.ovp.kaltura.com/v1',
    'ht\ttps://unisphere.nvp1.ovp.kaltura.com/v1',
    `https://unisphere.nvp1.ovp.kaltura.com/v1${'/'.repeat(5000)}`,
  ])('SEC-01: %j', url => {
    expect(() => deriveLoaderUrl(url)).toThrow();
  });
  it.each([[['https://unisphere.nvp1.ovp.kaltura.com/v1']], [123], [null], [{}]])(
    'SEC-01: non-string %j',
    value => {
      expect(() => deriveLoaderUrl(value as never)).toThrow();
    },
  );
});

describe('SEC-12: toKalturaCdnUrl rejects hosts outside kaltura.com', () => {
  it.each([
    'https://kaltura.com.evil.example/a.png',
    'https://evilkaltura.com/a.png',
    'https://cfvod.kaltura.com.:443@evil.example/a.png',
    'https://evil.example\\.kaltura.com/a.png',
    'https://evil.example#.kaltura.com',
    'https://evil.example?.kaltura.com',
    'https://cfvod.kaltura.com./a.png', // trailing dot is refused, not normalised
    'blob:https://cfvod.kaltura.com/uuid',
    'HTTPS://user@cfvod.kaltura.com/a.png',
  ])('SEC-12: %j', url => {
    expect(toKalturaCdnUrl(url)).toBe('');
  });
});

describe('SEC-05: sanitizeMarkdownHtml nested and namespaced markup', () => {
  const unsafe = (html: string) => {
    const out = parse(sanitizeMarkdownHtml(html));
    return Array.from(out.querySelectorAll('*')).filter(
      el =>
        !['a', 'p', 'span', 'div', 'strong', 'em', 'table', 'tbody', 'tr', 'td', 'img'].includes(el.tagName.toLowerCase()) ||
        Array.from(el.attributes).some(a => /^on|^style$|^srcset$|^background$/i.test(a.name)) ||
        (el.tagName === 'IMG' && !el.getAttribute('src')?.startsWith('https://cfvod.kaltura.com/')),
    ).length;
  };
  it.each([
    '<svg><image href="https://evil.example/a"/></svg>',
    '<math><mtext><img src="https://evil.example/a"></mtext></math>',
    '<p><svg><style><img src="https://evil.example/a"></style></svg></p>',
    '<template><img src="https://evil.example/a"></template>',
    '<noscript><img src="https://evil.example/a"></noscript>',
    '<form><math><mtext></form><form><mglyph><style></math><img src="https://evil.example/a">',
    '<table><tr><td style="background:url(https://evil.example/a)">x</td></tr></table>',
    '<td style="text-align:left;background:url(https://evil.example/a)">x</td>',
    '<p style="text-align:left">x</p>',
    '<img src="https://cfvod.kaltura.com/a.png" srcset="https://evil.example/a 2x">',
    '<picture><source srcset="https://evil.example/a"><img src="https://cfvod.kaltura.com/a.png"></picture>',
    '<div><!--<img src="https://evil.example/a">--></div>',
    '<a href="https://ok.example" ping="https://evil.example/p">x</a>',
  ])('SEC-05: %j', html => {
    expect(unsafe(html)).toBe(0);
  });
  it.each([
    'jav&#x09;ascript:alert(1)',
    '&#106;avascript:alert(1)',
    ' \u0001javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    'data:text/html,x',
    'vbscript:x',
  ])('SEC-05: link href %j is dropped', href => {
    const out = parse(sanitizeMarkdownHtml(`<a href="${href}">x</a>`));
    expect(out.querySelector('a')?.hasAttribute('href')).toBe(false);
  });
});

describe('SEC-11: URL builders reject odd types and encodings', () => {
  const base = { partnerId: 1, uiconfId: 2, entryId: '0_abc' };
  it.each([
    { entryId: '0_abc%2f..' },
    { entryId: '0_abс' }, // Cyrillic es
    { entryId: ['0_abc'] },
    { entryId: 'a'.repeat(65) },
    { partnerId: '1' },
    { partnerId: 1e21 },
    { uiconfId: true },
  ])('SEC-11: buildPlayerUrl %j', patch => {
    expect(() => buildPlayerUrl({ ...base, ...patch } as never)).toThrow();
  });
  it('SEC-11: buildClipUrl and buildThumbnailUrl refuse a non-string entryId', () => {
    const clip = { entryId: { toString: () => '0_abc' }, startTime: 0, endTime: 1 } as never;
    expect([buildClipUrl(clip, 1, 2), buildThumbnailUrl(clip, 1)]).toEqual(['', '']);
  });
});

describe('SEC-03: invalidProps with hostile prop shapes', () => {
  const ok = { partnerId: 1, uiconfId: 2, entryId: '0_abc' };
  it.each([
    { ...ok, ks: 'a\u0000b' },
    { ...ok, ks: ['k'] },
    { ...ok, entryId: { path: '/x' } },
    { ...ok, partnerId: '1' },
  ])('SEC-03: player rejects %j', props => {
    expect(invalidProps(KalturaPlayerApi.schema, props).length).toBeGreaterThan(0);
  });
  it('SEC-03: an own __proto__ key does not supply a missing partnerId', () => {
    const props = JSON.parse('{"__proto__":{"partnerId":1},"uiconfId":2,"entryId":"0_abc"}');
    expect(invalidProps(KalturaPlayerApi.schema, props)).toContain('partnerId');
  });
  it('SEC-03: a non-string serverUrl is refused', () => {
    expect(invalidProps(KalturaGenieApi.schema, { partnerId: 1, ks: 'k', serverUrl: 1 })).toContain('serverUrl');
  });
});

describe('SEC-06: loader rejection is text only', () => {
  it('SEC-06: markup in a rejected serverUrl adds no elements', async () => {
    const { MediaManagerCore } = await import('../../src/core/media-manager');
    const { container } = await mount(MediaManagerCore, {
      partnerId: 1,
      ks: 'k',
      serverUrl: '<img src=x onerror=alert(1)><a href="https://evil.example">x</a>',
    });
    expect(container.querySelectorAll('img, a, script').length).toBe(0);
  });
});
