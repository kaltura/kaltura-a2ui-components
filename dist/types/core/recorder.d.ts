import type { FC } from 'react';
export interface RecorderCoreProps {
    partnerId: number;
    ks: string;
    uiconfId?: number;
}
export declare const RecorderCore: FC<Omit<RecorderCoreProps, "ks"> & {
    ks?: string;
}>;
//# sourceMappingURL=recorder.d.ts.map