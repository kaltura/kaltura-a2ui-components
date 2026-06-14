import { useEffect, useRef, useState } from 'react';

export interface MediaManagerCoreProps {
  partnerId: number;
  ks: string;
  serverUrl: string;
  theme?: 'dark' | 'light';
  mode?: 'select' | 'manage';
  multiSelect?: boolean;
  contextType?: string;
  contextId?: string;
  userId?: string;
}

interface SelectedEntry {
  entryId: string;
  name: string;
}

/** Derives the Unisphere loader URL from the base serverUrl. */
export function deriveLoaderUrl(serverUrl: string): string {
  return serverUrl.replace(/\/v1\/?$/, '/v1/loader/index.esm.js');
}

/** Builds the runtimes array passed to the Unisphere loader. */
export function buildRuntimes(props: {
  ks: string;
  partnerId: number;
  contextId?: string;
  mode?: 'select' | 'manage';
  instanceId: string;
}): unknown[] {
  const runtimeSettings: Record<string, unknown> = {
    ks: props.ks,
    partnerId: props.partnerId,
    contextType: 'category',
    supportDocuments: true,
  };
  if (props.contextId) runtimeSettings.contextId = props.contextId;

  return [{
    widgetName: 'unisphere.widget.media-manager',
    // The runtimeName MUST be the fixed manifest id
    // 'kaltura-items-media-manager' (per KALTURA_MEDIA_MANAGER_API).
    // A per-instance name (e.g. `media-manager-<uuid>`) can't resolve
    // to any bundle in /v1/runtime.json → "Failed to resolve element
    // runtime url" and the widget never loads. Multiple instances are
    // isolated by the visual `target` container id, not the runtime id.
    runtimeName: 'kaltura-items-media-manager',
    settings: runtimeSettings,
    visuals: [{
      type: 'table',
      target: props.instanceId,
      settings: {
        mode: props.mode || 'select',
      },
    }],
  }];
}

export function MediaManagerCore(props: MediaManagerCoreProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<unknown>(null);
  const [selected, setSelected] = useState<SelectedEntry[]>([]);
  const isMultiSelect = props.multiSelect === true;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const id = `unisphere-mm-${crypto.randomUUID()}`;
    container.id = id;

    let killed = false;
    const theme = (document.documentElement.getAttribute('data-theme') as 'dark' | 'light') || 'dark';
    const loaderUrl = deriveLoaderUrl(props.serverUrl);

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Ignore clicks on row controls (the "…" actions menu, Delete, Upload,
      // sort headers, search, type filter) — only an explicit "Select" button
      // or a click on the entry itself (thumbnail / name) should pick it.
      const ctrlBtn = target.closest('button');
      const isSelectBtn = ctrlBtn?.textContent?.trim() === 'Select';
      if (ctrlBtn && !isSelectBtn) return; // actions/delete/upload/etc.

      // Find the media row the click landed in. In manage mode there is no
      // per-row "Select" button (only the "…" menu), so a click on the
      // thumbnail or the name cell is how the user picks an entry to watch.
      const row = (isSelectBtn ? ctrlBtn : target).closest('tr');
      if (!row || !row.closest('tbody')) return;

      const img = row.querySelector('img');
      const src = img?.getAttribute('src') || '';
      const thumbMatch = src.match(/entry_id\/(\d_[a-zA-Z0-9]+)/);
      if (!thumbMatch?.[1]) return; // not a media row (e.g. a category folder)

      e.stopPropagation();
      e.preventDefault();

      const cells = row.querySelectorAll('td');
      const entryName = (cells[1]?.textContent || '').trim();
      const entryId = thumbMatch[1];
      const name = entryName || entryId;

      if (isMultiSelect) {
        setSelected(prev => {
          const exists = prev.some(s => s.entryId === entryId);
          if (exists) {
            row.classList.remove('mm-selected');
            return prev.filter(s => s.entryId !== entryId);
          }
          if (prev.length >= 5) return prev;
          row.classList.add('mm-selected');
          return [...prev, { entryId, name }];
        });
      } else {
        document.dispatchEvent(new CustomEvent('kaltura-entry-selected', {
          detail: { entryId, name },
        }));
      }
    };
    container.addEventListener('click', handleClick, true);

    const instanceId = id;
    import(/* @vite-ignore */ loaderUrl)
      .then((mod: { loader?: (cfg: unknown) => Promise<unknown> }) => {
        if (killed) return;
        const { loader } = mod;
        if (!loader) return;
        // Runtime settings per KALTURA_MEDIA_MANAGER_API §4: contextType is
        // always "category"; ks/partnerId override the workspace session;
        // contextId scopes to a category (omit = all accessible entries).
        return loader({
          serverUrl: props.serverUrl,
          appId: `kaltura-agent-${instanceId}`,
          workspace: instanceId,
          appVersion: '0.3.0',
          session: { ks: props.ks, partnerId: props.partnerId },
          ui: { theme, language: 'en' },
          runtimes: buildRuntimes({
            ks: props.ks,
            partnerId: props.partnerId,
            contextId: props.contextId,
            mode: props.mode,
            instanceId,
          }),
        });
      })
      .then(ws => {
        if (killed || !ws) return;
        workspaceRef.current = ws;
        // Prefer the official runtime API (KALTURA_MEDIA_MANAGER_API §6/§7):
        // subscribe to onRowSelected instead of scraping the DOM. The DOM
        // click handler above remains as a fallback for older bundles that
        // don't expose the event.
        try {
          const workspace = ws as {
            getRuntime?: (widgetName: string, runtimeName: string) => {
              onRowSelected?: { subscribe?: (cb: (entry: { id?: string; name?: string }) => void) => void };
            } | null;
          };
          const mm = workspace.getRuntime?.(
            'unisphere.widget.media-manager',
            'kaltura-items-media-manager',
          );
          mm?.onRowSelected?.subscribe?.((entry: { id?: string; name?: string }) => {
            if (!entry?.id) return;
            const entryId = entry.id;
            const name = entry.name || entryId;
            if (isMultiSelect) {
              setSelected(prev =>
                prev.some(s => s.entryId === entryId) || prev.length >= 5
                  ? prev
                  : [...prev, { entryId, name }],
              );
            } else {
              document.dispatchEvent(new CustomEvent('kaltura-entry-selected', {
                detail: { entryId, name },
              }));
            }
          });
        } catch (err) {
          console.warn('[MediaManager] onRowSelected unavailable, using DOM fallback', err);
        }
      })
      .catch(err => {
        if (killed) return;
        console.error('[MediaManager] Load failed:', err);
        const loadErr = err as { message?: string };
        container.innerHTML =
          `<div style="padding:20px;color:#ff6b6b;text-align:center">Failed to load Media Manager: ${loadErr.message ?? String(err)}</div>`;
      });

    return () => {
      killed = true;
      container.removeEventListener('click', handleClick, true);
      const ws = workspaceRef.current as { kill?: () => void } | null;
      ws?.kill?.();
      workspaceRef.current = null;
    };
  }, []);

  const handleConfirmSelection = () => {
    if (selected.length === 0) return;
    const details = selected.map(s =>
      s.name !== s.entryId ? `"${s.name}" (${s.entryId})` : s.entryId
    );
    document.dispatchEvent(new CustomEvent('kaltura-entry-selected', {
      detail: {
        entryId: selected.map(s => s.entryId).join(','),
        name: details.join(', '),
        entries: selected,
      },
    }));
    setSelected([]);
  };

  const handleRemove = (entryId: string) => {
    setSelected(prev => prev.filter(s => s.entryId !== entryId));
    const container = containerRef.current;
    if (container) {
      container.querySelectorAll('tr.mm-selected').forEach(row => {
        const img = row.querySelector('img');
        const src = img?.getAttribute('src') || '';
        if (src.includes(entryId)) row.classList.remove('mm-selected');
      });
    }
  };

  return (
    <div className="kaltura-media-manager-container">
      <div
        ref={containerRef}
        className="kaltura-media-manager-widget"
      />
      {isMultiSelect && selected.length > 0 && (
        <div className="mm-multi-select-bar">
          <div className="mm-selected-items">
            {selected.map(entry => (
              <span key={entry.entryId} className="mm-selected-chip">
                {entry.name}
                <button
                  className="mm-chip-remove"
                  onClick={() => handleRemove(entry.entryId)}
                  aria-label={`Remove ${entry.name}`}
                >×</button>
              </span>
            ))}
          </div>
          <button
            className="mm-confirm-btn"
            onClick={handleConfirmSelection}
          >
            Use {selected.length} entr{selected.length === 1 ? 'y' : 'ies'}
          </button>
        </div>
      )}
    </div>
  );
}
