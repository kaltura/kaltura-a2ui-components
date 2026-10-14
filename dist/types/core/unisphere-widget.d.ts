import { type KalturaWidget } from './host-hooks.js';
export { deriveLoaderUrl } from './unisphere-loader.js';
export interface UnisphereWidgetCoreProps {
    partnerId: number;
    ks: string;
    /** Unisphere host. Default: the host of the region set with `setRegion`. */
    serverUrl?: string;
    widgetName: string;
    runtimeName: string;
    runtimeSettings?: Record<string, unknown>;
    /** A visual type the runtime declares. The loader rejects any other. */
    visualType: string;
    visualSettings?: Record<string, unknown>;
    /** More runtimes of the same widget. Each mounts one visual on the page body, so use them for modals only. */
    extraRuntimes?: {
        runtimeName: string;
        settings: Record<string, unknown>;
        visualType: string;
    }[];
    /** Runs once the workspace has loaded, with the runtime. A throw shows the load error. `isCancelled` turns true on unmount. */
    onRuntime?: (runtime: unknown, isCancelled: () => boolean) => void | Promise<void>;
    label: string;
    /** Class of the container. Default `kaltura-<runtimeName>-container`. */
    containerClass?: string;
    /** Names the widget in `setErrorHandler` reports. Default `unisphere`. */
    widget?: KalturaWidget;
}
export declare function UnisphereWidgetCore(props: UnisphereWidgetCoreProps): import("react").JSX.Element;
//# sourceMappingURL=unisphere-widget.d.ts.map