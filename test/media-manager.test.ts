import { describe, it, expect } from 'vitest';
import { deriveLoaderUrl, buildRuntimes } from '../src/core/media-manager';

describe('deriveLoaderUrl', () => {
  it('replaces /v1 suffix (no trailing slash)', () => {
    expect(deriveLoaderUrl('https://x/v1')).toBe('https://x/v1/loader/index.esm.js');
  });

  it('replaces /v1/ suffix (trailing slash)', () => {
    expect(deriveLoaderUrl('https://x/v1/')).toBe('https://x/v1/loader/index.esm.js');
  });

  it('works with a full Kaltura CDN base URL', () => {
    expect(deriveLoaderUrl('https://cdnapisec.kaltura.com/v1')).toBe(
      'https://cdnapisec.kaltura.com/v1/loader/index.esm.js',
    );
  });
});

describe('buildRuntimes', () => {
  const instanceId = 'unisphere-mm-test-123';
  const baseProps = {
    ks: 'test-ks',
    partnerId: 1234567,
    instanceId,
  };

  it('returns a single runtime entry', () => {
    const runtimes = buildRuntimes(baseProps);
    expect(runtimes).toHaveLength(1);
  });

  it('uses the fixed manifest runtimeName', () => {
    const [runtime] = buildRuntimes(baseProps) as Array<{ runtimeName: string }>;
    expect(runtime.runtimeName).toBe('kaltura-items-media-manager');
  });

  it('sets contextType to category in settings', () => {
    const [runtime] = buildRuntimes(baseProps) as Array<{
      settings: { contextType: string };
    }>;
    expect(runtime.settings.contextType).toBe('category');
  });

  it('sets visuals[0].target to the passed instanceId', () => {
    const [runtime] = buildRuntimes(baseProps) as Array<{
      visuals: Array<{ target: string }>;
    }>;
    expect(runtime.visuals[0].target).toBe(instanceId);
  });

  it('defaults visuals[0].settings.mode to select when mode is omitted', () => {
    const [runtime] = buildRuntimes(baseProps) as Array<{
      visuals: Array<{ settings: { mode: string } }>;
    }>;
    expect(runtime.visuals[0].settings.mode).toBe('select');
  });

  it('uses the provided mode when set', () => {
    const [runtime] = buildRuntimes({ ...baseProps, mode: 'manage' }) as Array<{
      visuals: Array<{ settings: { mode: string } }>;
    }>;
    expect(runtime.visuals[0].settings.mode).toBe('manage');
  });

  it('includes contextId in settings when provided', () => {
    const [runtime] = buildRuntimes({ ...baseProps, contextId: '42' }) as Array<{
      settings: { contextId?: string };
    }>;
    expect(runtime.settings.contextId).toBe('42');
  });

  it('omits contextId from settings when not provided', () => {
    const [runtime] = buildRuntimes(baseProps) as Array<{
      settings: { contextId?: string };
    }>;
    expect(runtime.settings.contextId).toBeUndefined();
  });

  it('sets supportDocuments to true', () => {
    const [runtime] = buildRuntimes(baseProps) as Array<{
      settings: { supportDocuments: boolean };
    }>;
    expect(runtime.settings.supportDocuments).toBe(true);
  });

  it('uses the fixed widgetName', () => {
    const [runtime] = buildRuntimes(baseProps) as Array<{ widgetName: string }>;
    expect(runtime.widgetName).toBe('unisphere.widget.media-manager');
  });
});
