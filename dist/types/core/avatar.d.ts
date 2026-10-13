import type { FC } from 'react';
export interface AvatarCoreProps {
    avatarId: string;
    projectId?: string;
    language?: string;
    autoStart?: boolean;
    allowInterrupt?: boolean;
}
/** Adds one script tag per URL. A failed load removes the tag, so a retry is possible. */
export declare function loadScriptOnce(src: string, integrity?: string): Promise<void>;
export declare const AvatarCore: FC<AvatarCoreProps>;
//# sourceMappingURL=avatar.d.ts.map