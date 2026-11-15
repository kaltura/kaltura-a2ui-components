/**
 * Normalize a country code or name to its ISO 3166-1 alpha-2 equivalent.
 * Handles non-standard codes from Kaltura analytics (e.g., "uk" → "gb").
 * Unknown input is returned lower-cased.
 */
export declare function normalizeCountryCode(raw: string): string;
/**
 * Look up a value from the data map using a map feature (country) name.
 * A data key matches when it is the same normalised name, or when it
 * normalises to the same ISO code (a code, an alias or a non-standard code).
 * Anything else returns 0, so "niger" never matches "Nigeria".
 */
export declare function resolveCountryValue(dataMap: Map<string, number>, countryName: string): number;
//# sourceMappingURL=countryCodes.d.ts.map