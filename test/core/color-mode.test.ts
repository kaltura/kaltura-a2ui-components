// Covers: T16. The light/dark order the widgets follow (D18).
import { describe, it, expect, afterEach, vi } from 'vitest';
import { readColorMode } from '../../src/core/color-mode';

function prefersDark(dark: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: dark && query.includes('dark') }));
}

afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.className = '';
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

describe('T16: readColorMode', () => {
  it('T16: data-theme wins over a class and over the system setting', () => {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.add('a2ui-dark');
    prefersDark(true);
    expect(readColorMode('dark')).toBe('light');
  });

  it('T16: an a2ui-dark class on an ancestor wins over the system setting', () => {
    const host = document.body.appendChild(document.createElement('div'));
    host.className = 'a2ui-dark';
    const child = host.appendChild(document.createElement('span'));
    prefersDark(false);
    expect(readColorMode('light', child)).toBe('dark');
  });

  it('T16: an a2ui-light class on the root element is found', () => {
    document.documentElement.classList.add('a2ui-light');
    prefersDark(true);
    expect(readColorMode('dark')).toBe('light');
  });

  it.each([true, false])('T16: with nothing set, prefers-color-scheme dark=%s decides', dark => {
    prefersDark(dark);
    expect(readColorMode('light')).toBe(dark ? 'dark' : 'light');
  });

  it('T16: without matchMedia the fallback applies', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect([readColorMode('dark'), readColorMode('light')]).toEqual(['dark', 'light']);
  });

  it('T16: an unknown data-theme value is ignored', () => {
    document.documentElement.setAttribute('data-theme', 'sepia');
    prefersDark(true);
    expect(readColorMode('light')).toBe('dark');
  });
});
