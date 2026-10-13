type Entry = number | string | RegExp;

/** A rule for ids: `'*'` allows all, else a RegExp or a list of ids and RegExps. */
export type AllowedIds = '*' | RegExp | Entry[];

let partners: Entry[] | undefined;
let uiconfs: Entry[] | undefined;

function parse(rule: AllowedIds | undefined): Entry[] | undefined {
  if (rule === undefined || rule === '*') return undefined;
  const list: unknown = rule instanceof RegExp ? [rule] : rule;
  if (!Array.isArray(list) || !list.every(entry => entry instanceof RegExp || typeof entry === 'string' || typeof entry === 'number')) {
    throw new Error('Allowed ids must be "*", a RegExp or a list of ids and RegExps');
  }
  return [...(list as Entry[])];
}

/**
 * Host option. Limits the `partnerId` that components accept. Default `'*'`
 * (all). The rule is `'*'`, a RegExp or a list of numbers, strings and
 * RegExps. A number or string must equal the id. A RegExp is tested against
 * the id as text, so anchor it: `/^(123|456)$/`. `/^1/` allows every id that
 * starts with 1. An empty list allows none. Pass `undefined` to reset. Throws
 * on any other value and keeps the current rule. Call it before the widgets
 * mount. Never call this from agent output.
 */
export function setAllowedPartners(rule: AllowedIds | undefined): void {
  partners = parse(rule);
}

/**
 * Host option. Same as `setAllowedPartners`, for `uiconfId`. A uiconf decides
 * which player or recorder code runs in your page, so list the ones you own.
 */
export function setAllowedUiconfs(rule: AllowedIds | undefined): void {
  uiconfs = parse(rule);
}

// `search` ignores and restores `lastIndex`, so a /g or /y rule keeps no state between ids.
const allows = (list: Entry[] | undefined, id: unknown): boolean =>
  list === undefined || list.some(entry => (entry instanceof RegExp ? String(id).search(entry) !== -1 : String(entry) === String(id)));

/**
 * The first of `partnerId` and `uiconfId` that the host rules refuse, or
 * `undefined`. Components call it before any script, fetch or iframe. A prop
 * that is missing, or not a key of `only` when given, is not checked.
 */
export function refusedIdProp(props: object, only?: object): 'partnerId' | 'uiconfId' | undefined {
  const { partnerId, uiconfId } = props as { partnerId?: unknown; uiconfId?: unknown };
  const checked = (name: string) => only === undefined || name in only;
  if (partnerId != null && checked('partnerId') && !allows(partners, partnerId)) return 'partnerId';
  if (uiconfId != null && checked('uiconfId') && !allows(uiconfs, uiconfId)) return 'uiconfId';
  return undefined;
}
