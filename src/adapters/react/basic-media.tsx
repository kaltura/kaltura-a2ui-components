import { createElement, useEffect, useMemo, type FC, type ReactNode } from 'react';
import { ResolvedBinding } from '@a2ui/web_core/v0_9';
import {
  createComponentImplementation,
  MarkdownContext,
  useMarkdownRenderer,
  useSignalValue,
  type NodeViewProps,
  type ReactComponentImplementation,
} from '@a2ui/react/v0_9';
import { isAllowedMediaUrl } from '../../core/media-url';
import { sanitizeMarkdownHtml } from '../../core/safe-markdown';
import { reportError, type KalturaWidget } from '../../core/host-hooks';

const MEDIA_WIDGETS: Record<string, KalturaWidget> = { Image: 'image', Video: 'video', AudioPlayer: 'audio-player' };

/** True when `url` may load. Reports a set URL that may not. An unset URL renders nothing quietly. */
function useAllowedUrl(name: string, url: unknown): boolean {
  const allowed = isAllowedMediaUrl(url);
  const rejected = !allowed && url !== undefined && url !== '';
  useEffect(() => {
    if (rejected) reportError('url-rejected', MEDIA_WIDGETS[name], `${name} url is not allowed`);
  }, [name, rejected, url]);
  return allowed;
}

/** Runs the host's markdown renderer, then our sanitiser, so images load only from Kaltura hosts. */
function SafeMarkdown({ children }: { children: ReactNode }) {
  const host = useMarkdownRenderer();
  const safe = useMemo(() => host && ((...args: Parameters<typeof host>) => host(...args).then(sanitizeMarkdownHtml)), [host]);
  return createElement(MarkdownContext.Provider, { value: safe }, children);
}

function withSafeMarkdown<P extends object>(View: FC<P>): FC<P> {
  return props => createElement(SafeMarkdown, null, createElement(View, props));
}

/**
 * Wraps a basic Image, Video or AudioPlayer so its `url` loads only from a
 * Kaltura host or a `setExtraMediaOrigins` origin, and a basic Text so its
 * markdown shows only Kaltura images (SEC-05). Other components pass through.
 */
export function guardBasic(base: ReactComponentImplementation): ReactComponentImplementation {
  if (base.name === 'Text') return { ...base, render: withSafeMarkdown(base.render), view: base.view && withSafeMarkdown(base.view) };
  if (!Object.hasOwn(MEDIA_WIDGETS, base.name)) return base;
  const BaseView = base.view;
  const GuardedView = ({ node, buildChild }: NodeViewProps) => {
    const raw = (useSignalValue(node.props) as { url?: unknown }).url;
    const url = raw instanceof ResolvedBinding ? raw.value : raw;
    return useAllowedUrl(base.name, url) ? createElement(BaseView!, { node, buildChild }) : null;
  };
  const { render } = createComponentImplementation(base, ({ props, context, buildChild }) =>
    useAllowedUrl(base.name, (props as { url?: unknown }).url) ? createElement(base.render, { context, buildChild }) : null,
  );
  // Without a base view the surface falls back to the guarded render.
  return { ...base, render, view: BaseView && GuardedView };
}
