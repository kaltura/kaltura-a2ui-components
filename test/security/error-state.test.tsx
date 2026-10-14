// Covers: plain-text error states share one role, one class and one style (src/styles).
import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act } from 'react';
import { mount } from '../helpers/render';
import { renderLoadError } from '../../src/core/render-load-error';
import { KalturaFailure } from '../../src/core/host-hooks';

afterEach(() => {
  document.body.innerHTML = '';
});

const css = readFileSync(resolve(process.cwd(), 'src/styles/components.css'), 'utf8');

describe('SEC-06: every plain-text error state is one alert with one class', () => {
  it('SEC-06: renderLoadError makes an alert with the shared class and no inline style', () => {
    const host = document.body.appendChild(document.createElement('div'));
    renderLoadError(host, 'thing', new KalturaFailure('load-failed', 'boom'), 'avatar');
    const box = host.firstElementChild!;
    expect([box.className, box.getAttribute('role'), box.hasAttribute('style'), box.textContent]).toEqual([
      'kaltura-load-error',
      'alert',
      false,
      'Failed to load thing: boom',
    ]);
  });

  it('SEC-06: renderLoadError shows fixed text for any other error and logs the real one', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const host = document.body.appendChild(document.createElement('div'));
    const error = new Error('remote text');
    renderLoadError(host, 'thing', error, 'avatar');
    expect([host.textContent, spy.mock.calls]).toEqual(['Failed to load thing', [['Failed to load thing', error]]]);
  });

  it('SEC-06: the validation wrapper makes an alert with the shared class and no inline style', async () => {
    const { PlayerCore } = await import('../../src/core/player');
    const { container } = await mount(PlayerCore, { partnerId: 'x', uiconfId: 2, entryId: '0_a' });
    const box = container.firstElementChild!;
    expect([box.className, box.getAttribute('role'), box.hasAttribute('style')]).toEqual(['kaltura-load-error', 'alert', false]);
  });

  it('SEC-06: a flashcard clip error is the same alert', async () => {
    const { FlashcardsCore } = await import('../../src/core/flashcards');
    const { container } = await mount(FlashcardsCore, {
      title: 'Deck',
      partnerId: 1,
      uiconfId: 2,
      cards: [{ title: 'C', content: 'x', clips: [{ entryId: '../x', startTime: 0, endTime: 1 }] }],
    });
    await act(async () => container.querySelector<HTMLButtonElement>('.flashcard-action-btn')!.click());
    const box = container.querySelector('[role="alert"]');
    expect([box?.className, box?.textContent]).toEqual(['kaltura-load-error', 'This clip cannot be shown.']);
  });
});

// WCAG 2 contrast ratio
const channel = (v: number) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4);
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map(i => channel(parseInt(hex.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const rule = (selector: RegExp) => css.match(selector)?.[1] ?? '';
const colour = (block: string, prop: string) => block.match(new RegExp(`(?:^|[;\\s])${prop}:\\s*(#[0-9a-fA-F]{6})`))?.[1] ?? '';

describe('SEC-06: the shared error style is readable on light and dark', () => {
  const light = rule(/(?:^|\n)\.kaltura-load-error\s*\{([^}]*)\}/);
  const dark = rule(/\[data-theme=['"]dark['"]\]\s+\.kaltura-load-error\s*\{([^}]*)\}/);

  it('SEC-06: the style uses its own literal colours, not host tokens', () => {
    expect([colour(light, 'color'), colour(light, 'background')].every(Boolean)).toBe(true);
    expect(light).not.toMatch(/ff6b6b/i);
  });

  it('SEC-06: the light pair has at least 4.5:1 contrast', () => {
    expect(contrast(colour(light, 'color'), colour(light, 'background'))).toBeGreaterThanOrEqual(4.5);
  });

  it('SEC-06: the dark pair has at least 4.5:1 contrast', () => {
    expect(contrast(colour(dark, 'color'), colour(dark, 'background'))).toBeGreaterThanOrEqual(4.5);
  });
});
