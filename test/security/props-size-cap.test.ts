// Covers: SEC-26 (checkProps refuses huge arrays and records before Zod 3 builds one issue per element).
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { checkProps } from '../../src/core/validate-props';

const schema = z.object({ rows: z.array(z.string()).max(500), label: z.string() });
const tooMany = (n: number) => Array.from({ length: n }, () => 1);

describe('props size cap', () => {
  it('SEC-26: a top-level array over the cap is invalid by name, not per element', () => {
    expect(checkProps(schema, { rows: tooMany(10_001), label: 'x' })).toEqual({ invalid: ['rows'], pending: false });
  });

  it('SEC-26: a nested array over the cap is invalid', () => {
    expect(checkProps(schema, { rows: [], label: { deep: [{ more: tooMany(10_001) }] } })).toEqual({
      invalid: ['label'],
      pending: false,
    });
  });

  it('SEC-26: a record over the cap is invalid', () => {
    const record = Object.fromEntries(tooMany(10_001).map((_, i) => [`k${i}`, i]));
    expect(checkProps(schema, { rows: [], label: record })).toEqual({ invalid: ['label'], pending: false });
  });

  it('SEC-26: an array at the cap still goes through normal validation', () => {
    expect(checkProps(schema, { rows: tooMany(10_000), label: 'x' }).invalid).toContain('rows.0');
  });

  it('SEC-26: valid props below the cap are unchanged', () => {
    expect(checkProps(schema, { rows: ['a'], label: 'x' })).toEqual({ invalid: [], pending: false });
  });
});
