// Covers: QA-01 / SEC-17 / QA-17 (defineKalturaElement helper).
import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
import { act, createElement, useState } from 'react';
import { createRoot } from 'react-dom/client';

type KalturaElement = HTMLElement & { config: unknown };

const create = (tag: string) => document.createElement(tag) as KalturaElement;
const settle = () => act(async () => {});
// React warns about root updates outside act() in tests, and unmount is one.
const detach = (el: Element) => act(async () => el.remove());
const flashcards = { title: 't', cards: [{ title: 'a', content: 'b' }] };
const hasRoot = (el: Element) =>
  Object.entries(el).some(([k, v]) => k.startsWith('__reactContainer$') && v != null);

// The first import loads React and every core component, which is slow on a busy machine.
beforeAll(() => import('../../src/adapters/webcomponent/index'), 60_000);

afterEach(() => {
  document.body.innerHTML = '';
});

describe('QA-01: defineKalturaElement', () => {
  it('QA-01: a late config replaces the strict alert with the widget', async () => {
    await import('../../src/adapters/webcomponent/index');
    const el = create('kaltura-flashcards');
    document.body.appendChild(el);
    await settle();
    expect(el.querySelector('[role="alert"]')).not.toBeNull();
    el.config = flashcards;
    await settle();
    expect(el.querySelector('[role="alert"]')).toBeNull();
    expect(el.childElementCount).toBeGreaterThan(0);
  });

  it('QA-01: an element without a default config renders nothing until config is set', async () => {
    await import('../../src/adapters/webcomponent/index');
    const el = create('kaltura-chart');
    document.body.appendChild(el);
    await settle();
    expect(el.childElementCount).toBe(0);
  });

  it('QA-01: a second config replaces the first', async () => {
    await import('../../src/adapters/webcomponent/index');
    const el = create('kaltura-flashcards');
    el.config = flashcards;
    document.body.appendChild(el);
    await settle();
    el.config = { ...flashcards, title: 'second title' };
    await settle();
    expect(el.textContent).toContain('second title');
  });

  it('QA-01: config reads back what was set', async () => {
    await import('../../src/adapters/webcomponent/index');
    const el = create('kaltura-flashcards');
    el.config = flashcards;
    expect(el.config).toBe(flashcards);
  });

  it('QA-01: a config set before the tag was defined is kept', async () => {
    const tag = 'kaltura-early-config';
    const { defineKalturaElement } = await import('../../src/adapters/webcomponent/define');
    const el = document.createElement(tag) as KalturaElement;
    el.config = flashcards;
    document.body.appendChild(el);
    const { FlashcardsCore } = await import('../../src/core/flashcards');
    defineKalturaElement(tag, FlashcardsCore);
    await settle();
    expect([el.querySelector('[role="alert"]'), el.querySelector('.flashcard-carousel')?.getAttribute('aria-label')]).toEqual([null, 't']);
    expect(Object.hasOwn(el, 'config')).toBe(false);
  });

  it('QA-01: re-attaching mounts the widget again', async () => {
    await import('../../src/adapters/webcomponent/index');
    const el = create('kaltura-flashcards');
    el.config = flashcards;
    document.body.appendChild(el);
    await settle();
    await detach(el);
    document.body.appendChild(el);
    await settle();
    expect(el.childElementCount).toBeGreaterThan(0);
  });

  it('QA-01: moving an element within the page keeps its widget', async () => {
    await import('../../src/adapters/webcomponent/index');
    const el = create('kaltura-flashcards');
    el.config = flashcards;
    document.body.appendChild(el);
    await settle();
    const other = document.createElement('div');
    document.body.appendChild(other);
    await act(async () => {
      other.appendChild(el);
    });
    expect(el.childElementCount).toBeGreaterThan(0);
  });

  it('QA-01: moving an element does not remount its widget', async () => {
    await import('../../src/adapters/webcomponent/index');
    const el = create('kaltura-flashcards');
    el.config = flashcards;
    document.body.appendChild(el);
    await settle();
    const widget = el.firstElementChild;
    const other = document.createElement('div');
    document.body.appendChild(other);
    await act(async () => {
      other.appendChild(el);
    });
    await settle();
    expect(el.firstElementChild).toBe(widget);
  });

  it('QA-01: a React host that removes the element logs no React warning', async () => {
    await import('../../src/adapters/webcomponent/index');
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    let hide!: () => void;
    const Host = () => {
      const [shown, setShown] = useState(true);
      hide = () => setShown(false);
      return shown
        ? createElement('div', null, createElement('kaltura-flashcards', { ref: (n: KalturaElement | null) => n && (n.config = flashcards) }))
        : null;
    };
    const container = document.body.appendChild(document.createElement('div'));
    const root = createRoot(container);
    await act(async () => root.render(createElement(Host)));
    await settle();
    await act(async () => hide());
    await settle();
    await act(async () => root.unmount());
    expect(errors.mock.calls).toEqual([]);
    errors.mockRestore();
  });

  it('QA-01: 100 mount and unmount cycles leave no React root behind', async () => {
    await import('../../src/adapters/webcomponent/index');
    const el = create('kaltura-flashcards');
    el.config = flashcards;
    for (let i = 0; i < 100; i++) {
      document.body.appendChild(el);
      await settle();
      await detach(el);
    }
    expect(hasRoot(el)).toBe(false);
  });

  it('QA-01: a connected element holds exactly one React root', async () => {
    await import('../../src/adapters/webcomponent/index');
    const el = create('kaltura-flashcards');
    el.config = flashcards;
    document.body.appendChild(el);
    await settle();
    expect(hasRoot(el)).toBe(true);
  });
});

describe('SEC-17: defineKalturaElement keeps the validated-props guard', () => {
  it('SEC-17: a late invalid config shows the plain-text error, not the widget', async () => {
    await import('../../src/adapters/webcomponent/index');
    const el = create('kaltura-flashcards');
    el.config = flashcards;
    document.body.appendChild(el);
    await settle();
    el.config = { title: 't', cards: 'not-a-list' };
    await settle();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Failed to load');
  });
});

describe('QA-17: one helper defines all 12 elements', () => {
  it('QA-17: every tag is defined and connects without errors', async () => {
    const { KALTURA_WC_TAGS } = await import('../../src/adapters/webcomponent/index');
    const errors: unknown[] = [];
    window.addEventListener('error', e => errors.push(e.error));
    for (const tag of KALTURA_WC_TAGS) {
      expect(customElements.get(tag)).toBeDefined();
      const el = create(tag);
      document.body.appendChild(el);
      await settle();
      await detach(el);
    }
    expect(errors).toEqual([]);
  });
});
