import { renderMarkdown } from '@a2ui/markdown-it';
import { isAllowedMediaUrl } from './media-url';

/**
 * Markdown comes from agent output. A remote image URL is a zero-click way to
 * send data out (the URL itself carries it), so images load only from the
 * hosts the basic Image allows (isAllowedMediaUrl). DOMPurify is only a
 * transitive dependency of @a2ui/markdown-it, so this file uses DOMParser
 * instead of importing it.
 */

const ALLOWED_TAGS = new Set([
  'a', 'img', 'p', 'br', 'hr', 'span', 'div', 'strong', 'b', 'em', 'i', 'u', 's', 'del',
  'sub', 'sup', 'code', 'pre', 'blockquote', 'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
]);

// Per-tag attribute allowlist. Anything else (srcset, poster, background, on*, id) is dropped.
const ALLOWED_ATTRS: Record<string, string[]> = {
  a: ['href', 'title'],
  img: ['src', 'alt', 'title'],
  code: ['class'],
  ol: ['start'],
  th: ['style'],
  td: ['style'],
};

// markdown-it writes the fence language as a class on code. Nothing else is kept.
const CODE_CLASS = /^language-[A-Za-z0-9_-]+$/;
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

/** Removes everything but plain formatting tags, safe links and allowed images. */
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
      const src = el.getAttribute('src');
      if (src !== null && isAllowedMediaUrl(src)) el.setAttribute('src', new URL(src).href);
      else el.replaceWith(doc.createTextNode(el.getAttribute('alt') ?? ''));
    } else if (tag === 'code') {
      if (!CODE_CLASS.test(el.getAttribute('class') ?? '')) el.removeAttribute('class');
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
