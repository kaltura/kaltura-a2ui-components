import { describe, it, expect } from 'vitest';
import { deriveLoaderUrl, buildWorkspaceConfig } from '../src/core/media-manager';

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

describe('buildWorkspaceConfig', () => {
  const baseProps = {
    ks: 'test-ks',
    partnerId: 1234567,
    instanceId: 'unisphere-mm-test-123',
    theme: 'dark' as const,
  };

  it('sets workspaceName to the instanceId', () => {
    const cfg = buildWorkspaceConfig(baseProps);
    expect(cfg.workspaceName).toBe(baseProps.instanceId);
  });

  it('produces unique workspaceNames for different instances (no collision)', () => {
    // Regression lock: ensures each instance gets its own named workspace,
    // preventing "workspace already reserved" when multiple MM surfaces coexist.
    const a = buildWorkspaceConfig({ ...baseProps, instanceId: 'mm-aaa' });
    const b = buildWorkspaceConfig({ ...baseProps, instanceId: 'mm-bbb' });
    expect(a.workspaceName).not.toBe(b.workspaceName);
  });

  it('embeds ks and partnerId in the media-manager experience settings', () => {
    const cfg = buildWorkspaceConfig(baseProps);
    const settings = cfg.config.experiences['media-manager']['kaltura-media-manager'].settings;
    expect(settings.ks).toBe('test-ks');
    expect(settings.partnerId).toBe(1234567);
  });

  it('sets supportDocuments to true in the experience settings', () => {
    const cfg = buildWorkspaceConfig(baseProps);
    const settings = cfg.config.experiences['media-manager']['kaltura-media-manager'].settings;
    expect(settings.supportDocuments).toBe(true);
  });

  it('propagates theme into ui config', () => {
    const cfg = buildWorkspaceConfig(baseProps);
    expect(cfg.config.ui.theme).toBe('dark');
  });

  it('propagates light theme correctly', () => {
    const cfg = buildWorkspaceConfig({ ...baseProps, theme: 'light' });
    expect(cfg.config.ui.theme).toBe('light');
  });

  it('sets language to en', () => {
    const cfg = buildWorkspaceConfig(baseProps);
    expect(cfg.config.ui.language).toBe('en');
  });

  it('includes the instanceId in appId', () => {
    const cfg = buildWorkspaceConfig(baseProps);
    expect(cfg.config.appId).toContain(baseProps.instanceId);
  });
});
