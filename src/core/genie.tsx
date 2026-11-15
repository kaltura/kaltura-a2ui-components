import { useContext, useEffect, useRef } from 'react';
import { createEmbedsWorkspace, destroyEmbedsWorkspace, teardownSteps } from './embeds';
import { readColorMode } from './color-mode';
import { renderLoadError } from './render-load-error';
import { KalturaFailure, ReporterContext } from './host-hooks';
import { unisphereUrl } from './region';
import { refusedIdProp } from './allowed-ids';
import { KalturaGenieApi } from '../schemas/genie';
import { withValidatedProps } from './validate-props';
import { withKs, withKsProp } from './ks';

export interface GenieCoreProps {
  /** Kaltura partner (account) ID. */
  partnerId: number;
  /** Kaltura Session. The host KS provider is used first. */
  ks: string;
  /** Unisphere URL. Defaults to the Unisphere host of the region. Only Kaltura hosts and `setExtraAllowedOrigins` are accepted. */
  serverUrl?: string;
  /** Region code or host-registered environment name. Default: the region of `serverUrl`, else the `setRegion` value. */
  region?: string;
  /** Optional and ignored. Genie no longer needs a player ID. */
  uiconfId?: number;
  /** Category that scopes the Genie content. */
  categoryId?: string;
  /** UI language code, for example `de`. Default: English. */
  language?: string;
}

const LABEL = 'Kaltura Genie';

// The parts of the Unisphere embeds API that Genie uses. Remote code: check every call.
interface GenieChatApi {
  contained?: (params: { elementId: string }) => { remove?: () => void } | undefined;
}

function GenieView(props: GenieCoreProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { partnerId, ks, region, serverUrl: serverUrlProp, categoryId, language } = props;
  const reporter = useContext(ReporterContext);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;
    const teardown = teardownSteps();
    container.replaceChildren();
    const refused = refusedIdProp({ partnerId });
    if (refused) {
      renderLoadError(container, LABEL, new KalturaFailure('origin-not-allowed', `${refused} is not allowed`), 'genie', reporter);
      return;
    }
    let serverUrl: string;
    try {
      serverUrl = unisphereUrl(region, serverUrlProp);
    } catch (error) {
      renderLoadError(container, LABEL, error, 'genie', reporter);
      return;
    }
    const id = `kaltura-genie-${crypto.randomUUID()}`;
    container.id = id;
    const theme = readColorMode('dark');

    createEmbedsWorkspace(serverUrl, () => cancelled, {
      session: { ks, partnerId },
      ...(language ? { ui: { language } } : {}),
      apis: [{ name: 'genieChat', settings: { theme: { type: theme }, ...(categoryId ? { context: { type: 'category', id: categoryId } } : {}) } }],
    })
      .then(workspace => {
        if (!workspace) return;
        teardown.add(() => destroyEmbedsWorkspace(workspace));
        // The effect was cleaned up while the workspace loaded: nobody else will destroy it.
        if (cancelled) return teardown.run();
        const chat = workspace.apis?.genieChat as GenieChatApi | undefined;
        if (typeof chat?.contained !== 'function') throw new KalturaFailure('load-failed', 'Genie embed is missing');
        const embed = chat.contained({ elementId: id });
        teardown.add(() => embed?.remove?.());
      })
      .catch(err => {
        teardown.run();
        if (cancelled) return;
        // Remote error text can hold the KS or markup. Show fixed text only.
        renderLoadError(container, LABEL, err instanceof KalturaFailure ? err : new KalturaFailure('load-failed', 'Genie could not start'), 'genie', reporter);
      });

    return () => {
      cancelled = true;
      teardown.run();
      container.replaceChildren();
    };
  }, [partnerId, ks, region, serverUrlProp, categoryId, language, reporter]);

  return <div ref={containerRef} className="kaltura-kaltura-genie-container" style={{ width: '100%', minHeight: '500px' }} />;
}

export const GenieCore = withKs('genie', withValidatedProps(withKsProp(KalturaGenieApi.schema), LABEL, GenieView, 'genie'), {
  schema: KalturaGenieApi.schema,
  label: LABEL,
});
