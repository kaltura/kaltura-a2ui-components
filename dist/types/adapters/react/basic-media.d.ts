import type { WebComponentImplementation } from '@a2ui/web_core/universal';
/**
 * Wraps a basic Image, Video or AudioPlayer so its `url` (and a Video `posterUrl`) loads only from a
 * Kaltura host or a `setExtraMediaOrigins` origin, a basic Text so its
 * markdown shows only Kaltura images (SEC-05), and a basic TextField or Slider so its
 * label names its input. Other components pass through.
 * A guarded element gets the tag `kaltura-<basic tag>`, because one class
 * cannot be defined under two tags.
 */
export declare function guardBasic(base: WebComponentImplementation): WebComponentImplementation;
//# sourceMappingURL=basic-media.d.ts.map