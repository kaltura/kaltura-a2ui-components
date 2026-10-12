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

export function UnisphereWidgetCore(props: UnisphereWidgetCoreProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<unknown>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let killed = false;

    const id = `unisphere-${props.runtimeName}-${crypto.randomUUID()}`;
    container.id = id;

    const theme =
      (document.documentElement.getAttribute('data-theme') as 'dark' | 'light') || 'dark';

    loadUnisphereModule<{ loader?: (cfg: unknown) => Promise<unknown> }>(props.serverUrl)
      .then(mod => {
        if (killed) return;
        const { loader } = mod;
        if (!loader) return;

        const runtimeSettings: Record<string, unknown> = {
          ks: props.ks,
          partnerId: props.partnerId,
          ...props.runtimeSettings,
        };

        return loader({
          serverUrl: props.serverUrl,
          appId: `kaltura-agent-${id}`,
          workspace: id,
          appVersion: '0.3.0',
          session: { ks: props.ks, partnerId: props.partnerId },
          ui: { theme, language: 'en' },
          runtimes: [
            {
              widgetName: props.widgetName,
              runtimeName: props.runtimeName,
              settings: runtimeSettings,
              visuals: [
                {
                  type: props.visualType || 'default',
                  target: id,
                  settings: props.visualSettings || {},
                },
              ],
            },
          ],
        });
      })
      .then(ws => {
        if (killed || !ws) return;
        workspaceRef.current = ws;
      })
      .catch(err => {
        if (killed) return;
        renderLoadError(container, props.label, err);
      });

    return () => {
      killed = true;
      const ws = workspaceRef.current as { kill?: () => void } | null;
      ws?.kill?.();
      workspaceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Mount once: the remote runtime cannot be updated in place.
  }, []);

  return (
    <div
      ref={containerRef}
      className={`kaltura-${props.runtimeName}-container`}
      style={{ width: '100%', minHeight: '500px' }}
    />
  );
}
