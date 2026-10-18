/**
 * Reference for the server side of `setKsProvider`: maps one KS request to a privilege string. Runs on
 * your server, never in the browser. It does not call Kaltura. Pass the result to `session.start` as a
 * USER KS (type 0) with a short expiry.
 *
 * It fails closed. It throws for a bad request, an unknown widget, a category it has no privacy
 * context for, and any widget it has no rule for. It never emits `disableentitlement`, a wildcard
 * `edit`, or an admin KS. See docs/ks-privileges.md for what each privilege does.
 */
/** What your endpoint receives: the JSON the provider sent. Untrusted, so every field is checked. */
export interface KsRequestBody {
  widget: unknown;
  version: unknown;
  scope: unknown;
}

export interface KsPolicy {
  /** The one account this server mints for. */
  partnerId: number;
  /** Category id to the privacy context label of that category, from your own data. */
  privacyContexts: Readonly<Record<string, string>>;
}

const ENTRY = /^[01]_[0-9a-z]{8}$/;
const CATEGORY = /^\d{1,12}$/;
const CONTEXT = /^[A-Za-z0-9_-]{1,64}$/;
const PLAYBACK = 'setrole:PLAYBACK_BASE_ROLE';

const entry = (id: unknown): string => {
  if (typeof id !== 'string' || !ENTRY.test(id)) throw new Error('bad entry id');
  return id;
};

/** Kaltura enforces this on every API call made with the KS. Genie privileges are read by Genie only. */
const entitlement = (policy: KsPolicy, categoryId: unknown): string => {
  if (typeof categoryId !== 'string' || !CATEGORY.test(categoryId)) throw new Error('bad category id');
  const context = policy.privacyContexts[categoryId];
  if (context === undefined || !CONTEXT.test(context)) throw new Error('no privacy context for this category');
  return `enableentitlement,privacycontext:${context}`;
};

export function privilegesFor(request: KsRequestBody, policy: KsPolicy): string {
  const { widget, version } = request;
  if (version !== 1) throw new Error('unknown version');
  const scope = request.scope as Record<string, unknown> | null;
  if (typeof scope !== 'object' || scope === null || scope.partnerId !== policy.partnerId) throw new Error('wrong account');
  const only = (...allowed: string[]) => {
    const extra = Object.keys(scope).filter(key => key !== 'partnerId' && key !== 'region' && !allowed.includes(key));
    if (extra.length) throw new Error(`unknown scope key: ${extra[0]}`);
  };
  switch (widget) {
    case 'player': {
      only('entryId', 'playlistId');
      if (scope.playlistId !== undefined) return `${PLAYBACK},sviewplaylist:${entry(scope.playlistId)}`;
      return `${PLAYBACK},sview:${entry(scope.entryId)}`;
    }
    case 'flashcards': {
      only('entryIds');
      const ids = scope.entryIds;
      if (!Array.isArray(ids) || ids.length === 0 || ids.length > 20) throw new Error('bad entry ids');
      // One key with a slash list: repeated keys keep only the last one.
      return `${PLAYBACK},sview:${ids.map(entry).join('/')}`;
    }
    case 'captions-editor': {
      only('entryId', 'assetId');
      const id = entry(scope.entryId);
      return `edit:${id},sview:${id}`;
    }
    case 'genie': {
      only('categoryId');
      const base = `${PLAYBACK},sview:*`;
      if (scope.categoryId === undefined) return base;
      // The entitlement part is the limit. `geniecategoryid` only tells Genie which category to chat about.
      return `${base},${entitlement(policy, scope.categoryId)},geniecategoryid:${scope.categoryId as string}`;
    }
    default:
      throw new Error('no rule for this widget: write one');
  }
}
