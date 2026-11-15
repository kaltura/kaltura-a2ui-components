import type { FC } from 'react';
export interface CaptionsEditorCoreProps {
    /** Kaltura partner (account) ID. */
    partnerId: number;
    /** Kaltura Session. The host KS provider is used first. */
    ks: string;
    /** Entry whose captions to edit. */
    entryId: string;
    /** Caption asset to open. Default: the editor picks. */
    assetId?: string;
    /** Region code. Only built-in regions with a pinned editor page work. Default: the host region. */
    region?: string;
    /** uiConf ID of the editor's own player. */
    uiconfId?: number;
}
export declare const CaptionsEditorCore: FC<Omit<CaptionsEditorCoreProps, "ks"> & {
    ks?: string;
}>;
//# sourceMappingURL=captions-editor.d.ts.map