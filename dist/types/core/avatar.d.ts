import type { FC } from 'react';
export interface AvatarCoreProps {
    /** Kaltura partner (account) ID. */
    partnerId: number;
    /** Unisphere URL. Defaults to the Unisphere host of the region. Only Kaltura hosts and `setExtraAllowedOrigins` are accepted. */
    serverUrl?: string;
    /** Start the session on load. Default: false, the user clicks to start. */
    autoConnect?: boolean;
    /** What the avatar says first. Plain text. */
    openingPhrase?: string;
    /** Show captions of what the avatar says. */
    captions?: boolean;
    /** Default: `light` when the page has `data-theme="light"`, else `dark`. */
    theme?: 'light' | 'dark' | 'studio';
}
/** The avatar takes its KS from `setKsProvider` only. A `ks` prop is dropped, because the KS picks the agent. */
export declare const AvatarCore: FC<AvatarCoreProps>;
//# sourceMappingURL=avatar.d.ts.map