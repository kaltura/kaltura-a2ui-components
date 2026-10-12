// Covers: SEC-03 (recorder iframe built with innerHTML, IDs unvalidated).
// Turns green: plan item 1.4 (recorder via createElement + ID validation).
// The schema (z.number) blocks string IDs on the A2UI path only. The web
// component path and direct React use are unvalidated.
// The first three tests are green controls and must stay green.
import { describe, it, expect, afterEach } from 'vitest';
import { mount, findUnsafe } from '../helpers/render';

afterEach(() => {
  document.body.innerHTML = '';
  delete (window as { __pwned?: number }).__pwned;
});

const EXPECTED =
  'https://www.kaltura.com/index.php/extwidget/preview/partner_id/123/uiconf_id/0/entry_id//embed/iframe?ks=dummy-ks&showRecordButton=true';

async function render(props: Record<string, unknown>) {
  const { RecorderCore } = await import('../../src/core/recorder');
  const { container, root } = await mount(RecorderCore, props);
  return { container: container.querySelector('.kaltura-recorder-container') as HTMLElement, root };
}

describe('SEC-03: RecorderCore', () => {
  it('SEC-03: valid props: exactly one iframe with the exact expected src (control, must stay green)', async () => {
    const { container } = await render({ partnerId: 123, ks: 'dummy-ks' });
    const all = container.querySelectorAll('*');
    expect(all.length).toBe(1);
    expect(container.querySelector('iframe')!.getAttribute('src')).toBe(EXPECTED);
  });

  it('SEC-03: ks with quote/markup is encoded (control, must stay green)', async () => {
    const { container } = await render({ partnerId: 123, ks: '"><img src=x onerror=1>' });
    expect(findUnsafe(container)).toEqual(['<iframe>']);
    expect(container.querySelector('iframe')!.getAttribute('src')).toContain(
      'ks=%22%3E%3Cimg%20src%3Dx%20onerror%3D1%3E',
    );
  });

  it('SEC-03: string partnerId with `"><img onerror>` creates no extra element (control: `<img>` lands inside <iframe> RAWTEXT and is inert)', async () => {
    const { container } = await render({ partnerId: '1"><img src=x onerror="window.__pwned=1">', ks: 'dummy-ks' });
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelectorAll('*').length).toBeLessThanOrEqual(1);
  });

  it('SEC-03: string uiconfId `0" onload="..."` adds no attribute to the iframe', async () => {
    const { container } = await render({ partnerId: 123, ks: 'dummy-ks', uiconfId: '0" onload="window.__pwned=1' });
    const f = container.querySelector('iframe');
    expect(f?.getAttributeNames().filter(n => n.startsWith('on')) ?? []).toEqual([]);
  });

  it('SEC-03: string partnerId `1" srcdoc="<script>` adds no srcdoc attribute (srcdoc + sandbox allow-scripts allow-same-origin = host-origin script)', async () => {
    const { container } = await render({ partnerId: '1" srcdoc="<script>parent.__pwned=1</script>', ks: 'dummy-ks' });
    const f = container.querySelector('iframe');
    expect(f?.hasAttribute('srcdoc') ?? false).toBe(false);
  });

  it('SEC-03: hostile partnerId never changes iframe origin/path prefix', async () => {
    const { container } = await render({ partnerId: '1/../../../../evil', ks: 'dummy-ks' });
    const f = container.querySelector('iframe');
    // acceptable: no iframe at all, or a src whose path is still the preview endpoint for a numeric id
    if (f) expect(new URL(f.getAttribute('src')!).pathname).toMatch(/^\/index\.php\/extwidget\/preview\/partner_id\/\d+\//);
  });
});
