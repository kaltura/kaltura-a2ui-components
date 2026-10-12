/**
 * Maps country names (world-atlas names plus common aliases) to ISO 3166-1
 * alpha-2 codes. Used by GeoMap to match analytics data to map features.
 * Matching is exact on the normalised name. There is no substring fallback.
 */
const COUNTRIES: string[][] = [
  ['af', 'afghanistan'], ['al', 'albania'], ['dz', 'algeria'], ['ao', 'angola'],
  ['aq', 'antarctica'], ['ar', 'argentina'], ['am', 'armenia'], ['au', 'australia'],
  ['at', 'austria'], ['az', 'azerbaijan'], ['bs', 'bahamas', 'the bahamas'],
  ['bh', 'bahrain'], ['bd', 'bangladesh'], ['by', 'belarus'], ['be', 'belgium'],
  ['bz', 'belize'], ['bj', 'benin'], ['bt', 'bhutan'], ['bo', 'bolivia'],
  ['ba', 'bosnia and herz.', 'bosnia and herzegovina'], ['bw', 'botswana'],
  ['br', 'brazil'], ['bn', 'brunei'], ['bg', 'bulgaria'], ['bf', 'burkina faso'],
  ['bi', 'burundi'], ['kh', 'cambodia'], ['cm', 'cameroon'], ['ca', 'canada'],
  ['cf', 'central african rep.', 'central african republic'], ['td', 'chad'],
  ['cl', 'chile'], ['cn', 'china'], ['co', 'colombia'],
  ['cg', 'congo', 'republic of the congo', 'congo-brazzaville'],
  ['cd', 'dem. rep. congo', 'democratic republic of the congo', 'congo-kinshasa', 'drc'],
  ['cr', 'costa rica'], ['ci', "côte d'ivoire", "cote d'ivoire", 'ivory coast'],
  ['hr', 'croatia'], ['cu', 'cuba'], ['cy', 'cyprus'], ['cz', 'czechia', 'czech republic'],
  ['dk', 'denmark'], ['dj', 'djibouti'], ['do', 'dominican rep.', 'dominican republic'],
  ['ec', 'ecuador'], ['eg', 'egypt'], ['sv', 'el salvador'],
  ['gq', 'eq. guinea', 'equatorial guinea'], ['er', 'eritrea'], ['ee', 'estonia'],
  ['sz', 'eswatini', 'swaziland'], ['et', 'ethiopia'],
  ['fk', 'falkland is.', 'falkland islands'], ['fj', 'fiji'], ['fi', 'finland'],
  ['fr', 'france'], ['tf', 'fr. s. antarctic lands'], ['ga', 'gabon'],
  ['gm', 'gambia', 'the gambia'], ['ge', 'georgia'], ['de', 'germany'], ['gh', 'ghana'],
  ['gr', 'greece'], ['gl', 'greenland'], ['gt', 'guatemala'], ['gn', 'guinea'],
  ['gw', 'guinea-bissau'], ['gy', 'guyana'], ['ht', 'haiti'], ['hn', 'honduras'],
  ['hu', 'hungary'], ['is', 'iceland'], ['in', 'india'], ['id', 'indonesia'],
  ['ir', 'iran'], ['iq', 'iraq'], ['ie', 'ireland'], ['il', 'israel'], ['it', 'italy'],
  ['jm', 'jamaica'], ['jp', 'japan'], ['jo', 'jordan'], ['kz', 'kazakhstan'],
  ['ke', 'kenya'], ['xk', 'kosovo'], ['kw', 'kuwait'], ['kg', 'kyrgyzstan'],
  ['la', 'laos'], ['lv', 'latvia'], ['lb', 'lebanon'], ['ls', 'lesotho'],
  ['lr', 'liberia'], ['ly', 'libya'], ['lt', 'lithuania'], ['lu', 'luxembourg'],
  ['mk', 'north macedonia', 'macedonia'], ['mg', 'madagascar'], ['mw', 'malawi'], ['my', 'malaysia'],
  ['ml', 'mali'], ['mr', 'mauritania'], ['mx', 'mexico'], ['md', 'moldova'],
  ['mn', 'mongolia'], ['me', 'montenegro'], ['ma', 'morocco'], ['mz', 'mozambique'],
  ['mm', 'myanmar'], ['na', 'namibia'], ['np', 'nepal'], ['nl', 'netherlands'],
  ['nc', 'new caledonia'], ['nz', 'new zealand'], ['ni', 'nicaragua'], ['ne', 'niger'],
  ['ng', 'nigeria'], ['kp', 'north korea'], ['no', 'norway'], ['om', 'oman'],
  ['pk', 'pakistan'], ['ps', 'palestine'], ['pa', 'panama'], ['pg', 'papua new guinea'],
  ['py', 'paraguay'], ['pe', 'peru'], ['ph', 'philippines'], ['pl', 'poland'],
  ['pt', 'portugal'], ['pr', 'puerto rico'], ['qa', 'qatar'], ['ro', 'romania'],
  ['ru', 'russia'], ['rw', 'rwanda'], ['eh', 'w. sahara', 'western sahara'],
  ['sa', 'saudi arabia'], ['sn', 'senegal'], ['rs', 'serbia'], ['sl', 'sierra leone'],
  ['sk', 'slovakia'], ['si', 'slovenia'], ['sb', 'solomon is.', 'solomon islands'],
  ['so', 'somalia'], ['za', 'south africa'], ['kr', 'south korea'],
  ['ss', 's. sudan', 'south sudan'], ['es', 'spain'], ['lk', 'sri lanka'], ['sd', 'sudan'],
  ['sr', 'suriname'], ['se', 'sweden'], ['ch', 'switzerland'], ['sy', 'syria'],
  ['tw', 'taiwan'], ['tj', 'tajikistan'], ['tz', 'tanzania'], ['th', 'thailand'],
  ['tl', 'timor-leste', 'east timor'], ['tg', 'togo'], ['tt', 'trinidad and tobago'],
  ['tn', 'tunisia'], ['tr', 'turkey', 'türkiye'], ['tm', 'turkmenistan'], ['ug', 'uganda'],
  ['ua', 'ukraine'], ['ae', 'united arab emirates'], ['gb', 'united kingdom'],
  ['us', 'united states of america', 'united states'], ['uy', 'uruguay'],
  ['uz', 'uzbekistan'], ['vu', 'vanuatu'], ['ve', 'venezuela'], ['vn', 'vietnam'],
  ['ye', 'yemen'], ['zm', 'zambia'], ['zw', 'zimbabwe'],
];

// A Map, so names such as "constructor" or "__proto__" are never found.
const nameToAlpha2 = new Map<string, string>();
for (const [code, ...names] of COUNTRIES) {
  for (const name of names) nameToAlpha2.set(name, code);
}

// Codes that Kaltura analytics returns but are not ISO alpha-2.
const nonStandardToIso = new Map([['uk', 'gb'], ['usa', 'us'], ['ko', 'kr'], ['en', 'gb']]);

function normalizeName(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Normalize a country code or name to its ISO 3166-1 alpha-2 equivalent.
 * Handles non-standard codes from Kaltura analytics (e.g., "uk" → "gb").
 * Unknown input is returned lower-cased.
 */
export function normalizeCountryCode(raw: string): string {
  const name = normalizeName(raw);
  return nonStandardToIso.get(name) ?? nameToAlpha2.get(name) ?? name;
}

/**
 * Look up a value from the data map using a map feature (country) name.
 * A data key matches when it is the same normalised name, or when it
 * normalises to the same ISO code (a code, an alias or a non-standard code).
 * Anything else returns 0, so "niger" never matches "Nigeria".
 */
export function resolveCountryValue(
  dataMap: Map<string, number>,
  countryName: string,
): number {
  const name = normalizeName(countryName);
  const direct = dataMap.get(name);
  if (direct !== undefined) return direct;

  const code = nameToAlpha2.get(name);
  if (!code) return 0;
  for (const [key, value] of dataMap) {
    if (normalizeCountryCode(key) === code) return value;
  }
  return 0;
}
