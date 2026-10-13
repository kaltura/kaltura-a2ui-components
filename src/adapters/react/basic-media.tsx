import type { WebComponentImplementation } from '@a2ui/web_core/v0_9/universal';
import { getMarkdownRenderer, type MarkdownRenderer } from '@a2ui/web_core/v0_9/basic_catalog';
import { isAllowedMediaUrl } from '../../core/media-url';
import { sanitizeMarkdownHtml } from '../../core/safe-markdown';
import { reportError, type KalturaWidget } from '../../core/host-hooks';

const MEDIA_WIDGETS: Record<string, KalturaWidget> = { Image: 'image', Video: 'video', AudioPlayer: 'audio-player' };

/** The parts of a basic catalog Lit element that the guard uses. */
type BasicElement = new (...args: unknown[]) => HTMLElement & {
  readonly controller?: { readonly props?: { readonly url?: unknown } };
  render(): unknown;
};

const safeRenderers = new WeakMap<MarkdownRenderer, MarkdownRenderer>();

/** The host's markdown renderer, then our sanitiser, so images load only from Kaltura hosts. */
function safeRenderer(host: MarkdownRenderer | undefined): MarkdownRenderer | undefined {
  if (!host) return undefined;
  let safe = safeRenderers.get(host);
  if (!safe) safeRenderers.set(host, (safe = (...args) => Promise.resolve(host(...args)).then(sanitizeMarkdownHtml)));
  return safe;
}

function guardedElement(name: string, Base: BasicElement): BasicElement {
  const widget = MEDIA_WIDGETS[name];
  class Guarded extends Base {
    // The base caches its tag-scoped CSS on the class. Own copies scope it to our tag.
    static _processedSheet = undefined;
    static _processedCss = undefined;
    static _processedStyle = undefined;
    static _adoptedRoots = undefined;
    #reported: unknown;
    #consumed: MarkdownRenderer | undefined;

    // Text reads this field. A Lit context provider sets it, A2uiSurface sets the global one.
    get markdownRenderer() {
      return safeRenderer(this.#consumed ?? getMarkdownRenderer());
    }
    set markdownRenderer(renderer: MarkdownRenderer | undefined) {
      this.#consumed = renderer;
    }

    render() {
      if (!widget) return super.render();
      const url = this.controller?.props?.url;
      if (isAllowedMediaUrl(url)) {
        this.#reported = undefined;
        return super.render();
      }
      if (url !== undefined && url !== '' && url !== this.#reported) {
        this.#reported = url;
        reportError('url-rejected', widget, `${name} url is not allowed`);
      }
      return undefined;
    }
  }
  return Guarded;
}

/**
 * Wraps a basic Image, Video or AudioPlayer so its `url` loads only from a
 * Kaltura host or a `setExtraMediaOrigins` origin, and a basic Text so its
 * markdown shows only Kaltura images (SEC-05). Other components pass through.
 * A guarded element gets the tag `kaltura-<basic tag>`, because one class
 * cannot be defined under two tags.
 */
export function guardBasic(base: WebComponentImplementation): WebComponentImplementation {
  if (base.name !== 'Text' && !Object.hasOwn(MEDIA_WIDGETS, base.name)) return base;
  return { ...base, tagName: `kaltura-${base.tagName}`, element: guardedElement(base.name, base.element as BasicElement) };
}
