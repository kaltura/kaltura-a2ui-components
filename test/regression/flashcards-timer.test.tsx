// Covers: QA-19 (flashcards: the slide animation timer is cleared when the deck unmounts).
// A timer that fires after unmount calls setState on a dead tree and can throw once the page or
// test environment is gone.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { FlashcardsCore } from '../../src/core/flashcards';

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('QA-19: flashcards animation timer', () => {
  it('QA-19: unmounting during a slide change leaves no pending timer', async () => {
    const container = document.body.appendChild(document.createElement('div'));
    const root = createRoot(container);
    await act(async () => {
      root.render(createElement(FlashcardsCore, { title: 'Deck', summary: 'Intro', cards: [{ title: 'C1', content: 'One' }] }));
    });
    await act(async () => new Promise(resolve => setTimeout(resolve, 50)));

    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const before = vi.getTimerCount();
    act(() => {
      container.querySelector('.flashcard-carousel')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });
    expect(vi.getTimerCount()).toBe(before + 1);

    await act(async () => root.unmount());
    expect(vi.getTimerCount()).toBe(before);
  });
});
