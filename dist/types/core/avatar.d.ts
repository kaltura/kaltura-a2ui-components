import type { FC } from 'react';
export interface AvatarCoreProps {
    partnerId: number;
    serverUrl: string;
    autoConnect?: boolean;
    openingPhrase?: string;
    captions?: boolean;
    theme?: 'light' | 'dark' | 'studio';
}
/** The avatar takes its KS from `setKsProvider` only. A `ks` prop is dropped, because the KS picks the agent. */
export declare const AvatarCore: FC<AvatarCoreProps>;
//# sourceMappingURL=avatar.d.ts.map