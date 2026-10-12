// Covers: SEC-06 / QA-13 (loader error text must not reach innerHTML).
// Turns green: plan item 1.1 (shared render-load-error helper).
// Technique: vi.mock() on the exact derived loader URL. The mock module
// exposes a getter that throws, so the component's own `.catch` handler runs
// with our Error (a throwing vi.mock factory would be re-wrapped by vitest).
import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, findUnsafe } from '../helpers/render';

const state = vi.hoisted(() => ({ thrown: undefined as unknown }));

vi.mock('https://mock.example/v1/loader/index.esm.js', () => {
  const m: Record<string, unknown> = {};
  for (const k of ['createWorkspace', 'loader']) {
    Object.defineProperty(m, k, {
      enumerable: true,
      get() {
        throw state.thrown;
      },
    });
  }
  return m;
});

const SERVER_URL = 'https://mock.example/v1';
const PAYLOAD_MSG = '<img src=x onerror="window.__pwned=1">';

afterEach(() => {
  document.body.innerHTML = '';
  delete (window as { __pwned?: number }).__pwned;
});

async function components() {
  const [mm, genie, cl, vod, ag] = await Promise.all([
    import('../../src/core/media-manager'),
    import('../../src/core/genie'),
    import('../../src/core/content-lab'),
    import('../../src/core/vod-avatar'),
    import('../../src/core/agents-widget'),
  ]);
  const base = { partnerId: 1, ks: 'dummy-ks', serverUrl: SERVER_URL };
  return [
    ['MediaManagerCore', mm.MediaManagerCore, base],
    ['GenieCore', genie.GenieCore, base],
    ['ContentLabCore', cl.ContentLabCore, base],
    ['VodAvatarCore', vod.VodAvatarCore, { ...base, entryId: '0_abc' }],
    ['AgentsWidgetCore', ag.AgentsWidgetCore, base],
  ] as const;
}

describe('SEC-06: loader error message must be rendered as text, not HTML', () => {
  it.each(['MediaManagerCore', 'GenieCore', 'ContentLabCore', 'VodAvatarCore', 'AgentsWidgetCore'])(
    'SEC-06: %s: Error.message with <img onerror> creates no element',
    async name => {
      state.thrown = new Error(PAYLOAD_MSG);
      const list = await components();
      const [, Comp, props] = list.find(([n]) => n === name)!;
      const { container } = await mount(Comp, { ...props });
      expect(container.querySelector('img')).toBeNull();
      expect(findUnsafe(container)).toEqual([]);
      expect(container.textContent).toContain(PAYLOAD_MSG);
    },
  );

  it.each(['MediaManagerCore', 'GenieCore'])(
    'SEC-06: %s: non-Error rejection (string) with markup creates no element',
    async name => {
      state.thrown = PAYLOAD_MSG; // `.message` is undefined -> String(err) branch
      const list = await components();
      const [, Comp, props] = list.find(([n]) => n === name)!;
      const { container } = await mount(Comp, { ...props });
      expect(findUnsafe(container)).toEqual([]);
      expect(container.textContent).toContain(PAYLOAD_MSG);
    },
  );

  it('SEC-06: MediaManagerCore: <script> in message creates no <script> element', async () => {
    state.thrown = new Error('<script>window.__pwned=1</script>');
    const list = await components();
    const [, Comp, props] = list[0];
    const { container } = await mount(Comp, { ...props });
    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).toContain('<script>window.__pwned=1</script>');
  });
});
