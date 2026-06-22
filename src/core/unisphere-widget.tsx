import { useEffect, useRef } from 'react';
import { deriveLoaderUrl } from './media-manager';

export { deriveLoaderUrl };

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
    const loaderUrl = deriveLoaderUrl(props.serverUrl);

    import(/* @vite-ignore */ loaderUrl)
      .then((mod: { loader?: (cfg: unknown) => Promise<unknown> }) => {
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
        const loadErr = err as { message?: string };
        if (container) {
          container.innerHTML = `<div style="padding:20px;color:#ff6b6b;text-align:center">Failed to load ${props.label}: ${loadErr.message ?? String(err)}</div>`;
        }
      });

    return () => {
      killed = true;
      const ws = workspaceRef.current as { kill?: () => void } | null;
      ws?.kill?.();
      workspaceRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`kaltura-${props.runtimeName}-container`}
      style={{ width: '100%', minHeight: '500px' }}
    />
  );
}
