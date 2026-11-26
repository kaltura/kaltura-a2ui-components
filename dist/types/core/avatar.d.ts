import type { FC } from 'react';
export interface AvatarCoreProps {
    /** Kaltura partner (account) ID. */
    partnerId: number;
    /** Unisphere URL. Defaults to the Unisphere host of the region. Only Kaltura hosts and `setExtraAllowedOrigins` are accepted. */
    serverUrl?: string;
    /** Region code or host-registered environment name. Default: the region of `serverUrl`, else the `setRegion` value. */
    region?: string;
    /** Start the session on load. Default: false, the user clicks to start. */
    autoConnect?: boolean;
    /** What the avatar says first. Plain text. */
    openingPhrase?: string;
    /** Show captions of what the avatar says. */
    captions?: boolean;
    /** Default: the page theme (`data-theme`, an `a2ui-dark` or `a2ui-light` class, then the system setting). */
    theme?: 'light' | 'dark' | 'studio';
}
/** The avatar takes its KS from `setKsProvider` only. A `ks` prop is dropped, because the KS picks the agent. */
export declare const AvatarCore: FC<AvatarCoreProps>;
//# sourceMappingURL=avatar.d.ts.map