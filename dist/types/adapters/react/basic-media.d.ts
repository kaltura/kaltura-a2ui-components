import type { WebComponentImplementation } from '@a2ui/web_core/v0_9/universal';
/**
 * Wraps a basic Image, Video or AudioPlayer so its `url` loads only from a
 * Kaltura host or a `setExtraMediaOrigins` origin, and a basic Text so its
 * markdown shows only Kaltura images (SEC-05). Other components pass through.
 * A guarded element gets the tag `kaltura-<basic tag>`, because one class
 * cannot be defined under two tags.
 */
export declare function guardBasic(base: WebComponentImplementation): WebComponentImplementation;
//# sourceMappingURL=basic-media.d.ts.map