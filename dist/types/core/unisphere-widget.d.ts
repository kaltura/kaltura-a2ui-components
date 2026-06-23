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
export declare function UnisphereWidgetCore(props: UnisphereWidgetCoreProps): import("react").JSX.Element;
//# sourceMappingURL=unisphere-widget.d.ts.map