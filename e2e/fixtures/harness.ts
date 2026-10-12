import { test as base, expect, type Page, type Request } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { ORIGIN_A, ORIGIN_B } from './constants';

export type LoaderMode = 'throw' | 'throwstr' | 'codeload' | 'ok' | 'slow' | 'notfound';
interface LogEntry { token: string; path: string }
interface HarnessWindow { __mount(tag: string, config: unknown): void; __pwned: unknown[] }

const KALTURA_HOST = /^https?:\/\/[^/]*\.kaltura\.com\//;
const LOADER_PATH = /\/loader\/index\.esm\.js(\?|$)/;

/**
 * One harness per test. `token` is the first path segment on both origins,
 * so parallel tests never see each other's log entries.
 */
export class Harness {
  readonly token = randomUUID();
  /** Requests the page made. Includes those aborted or blocked by the network. */
  readonly requests: string[] = [];
  readonly pageErrors: string[] = [];
  /** What stubbed *.kaltura.com hosts serve. Real Kaltura hosts are never contacted. */
  kalturaMode: LoaderMode = 'ok';

  constructor(readonly page: Page) {
    page.on('request', (r: Request) => this.requests.push(r.url()));
    page.on('pageerror', (e) => this.pageErrors.push(e.message));
  }

  /** Base serverUrl on origin B. The loader module is chosen by `mode`. */
  hostileServerUrl(mode: LoaderMode): string {
    return `${ORIGIN_B}/${this.token}/${mode}/v1`;
  }

  async open(opts: { noshim?: boolean } = {}): Promise<void> {
    await this.page.route(KALTURA_HOST, async (route) => {
      const res = await this.page.request.get(
        `${ORIGIN_B}/${this.token}-stub/${this.kalturaMode}/v1/loader/index.esm.js`,
      );
      await route.fulfill({
        status: res.status(),
        contentType: 'text/javascript',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: await res.body(),
      });
    });
    await this.page.goto(`${ORIGIN_A}/harness.html${opts.noshim ? '?noshim=1' : ''}`);
  }

  async mount(tag: string, config: Record<string, unknown>): Promise<void> {
    await this.page.evaluate(([t, c]) => (window as unknown as HarnessWindow).__mount(t, c), [tag, config] as const);
  }

  /** Lets async loads, effects and any injected markup run. Absence checks need a wait. */
  async settle(): Promise<void> {
    await this.page.waitForTimeout(700);
  }

  pwned(): Promise<unknown[]> {
    return this.page.evaluate(() => (window as unknown as HarnessWindow).__pwned);
  }

  /** Requests made to origin A or B under this test's token, from the server logs. */
  async serverLog(origin: 'A' | 'B'): Promise<LogEntry[]> {
    const base = origin === 'A' ? ORIGIN_A : ORIGIN_B;
    const res = await this.page.request.get(`${base}/__log?token=${this.token}`);
    return (await res.json()) as LogEntry[];
  }

  /** Page requests that look like a Unisphere loader fetch. */
  loaderRequests(): string[] {
    return this.requests.filter((u) => LOADER_PATH.test(u));
  }
}

export const test = base.extend<{ harness: Harness }>({
  harness: async ({ page }, use) => {
    await use(new Harness(page));
  },
});

export { expect };
