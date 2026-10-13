import { type KalturaWidget } from './host-hooks.js';
export { deriveLoaderUrl } from './unisphere-loader.js';
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
    /** Names the widget in `setErrorHandler` reports. Default `unisphere`. */
    widget?: KalturaWidget;
}
export declare function UnisphereWidgetCore(props: UnisphereWidgetCoreProps): import("react").JSX.Element;
//# sourceMappingURL=unisphere-widget.d.ts.map