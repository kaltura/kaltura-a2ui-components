import { useEffect, useRef } from 'react';
import { loadUnisphereModule } from './unisphere-loader';
import { renderLoadError } from './render-load-error';
import { KalturaFailure, type KalturaWidget } from './host-hooks';

export { deriveLoaderUrl } from './unisphere-loader';

export interface UnisphereWidgetCoreProps {
  partnerId: number;
  ks: string;
  serverUrl: string;
  widgetName: string;
  runtimeName: string;
  runtimeSettings?: Record<string, unknown>;
  /** A visual type the runtime declares. The loader rejects any other. */
  visualType: string;
  visualSettings?: Record<string, unknown>;
  /** More runtimes of the same widget. Each mounts one visual on the page body, so use them for modals only. */
  extraRuntimes?: { runtimeName: string; settings: Record<string, unknown>; visualType: string }[];
  /** Runs once the workspace has loaded, with the runtime. A throw shows the load error. `isCancelled` turns true on unmount. */
  onRuntime?: (runtime: unknown, isCancelled: () => boolean) => void | Promise<void>;
  label: string;
  /** Class of the container. Default `kaltura-<runtimeName>-container`. */
  containerClass?: string;
  /** Names the widget in `setErrorHandler` reports. Default `unisphere`. */
  widget?: KalturaWidget;
}

/** Kills a remote workspace. A throwing remote must not break React's unmount. */
function killWorkspace(workspace: unknown): void {
  try {
    (workspace as { kill?: () => void } | null)?.kill?.();
  } catch {
    // The workspace is gone either way.
  }
}

export function UnisphereWidgetCore(props: UnisphereWidgetCoreProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { partnerId, ks, serverUrl, widgetName, runtimeName, visualType, label, widget = 'unisphere' } = props;
  const onRuntimeRef = useRef(props.onRuntime);
  onRuntimeRef.current = props.onRuntime;
  // Settings objects are rebuilt on every render. Compare them by value.
  const settingsKey = JSON.stringify([props.runtimeSettings, props.visualSettings, props.extraRuntimes]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;
    let workspace: unknown = null;
    container.replaceChildren();

    const id = `unisphere-${runtimeName}-${crypto.randomUUID()}`;
    container.id = id;

    const theme =
      (document.documentElement.getAttribute('data-theme') as 'dark' | 'light') || 'dark';
    const [runtimeSettings, visualSettings, extraRuntimes] = JSON.parse(settingsKey) as [
      Record<string, unknown> | undefined,
      Record<string, unknown> | undefined,
      UnisphereWidgetCoreProps['extraRuntimes'] | null,
    ];

    loadUnisphereModule<{ loader?: (cfg: unknown) => Promise<unknown> }>(serverUrl)
      .then(mod => {
        if (cancelled) return;
        const { loader } = mod;
        if (typeof loader !== 'function') throw new KalturaFailure('load-failed', 'Unisphere loader is missing');

        return loader({
          serverUrl,
          appId: `kaltura-agent-${id}`,
          workspace: id,
          session: { ks, partnerId },
          ui: { theme, language: 'en' },
          runtimes: [
            {
              widgetName,
              runtimeName,
              settings: runtimeSettings ?? {},
              visuals: [
                {
                  type: visualType,
                  target: id,
                  settings: visualSettings || {},
                },
              ],
            },
            ...(extraRuntimes ?? []).map(extra => ({
              widgetName,
              runtimeName: extra.runtimeName,
              settings: extra.settings,
              visuals: [{ type: extra.visualType, target: { target: 'body' }, settings: {} }],
            })),
          ],
        });
      })
      .then(ws => {
        if (!ws) return;
        workspace = ws;
        // The effect was cleaned up while the load ran: nobody else will kill it.
        if (cancelled) return killWorkspace(ws);
        const onRuntime = onRuntimeRef.current;
        if (!onRuntime) return;
        const remote = ws as { getRuntimeAsync: (widgetName: string, runtimeName: string) => Promise<unknown> };
        return remote.getRuntimeAsync(widgetName, runtimeName).then(runtime => (cancelled ? undefined : onRuntime(runtime, () => cancelled)));
      })
      .catch(err => {
        if (cancelled) return;
        renderLoadError(container, label, err, widget);
      });

    return () => {
      cancelled = true;
      killWorkspace(workspace);
      workspace = null;
    };
  }, [partnerId, ks, serverUrl, widgetName, runtimeName, visualType, label, widget, settingsKey]);

  return (
    <div
      ref={containerRef}
      className={props.containerClass ?? `kaltura-${props.runtimeName}-container`}
      style={{ width: '100%', minHeight: '500px' }}
    />
  );
}
