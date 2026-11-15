import { useContext, useEffect, useRef } from 'react';
import { loadUnisphereModule } from './unisphere-loader';
import { unisphereUrl } from './region';
import { readColorMode } from './color-mode';
import { renderLoadError } from './render-load-error';
import { KalturaFailure, ReporterContext, type KalturaWidget } from './host-hooks';
import { refusedIdProp } from './allowed-ids';

export { deriveLoaderUrl } from './unisphere-loader';

export interface UnisphereWidgetCoreProps {
  partnerId: number;
  ks: string;
  /** Unisphere host. Default: the Unisphere host of `region`. */
  serverUrl?: string;
  /** Region code or host-registered environment name. Default: the region of `serverUrl`, else the `setRegion` value. */
  region?: string;
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

/** The editors share the default workspace, because the Kaltura runtimes look it up by that name. It cannot be killed or loaded twice. */
const EDITORS_APP_ID = 'kaltura-a2ui-components';

interface Mount {
  failureReason?: unknown;
  unsubscribe?: () => void;
}

interface Runtime {
  mountVisual?: (visual: { type: string; target: unknown; settings: Record<string, unknown> }) => Mount;
}

interface Workspace {
  session?: { setData?: (update: () => { ks: string; partnerId: number }) => void };
  loadRuntime?: (widgetName: string, runtimeName: string, settings: Record<string, unknown>) => Promise<{ runtime: Runtime }>;
}

/** Closes the editor that is open. Editors cover the page, so only one is open at a time and the latest request wins. */
let closeActive: (() => void) | null = null;

export function UnisphereWidgetCore(props: UnisphereWidgetCoreProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { partnerId, ks, region, serverUrl: serverUrlProp, widgetName, runtimeName, visualType, label, widget = 'unisphere' } = props;
  // A drawer or application opens over the page, so its container stays empty and needs no box.
  const overlay = visualType !== 'page';
  const reporter = useContext(ReporterContext);
  const onRuntimeRef = useRef(props.onRuntime);
  onRuntimeRef.current = props.onRuntime;
  // Settings objects are rebuilt on every render. Compare them by value.
  const settingsKey = JSON.stringify([props.runtimeSettings, props.visualSettings, props.extraRuntimes]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;
    const mounts: Mount[] = [];
    container.replaceChildren();
    const refused = refusedIdProp({ partnerId });
    if (refused) {
      renderLoadError(container, label, new KalturaFailure('origin-not-allowed', `${refused} is not allowed`), widget, reporter);
      return;
    }

    let serverUrl: string;
    try {
      serverUrl = unisphereUrl(region, serverUrlProp);
    } catch (error) {
      renderLoadError(container, label, error, widget, reporter);
      return;
    }

    const id = `unisphere-${runtimeName}-${crypto.randomUUID()}`;
    container.id = id;

    const theme = readColorMode('dark');
    const [runtimeSettings, visualSettings, extraRuntimes] = JSON.parse(settingsKey) as [
      Record<string, unknown> | undefined,
      Record<string, unknown> | undefined,
      UnisphereWidgetCoreProps['extraRuntimes'] | null,
    ];

    const close = () => {
      cancelled = true;
      for (const mount of mounts.splice(0)) {
        try {
          mount.unsubscribe?.();
        } catch {
          // The visual is gone either way.
        }
      }
    };
    closeActive?.();
    closeActive = close;

    loadUnisphereModule<{ loader?: (cfg: unknown, options: unknown) => Promise<unknown> }>(serverUrl)
      .then(async mod => {
        if (cancelled) return;
        const { loader } = mod;
        if (typeof loader !== 'function') throw new KalturaFailure('load-failed', 'Unisphere loader is missing');

        // `proxy` returns the workspace that is already there. A later request must not fail because an earlier one loaded.
        const workspace = (await loader(
          { serverUrl, appId: EDITORS_APP_ID, session: { ks, partnerId }, ui: { theme, language: 'en' }, runtimes: [] },
          { existsConflictStrategy: 'proxy' },
        )) as Workspace | null;
        if (cancelled) return;
        if (typeof workspace?.loadRuntime !== 'function') throw new KalturaFailure('load-failed', 'Unisphere workspace is missing');
        // A workspace that an earlier request created keeps that request's session.
        workspace.session?.setData?.(() => ({ ks, partnerId }));

        const mount = async (runtimeName: string, settings: Record<string, unknown>, visual: { type: string; target: unknown; settings: Record<string, unknown> }) => {
          const { runtime } = await workspace.loadRuntime!(widgetName, runtimeName, settings);
          if (cancelled) return runtime;
          if (typeof runtime?.mountVisual !== 'function') throw new KalturaFailure('load-failed', 'Unisphere runtime is missing');
          const mounted = runtime.mountVisual(visual);
          mounts.push(mounted);
          if (mounted.failureReason) throw new KalturaFailure('load-failed', 'Unisphere visual could not mount');
          return runtime;
        };

        const runtime = await mount(runtimeName, runtimeSettings ?? {}, { type: visualType, target: { type: 'element', elementId: id }, settings: visualSettings || {} });
        for (const extra of extraRuntimes ?? []) {
          if (cancelled) return;
          await mount(extra.runtimeName, extra.settings, { type: extra.visualType, target: { type: 'body' }, settings: {} });
        }
        if (!cancelled) await onRuntimeRef.current?.(runtime, () => cancelled);
      })
      .catch(err => {
        if (cancelled) return;
        renderLoadError(container, label, err, widget, reporter);
      });

    return () => {
      if (closeActive === close) closeActive = null;
      close();
      container.replaceChildren();
    };
  }, [partnerId, ks, region, serverUrlProp, widgetName, runtimeName, visualType, label, widget, settingsKey, reporter]);

  return (
    <div
      ref={containerRef}
      className={`${props.containerClass ?? `kaltura-${props.runtimeName}-container`}${overlay ? ' kaltura-unisphere-overlay' : ''}`}
      style={overlay ? { width: '100%' } : { width: '100%', minHeight: '500px' }}
    />
  );
}
