import { test as base, expect, type ConsoleMessage, type Page, type Request } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ORIGIN_A, ORIGIN_B } from './constants';

export type KsProviderMode = 'sync' | 'async' | 'throw' | 'reject';
export type LoaderMode = 'throw' | 'throwstr' | 'codeload' | 'ok' | 'slow' | 'notfound';
interface LogEntry { token: string; path: string }
interface HarnessWindow { __mount(tag: string, config: unknown): void; __pwned: unknown[] }
interface KsWindow {
  KalturaA2UIWebComponents: { setKsProvider(provider: (widget: string) => string | Promise<string>): void };
  __ksCalls?: { count: number; widgets: string[] };
  __loaderCfgs?: unknown[];
  __workspaceCfgs?: unknown[];
  __embedsCfgs?: unknown[];
}

const KALTURA_HOST = /^https?:\/\/[^/]*\.kaltura\.com\//;
const RECORDER_PATH = '/apps/expressrecorder/latest/express-recorder.js';
const RECORDER_STUB = readFileSync(resolve(process.cwd(), 'e2e/fixtures/express-recorder-stub.js'), 'utf8');
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
  /** Every console message the page printed, for "no secret in logs" checks. */
  readonly consoleText: string[] = [];
  /** What stubbed *.kaltura.com hosts serve. Real Kaltura hosts are never contacted. */
  kalturaMode: LoaderMode = 'ok';
  /** What the stubbed recorder script URL does: serve the stub, fail, or serve a script with no API. */
  recorderMode: 'ok' | 'fail' | 'no-api' = 'ok';

  constructor(readonly page: Page) {
    page.on('request', (r: Request) => this.requests.push(r.url()));
    page.on('pageerror', (e) => this.pageErrors.push(e.message));
    page.on('console', (m: ConsoleMessage) => this.consoleText.push(m.text()));
  }

  /** Base serverUrl on origin B. The loader module is chosen by `mode`. */
  hostileServerUrl(mode: LoaderMode): string {
    return `${ORIGIN_B}/${this.token}/${mode}/v1`;
  }

  async open(): Promise<void> {
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
    await this.page.route(
      (url) => url.pathname === RECORDER_PATH && KALTURA_HOST.test(url.href),
      (route) =>
        this.recorderMode === 'fail'
          ? route.abort()
          : route.fulfill({
              status: 200,
              contentType: 'text/javascript',
              headers: { 'Access-Control-Allow-Origin': '*' },
              body: this.recorderMode === 'ok' ? RECORDER_STUB : '/* no recorder API */',
            }),
    );
    await this.page.goto(`${ORIGIN_A}/harness.html`);
  }

  /**
   * Host side of the KS contract: calls `setKsProvider` on the bundle global.
   * `async` resolves after 300 ms. `throw` and `reject` put the KS in the error
   * message, so a leak into the page would show.
   */
  async setKsProvider(mode: KsProviderMode, ks: string): Promise<void> {
    await this.page.evaluate(
      ([m, value]) => {
        const api = (window as unknown as KsWindow).KalturaA2UIWebComponents;
        const calls = ((window as unknown as KsWindow).__ksCalls = { count: 0, widgets: [] as string[] });
        const provider = {
          sync: () => value,
          async: () => new Promise<string>((resolve) => setTimeout(() => resolve(value), 300)),
          throw: () => {
            throw new Error(`provider failed for ${value}`);
          },
          reject: () => Promise.reject(new Error(`provider failed for ${value}`)),
        }[m];
        api.setKsProvider((widget) => {
          calls.count += 1;
          calls.widgets.push(widget);
          return provider();
        });
      },
      [mode, ks] as const,
    );
  }

  /** How many times the page called the provider set by `setKsProvider`. */
  providerCalls(): Promise<number> {
    return this.page.evaluate(() => (window as unknown as KsWindow).__ksCalls?.count ?? 0);
  }

  /** Widget names the provider received, sorted. */
  providerWidgets(): Promise<string[]> {
    return this.page.evaluate(() => [...((window as unknown as KsWindow).__ksCalls?.widgets ?? [])].sort());
  }

  /** Values the 'ok' loader module received, set by e2e/fixtures/servers.mjs. */
  loaderConfigs(): Promise<unknown[]> {
    return this.page.evaluate(() => (window as unknown as KsWindow).__loaderCfgs ?? []);
  }

  workspaceConfigs(): Promise<unknown[]> {
    return this.page.evaluate(() => (window as unknown as KsWindow).__workspaceCfgs ?? []);
  }

  /** Configs given to `embeds.workspace` (the avatar). */
  embedsConfigs(): Promise<unknown[]> {
    return this.page.evaluate(() => (window as unknown as KsWindow).__embedsCfgs ?? []);
  }

  /** Text of the mounted components. Attributes such as iframe `src` are not text. */
  hostText(): Promise<string> {
    return this.page.locator('#host').innerText();
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
