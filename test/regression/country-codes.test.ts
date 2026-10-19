// Covers: QA-14 (no country substring match: niger/Nigeria, mali/Somalia,
// oman/Romania, sudan/South Sudan).
import { describe, it, expect } from 'vitest';
import { resolveCountryValue } from '../../src/core/charts/countryCodes';

const WRONG_MATCHES: [string, string][] = [
  ['niger', 'Nigeria'],
  ['nigeria', 'Niger'],
  ['mali', 'Somalia'],
  ['oman', 'Romania'],
  ['sudan', 'S. Sudan'],
];

describe('QA-14: resolveCountryValue', () => {
  it.each(WRONG_MATCHES)('QA-14: data key "%s" does not match map feature "%s"', (key, feature) => {
    expect(resolveCountryValue(new Map([[key, 7]]), feature)).toBe(0);
  });

  it('QA-14: exact ISO code still matches (control)', () => {
    expect(resolveCountryValue(new Map([['ng', 7]]), 'Nigeria')).toBe(7);
  });
});
