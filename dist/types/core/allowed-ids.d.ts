type Entry = number | string | RegExp;
/** A rule for ids: `'*'` allows all, else a RegExp or a list of ids and RegExps. */
export type AllowedIds = '*' | RegExp | Entry[];
/**
 * Host option. Limits the `partnerId` that components accept. Default `'*'`
 * (all). The rule is `'*'`, a RegExp or a list of numbers, strings and
 * RegExps. A number or string must equal the id. A RegExp is tested against
 * the id as text, so anchor it: `/^(123|456)$/`. `/^1/` allows every id that
 * starts with 1. An empty list allows none. Pass `undefined` to reset. Throws
 * on any other value and keeps the current rule. Call it before the widgets
 * mount. Never call this from agent output.
 * @example setAllowedPartners([1234567, /^98\d{5}$/]);
 */
export declare function setAllowedPartners(rule: AllowedIds | undefined): void;
/**
 * Host option. Same as `setAllowedPartners`, for `uiconfId`. A uiconf decides
 * which player or recorder code runs in your page, so list the ones you own.
 * @example setAllowedUiconfs([12345678]);
 */
export declare function setAllowedUiconfs(rule: AllowedIds | undefined): void;
/**
 * Host option. Same as `setAllowedPartners`, for the `region` an agent can
 * ask for: region codes and environment names (`setEnvironments`). Default
 * `'*'` (all). The default region from `setRegion` is checked too.
 * @example setAllowedRegions(['irp2']);
 */
export declare function setAllowedRegions(rule: AllowedIds | undefined): void;
/**
 * The first of `partnerId` and `uiconfId` that the host rules refuse, or
 * `undefined`. Components call it before any script, fetch or iframe. A prop
 * that is missing, or not a key of `only` when given, is not checked.
 */
export declare function refusedIdProp(props: object, only?: object): 'partnerId' | 'uiconfId' | undefined;
/** True when the host rule allows this region code or environment name. */
export declare const regionAllowed: (name: string) => boolean;
export {};
//# sourceMappingURL=allowed-ids.d.ts.map