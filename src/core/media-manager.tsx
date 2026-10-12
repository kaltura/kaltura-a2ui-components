import { useEffect, useRef, useState } from 'react';
import { loadUnisphereModule } from './unisphere-loader';
import { renderLoadError } from './render-load-error';
import { KalturaMediaManagerApi } from '../schemas/media-manager';
import { withValidatedProps } from './validate-props';
import { withKs } from './ks';

export { deriveLoaderUrl } from './unisphere-loader';

export interface MediaManagerCoreProps {
  partnerId: number;
  ks: string;
  serverUrl: string;
  theme?: 'dark' | 'light';
  mode?: 'select' | 'manage';
  multiSelect?: boolean;
  contextId?: string;
  /**
   * Host option, not part of the A2UI schema. The React adapter always sets
   * it to `true`, so an agent cannot change it. Default `true`: the selection
   * event fires on the host element and bubbles up to `document`, as before.
   * `false` lets it bubble up to the host element only. The default flips in
   * the next release.
   */
  legacyDocumentEvents?: boolean;
}

interface SelectedEntry {
  entryId: string;
  name: string;
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

/** Kills a remote workspace. A throwing remote must not break React's unmount. */
function safely(fn: () => void): void {
  try {
    fn();
  } catch {
    // The remote is gone either way.
  }
}

interface RemoteWorkspace {
  kill?: () => void;
  getRuntimeAsync: (widgetName: string, runtimeName: string) => Promise<unknown>;
}

interface RemoteRuntime {
  mountVisual: (opts: unknown) => Promise<string>;
  unmountVisual?: (id: string) => void;
}

function MediaManagerView(props: MediaManagerCoreProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceIdRef = useRef('');
  const [selected, setSelected] = useState<SelectedEntry[]>([]);
  const { partnerId, ks, serverUrl, mode, contextId } = props;
  const isMultiSelect = props.multiSelect === true;
  const legacy = props.legacyDocumentEvents !== false;
  const themeProp = props.theme;

  /**
   * `kaltura-entry-selected` fires on the host element (the web component tag,
   * or the wrapper div in React) with the instance id. Legacy mode bubbles it
   * to `document` as before. Otherwise it fires on the wrapper inside the host
   * and bubbles up to the host element, and stops there. `name` is text from
   * the media library or the agent: treat it as untrusted.
   */
  const announce = (detail: Record<string, unknown>) => {
    const wrapper = hostRef.current;
    if (!wrapper) return;
    const host = wrapper.closest('kaltura-media-manager');
    const event = new CustomEvent('kaltura-entry-selected', {
      detail: { ...detail, instanceId: instanceIdRef.current },
      bubbles: true,
      composed: true,
    });
    if (legacy) {
      (host ?? wrapper).dispatchEvent(event);
      return;
    }
    const boundary = host ?? wrapper.parentElement ?? wrapper;
    const stop = (e: Event) => e.stopPropagation();
    boundary.addEventListener(event.type, stop);
    wrapper.dispatchEvent(event);
    boundary.removeEventListener(event.type, stop);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.replaceChildren();

    const instanceId = `unisphere-mm-${crypto.randomUUID()}`;
    container.id = instanceId;
    instanceIdRef.current = instanceId;

    let cancelled = false;
    let workspace: RemoteWorkspace | undefined;
    let runtime: RemoteRuntime | undefined;
    let visualId: string | undefined;
    // Safe to call twice: it clears what it released.
    const dispose = () => {
      const [rt, vid, ws] = [runtime, visualId, workspace];
      runtime = visualId = workspace = undefined;
      if (rt?.unmountVisual && vid) safely(() => rt.unmountVisual?.(vid));
      if (ws) safely(() => ws.kill?.());
    };

    const theme = themeProp ?? (document.documentElement.getAttribute('data-theme') as 'dark' | 'light') ?? 'dark';

    const context = contextId ? { type: 'category', initialCategoryId: contextId } : { type: 'myMedia' };

    const onSelect = (row: { id?: string; name?: string }) => {
      if (cancelled || !row?.id) return;
      const entryId = row.id;
      const name = row.name || entryId;
      if (isMultiSelect) {
        setSelected(prev =>
          prev.some(s => s.entryId === entryId) || prev.length >= 5 ? prev : [...prev, { entryId, name }],
        );
      } else {
        announce({ entryId, name });
      }
    };

    (async () => {
      const { createWorkspace } = await loadUnisphereModule<{
        createWorkspace?: (cfg: unknown) => Promise<unknown>;
      }>(serverUrl);
      if (cancelled) return;
      if (typeof createWorkspace !== 'function') throw new Error('Unisphere createWorkspace is missing');

      workspace = (await createWorkspace(buildWorkspaceConfig({ ks, partnerId, instanceId, theme }))) as RemoteWorkspace;
      // The effect was cleaned up while this ran: nobody else will kill it.
      if (cancelled) return dispose();

      // runtimeName MUST be the fixed manifest id 'kaltura-items-media-manager'.
      // A per-instance name can't resolve to any bundle in /v1/runtime.json.
      const rt = (await workspace.getRuntimeAsync(
        'unisphere.widget.media-manager',
        'kaltura-items-media-manager',
      )) as RemoteRuntime;
      if (cancelled) return;
      runtime = rt;

      // After a cleanup mid-mount the workspace is already killed: nothing is left to undo.
      visualId = await rt.mountVisual({
        type: 'table',
        target: instanceId,
        settings: {
          mode: mode ?? 'select',
          context,
          rowActions: { buttons: [{ type: 'select', onClick: onSelect }] },
        },
      });
    })().catch(err => {
      if (cancelled) return;
      console.error('[MediaManager] Load failed:', err);
      renderLoadError(container, 'Media Manager', err);
    });

    return () => {
      cancelled = true;
      dispose();
    };
    // announce reads only refs and the stable legacy flag.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId, ks, serverUrl, themeProp, mode, contextId, isMultiSelect, legacy]);

  const handleConfirmSelection = () => {
    if (selected.length === 0) return;
    const details = selected.map(s =>
      s.name !== s.entryId ? `"${s.name}" (${s.entryId})` : s.entryId,
    );
    announce({
      entryId: selected.map(s => s.entryId).join(','),
      name: details.join(', '),
      entries: selected,
    });
    setSelected([]);
  };

  const handleRemove = (entryId: string) => {
    setSelected(prev => prev.filter(s => s.entryId !== entryId));
  };

  return (
    <div ref={hostRef} className="kaltura-media-manager-container">
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

export const MediaManagerCore = withKs(
  'media-manager',
  withValidatedProps(KalturaMediaManagerApi.schema.required({ ks: true }), 'Media Manager', MediaManagerView),
);
