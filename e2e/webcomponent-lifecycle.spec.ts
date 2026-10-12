import { test, expect } from './fixtures/harness';

const flashcards = { title: 'Late title', cards: [{ title: 'a', content: 'b' }] };

test('QA-01: config set after connect replaces the alert with the widget', async ({ harness: h }) => {
  await h.open();
  await h.page.evaluate(() => {
    const el = document.createElement('kaltura-flashcards');
    el.id = 'late';
    document.getElementById('host')?.appendChild(el);
  });
  await expect(h.page.locator('#late [role="alert"]')).toHaveCount(1);
  await h.page.evaluate((cfg) => {
    (document.getElementById('late') as HTMLElement & { config: unknown }).config = cfg;
  }, flashcards);
  await expect(h.page.locator('#late')).toContainText('Late title');
  await expect(h.page.locator('#late [role="alert"]')).toHaveCount(0);
  expect(h.pageErrors).toEqual([]);
});

test('QA-01: remove and re-add unmounts and mounts again', async ({ harness: h }) => {
  await h.open();
  await h.mount('kaltura-flashcards', flashcards);
  await expect(h.page.locator('#host')).toContainText('Late title');
  const kept = await h.page.evaluate(async () => {
    const el = document.querySelector('kaltura-flashcards') as HTMLElement;
    el.remove();
    await new Promise((resolve) => setTimeout(resolve, 100));
    const left = el.childElementCount;
    document.getElementById('host')?.appendChild(el);
    return left;
  });
  expect(kept).toBe(0);
  await expect(h.page.locator('#host')).toContainText('Late title');
  expect(h.pageErrors).toEqual([]);
});

test('QA-01: moving an element keeps its widget', async ({ harness: h }) => {
  await h.open();
  await h.mount('kaltura-flashcards', flashcards);
  await expect(h.page.locator('#host')).toContainText('Late title');
  const same = await h.page.evaluate(async () => {
    const el = document.querySelector('kaltura-flashcards') as HTMLElement;
    const widget = el.firstElementChild;
    const other = document.body.appendChild(document.createElement('div'));
    other.appendChild(el);
    await new Promise((resolve) => setTimeout(resolve, 100));
    return el.firstElementChild === widget;
  });
  expect(same).toBe(true);
  expect(h.pageErrors).toEqual([]);
});

test('QA-01: 100 mount and unmount cycles leave no React root behind', async ({ harness: h }) => {
  await h.open();
  // React marks a container with a `__reactContainer$...` key while it owns a root.
  // Unmount sets the key to null, so a non-null key on a detached element is a leaked root.
  const leaked = await h.page.evaluate(async (cfg) => {
    const hasRoot = (el: Element) =>
      Object.entries(el).some(([k, v]) => k.startsWith('__reactContainer$') && v != null);
    const wait = () => new Promise((resolve) => setTimeout(resolve, 0));
    const host = document.getElementById('host') as HTMLElement;
    const els: HTMLElement[] = [];
    for (let i = 0; i < 100; i++) {
      const el = document.createElement('kaltura-flashcards') as HTMLElement & { config: unknown };
      el.config = cfg;
      host.appendChild(el);
      await wait();
      el.remove();
      els.push(el);
    }
    const reused = document.createElement('kaltura-flashcards') as HTMLElement & { config: unknown };
    reused.config = cfg;
    for (let i = 0; i < 100; i++) {
      host.appendChild(reused);
      await wait();
      reused.remove();
    }
    await wait();
    return [...els, reused].filter(hasRoot).length;
  }, flashcards);
  expect(leaked).toBe(0);
  expect(h.pageErrors).toEqual([]);
});
