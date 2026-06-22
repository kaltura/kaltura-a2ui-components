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

/** Builds the createWorkspace config for an isolated Media Manager instance. */
export function buildWorkspaceConfig(props: {
  ks: string;
  partnerId: number;
  instanceId: string;
  theme: 'dark' | 'light';
}): {
  config: {
    appId: string;
    appVersion: string;
    experiences: {
      'media-manager': {
        'kaltura-media-manager': {
          settings: { ks: string; partnerId: number; supportDocuments: boolean };
        };
      };
    };
    ui: { theme: 'dark' | 'light'; language: string };
  };
  workspaceName: string;
} {
  return {
    config: {
      appId: `kaltura-agent-${props.instanceId}`,
      appVersion: '0.3.0',
      experiences: {
        'media-manager': {
          'kaltura-media-manager': {
            settings: {
              ks: props.ks,
              partnerId: props.partnerId,
              supportDocuments: true,
            },
          },
        },
      },
      ui: { theme: props.theme, language: 'en' },
    },
    // Each instance gets its own named workspace — no shared singleton,
    // no "workspace already reserved" collision across concurrent surfaces.
    workspaceName: props.instanceId,
  };
}

export function MediaManagerCore(props: MediaManagerCoreProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<unknown>(null);
  const visualIdRef = useRef<string | null>(null);
  const [selected, setSelected] = useState<SelectedEntry[]>([]);
  const isMultiSelect = props.multiSelect === true;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const instanceId = `unisphere-mm-${crypto.randomUUID()}`;
    container.id = instanceId;

    let cancelled = false;
    const theme =
      props.theme ??
      (document.documentElement.getAttribute('data-theme') as 'dark' | 'light') ??
      'dark';
    const loaderUrl = deriveLoaderUrl(props.serverUrl);

    const context = props.contextId
      ? { type: 'category', initialCategoryId: props.contextId }
      : { type: 'myMedia' };

    import(/* @vite-ignore */ loaderUrl)
      .then(async (mod: { createWorkspace?: (cfg: unknown) => Promise<unknown> }) => {
        if (cancelled) return;
        const { createWorkspace } = mod;
        if (!createWorkspace) return;

        const workspace = await createWorkspace(
          buildWorkspaceConfig({ ks: props.ks, partnerId: props.partnerId, instanceId, theme }),
        );
        if (cancelled) return;

        const ws = workspace as {
          getRuntimeAsync: (widgetName: string, runtimeName: string) => Promise<unknown>;
        };
        // runtimeName MUST be the fixed manifest id 'kaltura-items-media-manager'.
        // A per-instance name can't resolve to any bundle in /v1/runtime.json.
        const runtime = await ws.getRuntimeAsync(
          'unisphere.widget.media-manager',
          'kaltura-items-media-manager',
        );
        if (cancelled) return;

        runtimeRef.current = runtime;

        const rt = runtime as {
          mountVisual: (opts: unknown) => Promise<string>;
        };
        const visualId = await rt.mountVisual({
          type: 'table',
          target: instanceId,
          settings: {
            mode: props.mode ?? 'select',
            context,
            rowActions: {
              buttons: [
                {
                  type: 'select',
                  onClick: (row: { id?: string; name?: string }) => {
                    if (!row?.id) return;
                    const entryId = row.id;
                    const name = row.name || entryId;
                    if (isMultiSelect) {
                      setSelected(prev =>
                        prev.some(s => s.entryId === entryId) || prev.length >= 5
                          ? prev
                          : [...prev, { entryId, name }],
                      );
                    } else {
                      document.dispatchEvent(
                        new CustomEvent('kaltura-entry-selected', {
                          detail: { entryId, name },
                        }),
                      );
                    }
                  },
                },
              ],
            },
          },
        });
        if (cancelled) return;
        visualIdRef.current = visualId;
      })
      .catch(err => {
        if (cancelled) return;
        console.error('[MediaManager] Load failed:', err);
        const loadErr = err as { message?: string };
        if (container) {
          container.innerHTML = `<div style="padding:20px;color:#ff6b6b;text-align:center">Failed to load Media Manager: ${loadErr.message ?? String(err)}</div>`;
        }
      });

    return () => {
      cancelled = true;
      const rt = runtimeRef.current as { unmountVisual?: (id: string) => void } | null;
      const vid = visualIdRef.current;
      if (rt?.unmountVisual && vid) rt.unmountVisual(vid);
      runtimeRef.current = null;
      visualIdRef.current = null;
    };
  }, []);

  const handleConfirmSelection = () => {
    if (selected.length === 0) return;
    const details = selected.map(s =>
      s.name !== s.entryId ? `"${s.name}" (${s.entryId})` : s.entryId,
    );
    document.dispatchEvent(
      new CustomEvent('kaltura-entry-selected', {
        detail: {
          entryId: selected.map(s => s.entryId).join(','),
          name: details.join(', '),
          entries: selected,
        },
      }),
    );
    setSelected([]);
  };

  const handleRemove = (entryId: string) => {
    setSelected(prev => prev.filter(s => s.entryId !== entryId));
  };

  return (
    <div className="kaltura-media-manager-container">
      <div ref={containerRef} className="kaltura-media-manager-widget" />
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
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <button className="mm-confirm-btn" onClick={handleConfirmSelection}>
            Use {selected.length} entr{selected.length === 1 ? 'y' : 'ies'}
          </button>
        </div>
      )}
    </div>
  );
}
