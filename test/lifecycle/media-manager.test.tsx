// Covers: QA-07 (Media Manager lifecycle) and SEC-18 (selection event scope).
// Turns green: plan items 2.2 and 2.3.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { URL_A, URL_B, loaderUrl, gate, render, fakeWorkspaceModule, errorSpy, tick, type MountedVisual } from './harness';

const listen = (target: EventTarget) => {
  const seen: CustomEvent[] = [];
  target.addEventListener('kaltura-entry-selected', e => seen.push(e as CustomEvent));
  return seen;
};

const base = { partnerId: 1, ks: 'ks-1', serverUrl: URL_A };
let log: string[];
let configs: Record<string, unknown>[];
let visuals: MountedVisual[];

beforeEach(() => {
  vi.resetModules();
  log = [];
  configs = [];
  visuals = [];
});
afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

async function manager(mock: Record<string, unknown>) {
  vi.doMock(loaderUrl(URL_A), () => mock);
  vi.doMock(loaderUrl(URL_B), () => mock);
  return (await import('../../src/core/media-manager')).MediaManagerCore;
}

/** Calls the remote select button of the n-th mounted visual, as Unisphere would. */
function selectRow(n: number, row: { id?: string; name?: string }) {
  const buttons = ((visuals[n].settings.context as { rowActions: unknown }).rowActions as { buttons: { onClick(r: unknown): void }[] }).buttons;
  act(() => buttons[0].onClick(row));
}

describe('QA-07: Media Manager lifecycle', () => {
  it('QA-07: a new ks re-inits and kills the old workspace', async () => {
    const Mm = await manager(fakeWorkspaceModule({ log, configs, visuals }));
    const view = await render(Mm, base);
    await view.rerender({ ...base, ks: 'ks-2' });
    expect(log).toEqual(['create 1', 'unmount visual-1', 'kill 1', 'create 2']);
  });

  it('QA-07: the new ks reaches the workspace config', async () => {
    const Mm = await manager(fakeWorkspaceModule({ log, configs, visuals }));
    const view = await render(Mm, base);
    await view.rerender({ ...base, ks: 'ks-2' });
    expect(JSON.stringify(configs[1])).toContain('ks-2');
  });

  it('QA-07: a new serverUrl re-inits', async () => {
    const Mm = await manager(fakeWorkspaceModule({ log, configs, visuals }));
    const view = await render(Mm, base);
    await view.rerender({ ...base, serverUrl: URL_B });
    expect(log.filter(l => l.startsWith('create'))).toEqual(['create 1', 'create 2']);
  });

  it('QA-07: a new contextId re-inits', async () => {
    const Mm = await manager(fakeWorkspaceModule({ log, configs, visuals }));
    const view = await render(Mm, base);
    await view.rerender({ ...base, contextId: '42' });
    expect(visuals[1].settings.context).toMatchObject({ type: 'category', initialCategoryId: '42' });
  });

  it('QA-07: a rerender with equal props does not re-init', async () => {
    const Mm = await manager(fakeWorkspaceModule({ log, configs, visuals }));
    const view = await render(Mm, base);
    await view.rerender({ ...base });
    expect(log).toEqual(['create 1']);
  });

  it('QA-07: unmount after load kills the workspace', async () => {
    const Mm = await manager(fakeWorkspaceModule({ log, configs, visuals }));
    const view = await render(Mm, base);
    await view.unmount();
    expect(log).toEqual(['create 1', 'unmount visual-1', 'kill 1']);
  });

  it('QA-07: unmount while createWorkspace runs kills the workspace', async () => {
    const slow = gate();
    const Mm = await manager(fakeWorkspaceModule({ log, configs, visuals, waitCreate: slow.wait }));
    const view = await render(Mm, base);
    await view.unmount();
    slow.open();
    await tick();
    expect(log).toEqual(['create 1', 'kill 1']);
  });

  it('QA-07: unmount while the runtime loads kills the workspace', async () => {
    const slow = gate();
    const Mm = await manager(fakeWorkspaceModule({ log, configs, visuals, waitRuntime: slow.wait }));
    const view = await render(Mm, base);
    await view.unmount();
    slow.open();
    await tick();
    expect(log).toEqual(['create 1', 'kill 1']);
  });

  it('QA-07: unmount while the visual mounts kills the workspace', async () => {
    const slow = gate();
    const Mm = await manager(fakeWorkspaceModule({ log, configs, visuals, waitMount: slow.wait }));
    const view = await render(Mm, base);
    await view.unmount();
    slow.open();
    await tick();
    expect(log).toEqual(['create 1', 'kill 1']);
  });

  it('QA-07: a missing createWorkspace export shows the generic alert', async () => {
    const Mm = await manager({ createWorkspace: undefined });
    const view = await render(Mm, base);
    expect(view.container.querySelector('[role="alert"]')?.textContent).toBe(
      'Failed to load Media Manager: Unisphere createWorkspace is missing',
    );
  });

  it('QA-07: no React error when a row is selected after unmount', async () => {
    const spy = errorSpy();
    const Mm = await manager(fakeWorkspaceModule({ log, configs, visuals }));
    const view = await render(Mm, { ...base, multiSelect: true });
    await view.unmount();
    selectRow(0, { id: '0_abc', name: 'x' });
    expect(spy).not.toHaveBeenCalled();
  });

  it('QA-07: a row selected in the replaced workspace does not dispatch', async () => {
    const Mm = await manager(fakeWorkspaceModule({ log, configs, visuals }));
    const view = await render(Mm, base);
    await view.rerender({ ...base, ks: 'ks-2' });
    const seen = listen(view.container.firstElementChild!);
    selectRow(0, { id: '0_old' });
    selectRow(1, { id: '0_new' });
    expect(seen.map(e => e.detail.entryId)).toEqual(['0_new']);
  });

  it('QA-07: a row selected in the replaced workspace is not added to the multi-select bar', async () => {
    const Mm = await manager(fakeWorkspaceModule({ log, configs, visuals }));
    const view = await render(Mm, { ...base, multiSelect: true });
    await view.rerender({ ...base, multiSelect: true, ks: 'ks-2' });
    selectRow(0, { id: '0_old', name: 'Old' });
    expect(view.container.querySelectorAll('.mm-selected-chip')).toHaveLength(0);
  });

  it('F1: the workspace config has appVersion, a region env and the session', async () => {
    const Mm = await manager(fakeWorkspaceModule({ log, configs, visuals }));
    await render(Mm, base);
    expect((configs[0] as { config: object }).config).toMatchObject({
      appVersion: expect.any(String),
      env: 'nvp1',
      session: { ks: 'ks-1', partnerId: 1 },
    });
  });

  it('F1: env follows the region of serverUrl', async () => {
    const Mm = await manager(fakeWorkspaceModule({ log, configs, visuals }));
    await render(Mm, { ...base, serverUrl: URL_B });
    expect((configs[0] as { config: { env: string } }).config.env).toBe('irp2');
  });

  it('F1: the runtime gets only the settings it accepts', async () => {
    const Mm = await manager(fakeWorkspaceModule({ log, configs, visuals }));
    await render(Mm, base);
    const experiences = (configs[0] as { config: { experiences: Record<string, Record<string, { settings: object }>> } }).config.experiences;
    expect(experiences['media-manager']['kaltura-media-manager'].settings).toEqual({ ks: 'ks-1', partnerId: 1 });
  });

  it('APPSEC-08: a failed load logs a fixed string with no error or KS', async () => {
    const spy = errorSpy();
    const Mm = await manager({ createWorkspace: async () => { throw new Error('boom ks-1'); } });
    await render(Mm, base);
    expect(spy.mock.calls).toEqual([['[MediaManager] Load failed']]);
  });

  it.each(['', 'a b', 'x'.repeat(65), 7, null, undefined])('APPSEC-09: row id %j is ignored', async id => {
    const Mm = await manager(fakeWorkspaceModule({ log, configs, visuals }));
    const view = await render(Mm, base);
    const seen = listen(view.container.firstElementChild!);
    selectRow(0, { id } as never);
    expect(seen).toHaveLength(0);
  });

  it('APPSEC-09: a long row name is capped at 500 characters', async () => {
    const Mm = await manager(fakeWorkspaceModule({ log, configs, visuals }));
    const view = await render(Mm, base);
    const seen = listen(view.container.firstElementChild!);
    selectRow(0, { id: '0_abc', name: 'n'.repeat(100_000) });
    expect(seen[0].detail.name).toHaveLength(500);
  });
});

describe('SEC-18: kaltura-entry-selected is scoped to the host element', () => {
  it('SEC-18: the event fires on the host element with an instanceId', async () => {
    const Mm = await manager(fakeWorkspaceModule({ log, configs, visuals }));
    const view = await render(Mm, base);
    const seen = listen(view.container.firstElementChild!);
    selectRow(0, { id: '0_abc', name: 'Intro' });
    expect(seen[0].detail).toEqual({ entryId: '0_abc', name: 'Intro', instanceId: expect.stringMatching(/^unisphere-mm-/) });
  });

  it('SEC-18: the event bubbles and is composed', async () => {
    const Mm = await manager(fakeWorkspaceModule({ log, configs, visuals }));
    const view = await render(Mm, base);
    const seen = listen(view.container.firstElementChild!);
    selectRow(0, { id: '0_abc' });
    expect([seen[0].bubbles, seen[0].composed]).toEqual([true, true]);
  });

  it('SEC-18: the event stays off the document', async () => {
    const Mm = await manager(fakeWorkspaceModule({ log, configs, visuals }));
    await render(Mm, base);
    const seen = listen(document);
    selectRow(0, { id: '0_abc' });
    expect(seen).toHaveLength(0);
  });

  it('SEC-18: the event reaches a listener on the host element', async () => {
    const Mm = await manager(fakeWorkspaceModule({ log, configs, visuals }));
    const view = await render(Mm, base);
    const seen = listen(view.container.firstElementChild!);
    selectRow(0, { id: '0_abc' });
    expect(seen).toHaveLength(1);
  });

  it('SEC-18: the event reaches a listener on the host and one inside it', async () => {
    await manager(fakeWorkspaceModule({ log, configs, visuals }));
    await import('../../src/adapters/webcomponent/media-manager').then(m => m.defineMediaManagerWebComponent());
    const el = document.createElement('kaltura-media-manager') as HTMLElement & { config: object };
    el.config = base;
    await act(async () => { document.body.appendChild(el); });
    await tick();
    const [onHost, inside, onDocument] = [listen(el), listen(el.firstElementChild!), listen(document)];
    selectRow(0, { id: '0_abc' });
    expect([onHost.length, inside.length, onDocument.length]).toEqual([1, 1, 0]);
  });

  it('SEC-18: a host listener does not see the event of another instance', async () => {
    const Mm = await manager(fakeWorkspaceModule({ log, configs, visuals }));
    const one = await render(Mm, base);
    await render(Mm, base);
    const seen = listen(one.container.firstElementChild!);
    selectRow(1, { id: '0_abc' });
    expect(seen).toHaveLength(0);
  });

  it('SEC-18: two instances report different instanceIds', async () => {
    const Mm = await manager(fakeWorkspaceModule({ log, configs, visuals }));
    const [one, two] = [await render(Mm, base), await render(Mm, base)];
    const [first, second] = [listen(one.container.firstElementChild!), listen(two.container.firstElementChild!)];
    selectRow(0, { id: '0_abc' });
    selectRow(1, { id: '0_abc' });
    expect(first[0].detail.instanceId).not.toBe(second[0].detail.instanceId);
  });

  it('SEC-18: the multi-select confirm event has the instanceId and entries', async () => {
    const Mm = await manager(fakeWorkspaceModule({ log, configs, visuals }));
    const view = await render(Mm, { ...base, multiSelect: true });
    const seen = listen(view.container.firstElementChild!);
    selectRow(0, { id: '0_a', name: 'A' });
    selectRow(0, { id: '0_b', name: 'B' });
    act(() => view.container.querySelector<HTMLButtonElement>('.mm-confirm-btn')!.click());
    expect(seen[0].detail).toMatchObject({ entryId: '0_a,0_b', instanceId: expect.stringMatching(/^unisphere-mm-/) });
  });

  it('SEC-18: the web component fires the event inside the custom element', async () => {
    await manager(fakeWorkspaceModule({ log, configs, visuals }));
    await import('../../src/adapters/webcomponent/media-manager').then(m => m.defineMediaManagerWebComponent());
    const el = document.createElement('kaltura-media-manager') as HTMLElement & { config: object };
    el.config = base;
    await act(async () => { document.body.appendChild(el); });
    await tick();
    const seen = listen(el);
    selectRow(0, { id: '0_abc' });
    expect(el.contains(seen[0].target as Node)).toBe(true);
  });
});
