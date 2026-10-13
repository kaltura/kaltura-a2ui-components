// Covers: SEC-13 (CSV formula injection in the source data download).
// Green since plan item 2.9.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { SourceDataTable } from '../../src/core/charts/SourceDataTable';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const roots: Root[] = [];

afterEach(() => {
  roots.splice(0).forEach(r => act(() => r.unmount()));
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** Clicks "Download CSV" and returns the CSV text. */
async function exportCsv(rows: Record<string, unknown>[]): Promise<string> {
  let csv = '';
  vi.stubGlobal('Blob', class { constructor(parts: string[]) { csv = parts.join(''); } });
  URL.createObjectURL = vi.fn(() => 'blob:test');
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push(root);
  await act(async () => root.render(createElement(SourceDataTable, { data: rows })));
  await act(async () => container.querySelector<HTMLButtonElement>('.chart-source-data-download')?.click());
  return csv;
}

describe('SEC-13: CSV export', () => {
  it.each(['=1+1', '+1', '-1+2', '@SUM(A1)', '\tcmd', '\rcmd'])(
    'SEC-13: a text cell starting with %j gets a leading single quote',
    async cell => {
      const csv = await exportCsv([{ name: cell }]);
      expect(csv.split('\n')[1].replace(/^"|"$/g, '')).toBe(`'${cell}`);
    },
  );

  it.each([' =1+1', '  +1', ' -1+2', ' @SUM(A1)', '\u00a0=1+1', '\u3000@x'])(
    'SEC-13: a text cell with leading whitespace then a formula char (%j) gets a leading single quote',
    async cell => {
      const csv = await exportCsv([{ name: cell }]);
      expect(csv).toBe(`name\n'${cell}`);
    },
  );

  it.each(['\uFF1D1+1', '\uFF0B1', '\uFF0D1', '\uFF20SUM(A1)', ' \uFF1D1+1'])(
    'SEC-13: a text cell starting with fullwidth %j gets a leading single quote',
    async cell => {
      const csv = await exportCsv([{ name: cell }]);
      expect(csv).toBe(`name\n'${cell}`);
    },
  );

  it('SEC-13: a cell with a formula char after the first character is unchanged', async () => {
    const csv = await exportCsv([{ a: ' x=1' }]);
    expect(csv).toBe('a\n x=1');
  });

  it('SEC-13: a semicolon makes the cell quoted', async () => {
    const csv = await exportCsv([{ a: 'x;y' }]);
    expect(csv).toBe('a\n"x;y"');
  });

  it('SEC-13: a carriage return in the middle makes the cell quoted', async () => {
    const csv = await exportCsv([{ a: 'line1\rline2' }]);
    expect(csv).toBe('a\n"line1\rline2"');
  });

  it('SEC-13: a header that starts with = is neutralised too', async () => {
    const csv = await exportCsv([{ '=HYPERLINK("x")': 'a' }]);
    expect(csv.split('\n')[0]).toBe('"\'=HYPERLINK(""x"")"');
  });

  it('SEC-13: a negative number keeps its sign', async () => {
    const csv = await exportCsv([{ delta: -5 }]);
    expect(csv).toBe('delta\n-5');
  });

  it('SEC-13: a cell with a quote in the middle is not changed except for CSV quoting', async () => {
    const csv = await exportCsv([{ a: 'say "hi"' }]);
    expect(csv).toBe('a\n"say ""hi"""');
  });

  it('SEC-13: a comma makes the cell quoted', async () => {
    const csv = await exportCsv([{ a: 'x,y' }]);
    expect(csv).toBe('a\n"x,y"');
  });

  it('SEC-13: a newline makes the cell quoted', async () => {
    const csv = await exportCsv([{ a: 'line1\nline2' }]);
    expect(csv).toBe('a\n"line1\nline2"');
  });

  it('SEC-13: a formula with a comma and a quote is prefixed and quoted', async () => {
    const csv = await exportCsv([{ a: '=A1,"b"' }]);
    expect(csv).toBe('a\n"\'=A1,""b"""');
  });

  it('SEC-13: plain text, null and normal numbers are unchanged', async () => {
    const csv = await exportCsv([{ a: 'hello', b: null, c: 3, d: 'a-b' }]);
    expect(csv).toBe('a,b,c,d\nhello,,3,a-b');
  });
});
