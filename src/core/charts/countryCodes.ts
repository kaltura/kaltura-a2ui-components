/**
 * Maps TopoJSON country names (world-atlas) to ISO 3166-1 alpha-2 codes.
 * Used by GeoMap to match analytics data (which uses ISO codes) to map features.
 */
const nameToAlpha2: Record<string, string> = {
  'afghanistan': 'af',
  'albania': 'al',
  'algeria': 'dz',
  'argentina': 'ar',
  'armenia': 'am',
  'australia': 'au',
  'austria': 'at',
  'azerbaijan': 'az',
  'bahrain': 'bh',
  'bangladesh': 'bd',
  'belarus': 'by',
  'belgium': 'be',
  'bolivia': 'bo',
  'bosnia and herz.': 'ba',
  'brazil': 'br',
  'bulgaria': 'bg',
  'cambodia': 'kh',
  'cameroon': 'cm',
  'canada': 'ca',
  'chile': 'cl',
  'china': 'cn',
  'colombia': 'co',
  'costa rica': 'cr',
  'croatia': 'hr',
  'cuba': 'cu',
  'cyprus': 'cy',
  'czechia': 'cz',
  'czech republic': 'cz',
  "côte d'ivoire": 'ci',
  'denmark': 'dk',
  'dominican rep.': 'do',
  'dominican republic': 'do',
  'ecuador': 'ec',
  'egypt': 'eg',
  'el salvador': 'sv',
  'estonia': 'ee',
  'ethiopia': 'et',
  'finland': 'fi',
  'france': 'fr',
  'georgia': 'ge',
  'germany': 'de',
  'ghana': 'gh',
  'greece': 'gr',
  'guatemala': 'gt',
  'honduras': 'hn',
  'hungary': 'hu',
  'iceland': 'is',
  'india': 'in',
  'indonesia': 'id',
  'iran': 'ir',
  'iraq': 'iq',
  'ireland': 'ie',
  'israel': 'il',
  'italy': 'it',
  'jamaica': 'jm',
  'japan': 'jp',
  'jordan': 'jo',
  'kazakhstan': 'kz',
  'kenya': 'ke',
  'kuwait': 'kw',
  'latvia': 'lv',
  'lebanon': 'lb',
  'libya': 'ly',
  'lithuania': 'lt',
  'luxembourg': 'lu',
  'malaysia': 'my',
  'mexico': 'mx',
  'moldova': 'md',
  'mongolia': 'mn',
  'morocco': 'ma',
  'mozambique': 'mz',
  'myanmar': 'mm',
  'nepal': 'np',
  'netherlands': 'nl',
  'new zealand': 'nz',
  'nicaragua': 'ni',
  'nigeria': 'ng',
  'north korea': 'kp',
  'north macedonia': 'mk',
  'norway': 'no',
  'oman': 'om',
  'pakistan': 'pk',
  'panama': 'pa',
  'paraguay': 'py',
  'peru': 'pe',
  'philippines': 'ph',
  'poland': 'pl',
  'portugal': 'pt',
  'qatar': 'qa',
  'romania': 'ro',
  'russia': 'ru',
  'saudi arabia': 'sa',
  'senegal': 'sn',
  'serbia': 'rs',
  'singapore': 'sg',
  'slovakia': 'sk',
  'slovenia': 'si',
  'south africa': 'za',
  'south korea': 'kr',
  'spain': 'es',
  'sri lanka': 'lk',
  'sudan': 'sd',
  'sweden': 'se',
  'switzerland': 'ch',
  'syria': 'sy',
  'taiwan': 'tw',
  'tanzania': 'tz',
  'thailand': 'th',
  'tunisia': 'tn',
  'turkey': 'tr',
  'ukraine': 'ua',
  'united arab emirates': 'ae',
  'united kingdom': 'gb',
  'united states of america': 'us',
  'united states': 'us',
  'uruguay': 'uy',
  'uzbekistan': 'uz',
  'venezuela': 've',
  'vietnam': 'vn',
  'yemen': 'ye',
  'zambia': 'zm',
  'zimbabwe': 'zw',
};

const alpha2ToName: Record<string, string> = {};
for (const [name, code] of Object.entries(nameToAlpha2)) {
  if (!alpha2ToName[code]) alpha2ToName[code] = name;
}

const nonStandardToIso: Record<string, string> = {
  'uk': 'gb',
  'ko': 'kr',
  'en': 'gb',
};

/**
 * Normalize a country code or name to its ISO 3166-1 alpha-2 equivalent.
 * Handles non-standard codes from Kaltura analytics (e.g., "uk" → "gb").
 */
export function normalizeCountryCode(raw: string): string {
  const lower = raw.toLowerCase();
  if (nonStandardToIso[lower]) return nonStandardToIso[lower];
  if (nameToAlpha2[lower]) return nameToAlpha2[lower];
  return lower;
}

/**
 * Look up a value from the data map using a TopoJSON country name.
 * Handles: exact name match, ISO alpha-2 code lookup, ISO alpha-3 partial match,
 * and substring fallback for longer names.
 */
export function resolveCountryValue(
  dataMap: Map<string, number>,
  countryName: string,
): number {
  const lower = countryName.toLowerCase();

  // Direct name match (data uses full country names)
  if (dataMap.has(lower)) return dataMap.get(lower)!;

  // Convert country name to ISO alpha-2 and look that up (most common case)
  const code = nameToAlpha2[lower];
  if (code && dataMap.has(code)) return dataMap.get(code)!;

  // Common non-standard codes the Kaltura API may return
  if (lower === 'united kingdom') {
    if (dataMap.has('uk')) return dataMap.get('uk')!;
    if (dataMap.has('gb')) return dataMap.get('gb')!;
  }
  if (lower === 'united states of america') {
    if (dataMap.has('usa')) return dataMap.get('usa')!;
    if (dataMap.has('us')) return dataMap.get('us')!;
  }
  if (lower === 'russia') {
    if (dataMap.has('ru')) return dataMap.get('ru')!;
  }
  if (lower === 'south korea') {
    if (dataMap.has('kr')) return dataMap.get('kr')!;
    if (dataMap.has('ko')) return dataMap.get('ko')!;
  }
  if (lower === 'taiwan') {
    if (dataMap.has('tw')) return dataMap.get('tw')!;
  }

  // Substring fallback for longer keys only
  for (const [key, val] of dataMap) {
    if (key.length < 3) continue;
    if (lower.includes(key) || key.includes(lower)) return val;
  }

  return 0;
}
