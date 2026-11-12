import type { WebComponentImplementation } from '@a2ui/web_core/universal';
import { getMarkdownRenderer, type MarkdownRenderer } from '@a2ui/web_core/catalogs/basic/v1';
import { isAllowedMediaUrl } from '../../core/media-url';
import { sanitizeMarkdownHtml } from '../../core/safe-markdown';
import { reportError, type KalturaWidget } from '../../core/host-hooks';

const MEDIA_WIDGETS: Record<string, KalturaWidget> = { Image: 'image', Video: 'video', AudioPlayer: 'audio-player' };

/** The parts of a basic catalog Lit element that the guard uses. */
type BasicElement = new (...args: unknown[]) => HTMLElement & {
  readonly controller?: { readonly props?: { readonly url?: unknown; readonly posterUrl?: unknown } };
  render(): unknown;
  updated?(changed: unknown): void;
};

let fieldCount = 0;

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

    // The 1.0 TextField renders a <label> that is not tied to its input. Tie them so screen readers name the field.
    updated(changed: unknown) {
      super.updated?.(changed);
      if (name !== 'TextField') return;
      const label = this.querySelector('label');
      const field = this.querySelector('input, textarea');
      if (!label || !field) return;
      field.id ||= `kaltura-a2ui-field-${++fieldCount}`;
      label.htmlFor = field.id;
    }

    render() {
      if (!widget) return super.render();
      const props = this.controller?.props;
      // The 1.0 Video element renders `poster=${posterUrl}`, so it needs the same check as `url`.
      const poster = name === 'Video' ? props?.posterUrl : undefined;
      const url = props?.url;
      if (isAllowedMediaUrl(url) && (poster === undefined || poster === '' || isAllowedMediaUrl(poster))) {
        this.#reported = undefined;
        return super.render();
      }
      const rejected = isAllowedMediaUrl(url) ? poster : url;
      if (rejected !== undefined && rejected !== '' && rejected !== this.#reported) {
        this.#reported = rejected;
        reportError('url-rejected', widget, `${name} url is not allowed`);
      }
      return undefined;
    }
  }
  return Guarded;
}

/**
 * Wraps a basic Image, Video or AudioPlayer so its `url` (and a Video `posterUrl`) loads only from a
 * Kaltura host or a `setExtraMediaOrigins` origin, a basic Text so its
 * markdown shows only Kaltura images (SEC-05), and a basic TextField so its
 * label names its input. Other components pass through.
 * A guarded element gets the tag `kaltura-<basic tag>`, because one class
 * cannot be defined under two tags.
 */
export function guardBasic(base: WebComponentImplementation): WebComponentImplementation {
  if (base.name !== 'Text' && base.name !== 'TextField' && !Object.hasOwn(MEDIA_WIDGETS, base.name)) return base;
  return { ...base, tagName: `kaltura-${base.tagName}`, element: guardedElement(base.name, base.element as BasicElement) };
}
