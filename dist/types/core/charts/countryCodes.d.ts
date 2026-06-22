/**
 * Normalize a country code or name to its ISO 3166-1 alpha-2 equivalent.
 * Handles non-standard codes from Kaltura analytics (e.g., "uk" → "gb").
 */
export declare function normalizeCountryCode(raw: string): string;
/**
 * Look up a value from the data map using a TopoJSON country name.
 * Handles: exact name match, ISO alpha-2 code lookup, ISO alpha-3 partial match,
 * and substring fallback for longer names.
 */
export declare function resolveCountryValue(dataMap: Map<string, number>, countryName: string): number;
//# sourceMappingURL=countryCodes.d.ts.map