import type { FC } from 'react';
export interface CaptionsEditorCoreProps {
    partnerId: number;
    ks: string;
    entryId: string;
    uiconfId?: number;
}
export declare function buildCaptionsEditorUrl(p: CaptionsEditorCoreProps): string;
export declare const CaptionsEditorCore: FC<CaptionsEditorCoreProps>;
//# sourceMappingURL=captions-editor.d.ts.map