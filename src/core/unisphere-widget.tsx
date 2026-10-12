import { useEffect, useRef } from 'react';
import { loadUnisphereModule } from './unisphere-loader';
import { renderLoadError } from './render-load-error';

export { deriveLoaderUrl } from './unisphere-loader';

export interface UnisphereWidgetCoreProps {
  partnerId: number;
  ks: string;
  serverUrl: string;
  widgetName: string;
  runtimeName: string;
  runtimeSettings?: Record<string, unknown>;
  visualType?: string;
  visualSettings?: Record<string, unknown>;
  label: string;
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
  const { partnerId, ks, serverUrl, widgetName, runtimeName, visualType, label } = props;
  // Settings objects are rebuilt on every render. Compare them by value.
  const settingsKey = JSON.stringify([props.runtimeSettings, props.visualSettings]);

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
    const [runtimeSettings, visualSettings] = JSON.parse(settingsKey) as [
      Record<string, unknown> | undefined,
      Record<string, unknown> | undefined,
    ];

    loadUnisphereModule<{ loader?: (cfg: unknown) => Promise<unknown> }>(serverUrl)
      .then(mod => {
        if (cancelled) return;
        const { loader } = mod;
        if (typeof loader !== 'function') throw new Error('Unisphere loader is missing');

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
              settings: { ks, partnerId, ...runtimeSettings },
              visuals: [
                {
                  type: visualType || 'default',
                  target: id,
                  settings: visualSettings || {},
                },
              ],
            },
          ],
        });
      })
      .then(ws => {
        if (!ws) return;
        workspace = ws;
        // The effect was cleaned up while the load ran: nobody else will kill it.
        if (cancelled) killWorkspace(ws);
      })
      .catch(err => {
        if (cancelled) return;
        renderLoadError(container, label, err);
      });

    return () => {
      cancelled = true;
      killWorkspace(workspace);
      workspace = null;
    };
  }, [partnerId, ks, serverUrl, widgetName, runtimeName, visualType, label, settingsKey]);

  return (
    <div
      ref={containerRef}
      className={`kaltura-${props.runtimeName}-container`}
      style={{ width: '100%', minHeight: '500px' }}
    />
  );
}
