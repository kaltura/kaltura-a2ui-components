// Covers: REC-01 (the script loader): SRI attributes, the integrity failure path and the
// one shared load. The default RECORDER_SCRIPT has no hash today, because Kaltura serves
// express-recorder.js without CORS headers (docs/adr/0005). These tests use a descriptor
// with a hash, which is the path to switch on once the CDN allows it.
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { recorderRemote, loadRecorder, SCRIPT_URL } from '../helpers/recorder-remote';

const INTEGRITY = 'sha384-VkTBbp92aE8w5t8L3oNuCWPla+b1pnhgEHE3qBg+6VgCuGOou14E4Dwp/ZPcDWYS';

let remote: ReturnType<typeof recorderRemote>;

beforeEach(() => {
  remote = recorderRemote();
});

afterEach(() => {
  remote.restore();
  document.querySelectorAll('script').forEach(tag => tag.remove());
  vi.restoreAllMocks();
});

describe('REC-01: script loader', () => {
  it('REC-01: a descriptor with a hash sets integrity and crossorigin=anonymous', async () => {
    const { loadRecorderScript } = await loadRecorder();
    await loadRecorderScript({ integrity: INTEGRITY });
    const tag = remote.tags()[0];
    expect([tag.src, tag.getAttribute('integrity'), tag.getAttribute('crossorigin')]).toEqual([SCRIPT_URL, INTEGRITY, 'anonymous']);
  });

  it('REC-01: a script that fails its integrity check rejects with load-failed and fixed text', async () => {
    remote.script = 'error';
    const { loadRecorderScript } = await loadRecorder();
    const failure = await loadRecorderScript({ integrity: INTEGRITY }).catch((error: unknown) => error);
    expect([(failure as { code: string }).code, (failure as Error).message, remote.tags().length]).toEqual([
      'load-failed',
      'Recorder script failed to load or failed its integrity check',
      0,
    ]);
  });

  it('REC-01: the default descriptor has no hash and no crossorigin (the CDN sends no CORS headers; SRI would block the script)', async () => {
    const { loadRecorderScript } = await loadRecorder();
    await loadRecorderScript();
    const tag = remote.tags()[0];
    expect([tag.hasAttribute('integrity'), tag.hasAttribute('crossorigin')]).toEqual([false, false]);
  });

  it('REC-01: concurrent loads share one promise and one tag', async () => {
    const { loadRecorderScript } = await loadRecorder();
    const [a, b] = [loadRecorderScript(), loadRecorderScript()];
    await Promise.all([a, b]);
    expect([a === b, remote.tags().length]).toEqual([true, 1]);
  });

  it('REC-01: after a failure the next load adds a new tag', async () => {
    remote.script = 'error';
    const { loadRecorderScript } = await loadRecorder();
    await loadRecorderScript().catch(() => {});
    remote.script = 'load';
    await loadRecorderScript();
    expect(remote.tags().length).toBe(1);
  });
});
