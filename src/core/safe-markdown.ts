import { renderMarkdown } from '@a2ui/markdown-it';

/**
 * Markdown comes from agent output. A remote image URL is a zero-click way to
 * send data out (the URL itself carries it), so images may only load from
 * Kaltura CDN hosts. DOMPurify is only a transitive dependency of
 * @a2ui/markdown-it, so this file uses DOMParser instead of importing it.
 */

/**
 * Kaltura CDN allowlist: https only, default port, no credentials, and a host
 * that is `kaltura.com` or a subdomain of it. This covers the hosts used in
 * this repo (cdnapisec.kaltura.com, cfvod.kaltura.com). Returns the
 * normalised URL, or '' when the URL is not allowed.
 */
export function toKalturaCdnUrl(value: unknown): string {
  if (typeof value !== 'string') return '';
  let url: URL;
  try {
    url = new URL(value); // no base: relative and protocol-relative URLs throw
  } catch {
    return '';
  }
  const { protocol, username, password, port, hostname } = url;
  const kalturaHost = hostname === 'kaltura.com' || hostname.endsWith('.kaltura.com');
  return protocol === 'https:' && !username && !password && !port && kalturaHost ? url.href : '';
}

const ALLOWED_TAGS = new Set([
  'a', 'img', 'p', 'br', 'hr', 'span', 'div', 'strong', 'b', 'em', 'i', 'u', 's', 'del',
  'sub', 'sup', 'code', 'pre', 'blockquote', 'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
]);

// Per-tag attribute allowlist. Anything else (srcset, poster, background, on*, id) is dropped.
const ALLOWED_ATTRS: Record<string, string[]> = {
  a: ['href', 'title'],
  img: ['src', 'alt', 'title'],
  ol: ['start'],
  th: ['style'],
  td: ['style'],
};

// markdown-it writes table alignment as an inline style. Nothing else is kept.
const ALIGN_STYLE = /^text-align:\s*(left|right|center);?$/i;
const LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

function isSafeLink(value: string): boolean {
  try {
    // The URL parser strips the same tabs, newlines and spaces a browser strips
    return LINK_PROTOCOLS.has(new URL(value, 'https://placeholder.invalid').protocol);
  } catch {
    return false;
  }
}

/** Removes everything but plain formatting tags, safe links and Kaltura CDN images. */
export function sanitizeMarkdownHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  for (const el of Array.from(doc.body.querySelectorAll('*'))) {
    const tag = el.tagName.toLowerCase();
    if (!doc.body.contains(el)) continue; // inside a removed parent
    if (!ALLOWED_TAGS.has(tag)) {
      el.remove();
      continue;
    }
    for (const attr of Array.from(el.attributes)) {
      if (!ALLOWED_ATTRS[tag]?.includes(attr.name)) el.removeAttribute(attr.name);
    }
    if (tag === 'img') {
      const src = toKalturaCdnUrl(el.getAttribute('src'));
      if (src) el.setAttribute('src', src);
      else el.remove();
    } else if (tag === 'a') {
      const href = el.getAttribute('href');
      if (href !== null && !isSafeLink(href)) el.removeAttribute('href');
      el.setAttribute('rel', 'noopener noreferrer');
    } else if (el.hasAttribute('style') && !ALIGN_STYLE.test(el.getAttribute('style') ?? '')) {
      el.removeAttribute('style');
    }
  }
  return doc.body.innerHTML;
}

/** renderMarkdown plus a second, stricter pass. Safe to put in innerHTML. */
export async function renderSafeMarkdown(text: string): Promise<string> {
  return sanitizeMarkdownHtml(await renderMarkdown(text));
}
