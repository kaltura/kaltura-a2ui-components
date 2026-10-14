import { useContext, useEffect, useRef, useState } from 'react';
import { defaultServerUrl, loadUnisphereModule } from './unisphere-loader';
import { renderLoadError } from './render-load-error';
import { KalturaMediaManagerApi } from '../schemas/media-manager';
import { withValidatedProps } from './validate-props';
import { withKs, withKsProp } from './ks';
import { isEntryId } from './ids';
import { emitEvent, KalturaFailure, ReporterContext, type KalturaEvent } from './host-hooks';

export { deriveLoaderUrl } from './unisphere-loader';

export interface MediaManagerCoreProps {
  partnerId: number;
  ks: string;
  serverUrl?: string;
  theme?: 'dark' | 'light';
  mode?: 'select' | 'manage';
  multiSelect?: boolean;
  contextId?: string;
}

/** Longest entry name kept from the media library. */
const MAX_NAME_LENGTH = 500;

interface SelectedEntry {
  entryId: string;
  name: string;
}

/**
 * Builds the createWorkspace config for an isolated Media Manager instance.
 * The live loader needs `appVersion`, `env` (the region code of the Unisphere
 * host, `nvp1` in `unisphere.nvp1.ovp.kaltura.com`) and `session`.
 */
export function buildWorkspaceConfig(props: {
  ks: string;
  partnerId: number;
  instanceId: string;
  theme: 'dark' | 'light';
  serverUrl: string;
}): {
  config: {
    appId: string;
    appVersion: string;
    env: string;
    session: { ks: string; partnerId: number };
    experiences: {
      'media-manager': {
        'kaltura-media-manager': {
          settings: { ks: string; partnerId: number };
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
      // Names this integration, not the package, so it does not track releases.
      appVersion: '1.0.0',
      env: /^unisphere\.([a-z0-9]+)\.ovp\.kaltura\.com$/.exec(new URL(props.serverUrl).hostname)?.[1] ?? '',
      session: { ks: props.ks, partnerId: props.partnerId },
      experiences: {
        'media-manager': {
          'kaltura-media-manager': {
            settings: {
              ks: props.ks,
              partnerId: props.partnerId,
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
  mountVisual: (opts: unknown) => Promise<{ id: string }>;
  unmountVisual?: (id: string) => void;
}

function MediaManagerView(props: MediaManagerCoreProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceIdRef = useRef('');
  const [selected, setSelected] = useState<SelectedEntry[]>([]);
  const { partnerId, ks, mode, contextId } = props;
  const serverUrl = props.serverUrl ?? defaultServerUrl();
  const isMultiSelect = props.multiSelect === true;
  const themeProp = props.theme;
  const reporter = useContext(ReporterContext);

  /**
   * `kaltura-entry-selected` fires on the wrapper inside the host element (the
   * web component tag, or the parent in React) with the instance id. It bubbles
   * up to the host element and stops there, so it never reaches `document`.
   * `name` is text from the media library or the agent: treat it as untrusted.
   * The host event handler gets the same detail.
   */
  const announce = (selection: Omit<Extract<KalturaEvent, { type: 'entry-selected' }>['detail'], 'instanceId'>) => {
    const wrapper = hostRef.current;
    if (!wrapper) return;
    const host = wrapper.closest('kaltura-media-manager');
    const detail = { ...selection, instanceId: instanceIdRef.current };
    emitEvent({ type: 'entry-selected', widget: 'media-manager', detail }, reporter);
    const event = new CustomEvent('kaltura-entry-selected', {
      detail,
      bubbles: true,
      composed: true,
    });
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

    const onSelect = (row: { id?: unknown; name?: unknown }) => {
      // The row comes from the remote runtime: check the id and cap the name before use.
      if (cancelled || !isEntryId(row?.id)) return;
      const entryId = row.id;
      const name = typeof row.name === 'string' && row.name ? row.name.slice(0, MAX_NAME_LENGTH) : entryId;
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
      if (typeof createWorkspace !== 'function') throw new KalturaFailure('load-failed', 'Unisphere createWorkspace is missing');

      workspace = (await createWorkspace(buildWorkspaceConfig({ ks, partnerId, instanceId, theme, serverUrl }))) as RemoteWorkspace;
      // The effect was cleaned up while this ran: nobody else will kill it.
      if (cancelled) return dispose();

      // runtimeName MUST be a manifest id of /v1/runtime.json, and the one that takes
      // `context` and `rowActions`. 'kaltura-items-media-manager' has no working
      // row-selected callback in the live loader. A per-instance name resolves to no bundle.
      const rt = (await workspace.getRuntimeAsync(
        'unisphere.widget.media-manager',
        'kaltura-media-manager',
      )) as RemoteRuntime;
      if (cancelled) return;
      runtime = rt;

      // After a cleanup mid-mount the workspace is already killed: nothing is left to undo.
      // The runtime has no `mode` setting: manage mode just shows no select button.
      const visual = await rt.mountVisual({
        type: 'table',
        target: instanceId,
        settings: {
          context: {
            ...context,
            filtersByType: { allowDocuments: true },
            ...(mode === 'manage' ? {} : { rowActions: { buttons: [{ type: 'select', onClick: onSelect }] } }),
          },
        },
      });
      visualId = visual.id;
    })().catch(err => {
      if (cancelled) return;
      console.error('[MediaManager] Load failed');
      renderLoadError(container, 'Media Manager', err, 'media-manager', reporter);
    });

    return () => {
      cancelled = true;
      dispose();
    };
    // announce reads only refs and the stable reporter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId, ks, serverUrl, themeProp, mode, contextId, isMultiSelect, reporter]);

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
  withValidatedProps(withKsProp(KalturaMediaManagerApi.schema), 'Media Manager', MediaManagerView, 'media-manager'),
);
