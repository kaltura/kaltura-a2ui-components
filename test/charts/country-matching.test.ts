// Covers: QA-14 (exact country matching, alias table, no substring fallback).
// Green since plan item 2.7.
import { describe, it, expect } from 'vitest';
import { normalizeCountryCode, resolveCountryValue } from '../../src/core/charts/countryCodes';

// [data key, map feature name, expected value (7 = match, 0 = no match)]
const CASES: [string, string, number][] = [
  ['ne', 'Niger', 7],
  ['ng', 'Niger', 0],
  ['ne', 'Nigeria', 0],
  ['niger', 'Niger', 7],
  ['niger', 'Nigeria', 0],
  ['gn', 'Guinea', 7],
  ['gn', 'Guinea-Bissau', 0],
  ['gn', 'Eq. Guinea', 0],
  ['gn', 'Papua New Guinea', 0],
  ['gw', 'Guinea-Bissau', 7],
  ['gq', 'Eq. Guinea', 7],
  ['equatorial guinea', 'Eq. Guinea', 7],
  ['guinea', 'Guinea-Bissau', 0],
  ['cd', 'Dem. Rep. Congo', 7],
  ['cg', 'Congo', 7],
  ['cg', 'Dem. Rep. Congo', 0],
  ['cd', 'Congo', 0],
  ['democratic republic of the congo', 'Dem. Rep. Congo', 7],
  ['republic of the congo', 'Congo', 7],
  ['congo', 'Dem. Rep. Congo', 0],
  ['do', 'Dominican Rep.', 7],
  ['dominican republic', 'Dominican Rep.', 7],
  ['dominica', 'Dominican Rep.', 0],
  ['dm', 'Dominican Rep.', 0],
  ['sd', 'Sudan', 7],
  ['sd', 'S. Sudan', 0],
  ['ss', 'S. Sudan', 7],
  ['south sudan', 'S. Sudan', 7],
  ['sudan', 'S. Sudan', 0],
  ['south sudan', 'Sudan', 0],
  ['mali', 'Somalia', 0],
  ['oman', 'Romania', 0],
  ['india', 'Indonesia', 0],
  ['us', 'United States of America', 7],
  ['usa', 'United States of America', 7],
  ['united states', 'United States of America', 7],
  ['uk', 'United Kingdom', 7],
  ['gb', 'United Kingdom', 7],
  ['ko', 'South Korea', 7],
  ['ko', 'North Korea', 0],
  ['  US ', 'United States of America', 7],
  ['nige', 'Niger', 0],
  ['nige', 'Nigeria', 0],
  ['nigeria republic', 'Nigeria', 0],
  ['atlantis', 'Niger', 0],
  ['constructor', 'Niger', 0],
  ['__proto__', 'Niger', 0],
];

describe('QA-14: resolveCountryValue, tricky names', () => {
  it.each(CASES)('QA-14: key "%s" vs feature "%s" gives %i', (key, feature, expected) => {
    expect(resolveCountryValue(new Map([[key.trim().toLowerCase(), 7]]), feature)).toBe(expected);
  });

  it('QA-14: an unknown feature name gives 0', () => {
    expect(resolveCountryValue(new Map([['ng', 7]]), 'Atlantis')).toBe(0);
  });

  it('QA-14: a feature name named like an object property gives 0', () => {
    expect(resolveCountryValue(new Map([['ng', 7]]), 'constructor')).toBe(0);
  });
});

describe('QA-14: normalizeCountryCode', () => {
  it.each([
    ['Nigeria', 'ng'],
    ['  NIGER ', 'ne'],
    ['S. Sudan', 'ss'],
    ['uk', 'gb'],
    ['usa', 'us'],
    ['xx', 'xx'],
  ])('QA-14: "%s" normalises to "%s"', (raw, expected) => {
    expect(normalizeCountryCode(raw)).toBe(expected);
  });

  it('QA-14: object property names are returned as plain strings', () => {
    expect(normalizeCountryCode('constructor')).toBe('constructor');
  });
});
