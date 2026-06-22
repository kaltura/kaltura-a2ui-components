const MAX_VISIBLE_ROWS = 100;

interface SourceDataTableProps {
  data: Record<string, unknown>[];
  sourceData?: Record<string, unknown>[];
}

export function SourceDataTable({ data, sourceData }: SourceDataTableProps) {
  const allRows = sourceData && sourceData.length > 0 ? sourceData : data;
  if (!allRows.length) return null;
  const keys = Object.keys(allRows[0]);
  const truncated = allRows.length > MAX_VISIBLE_ROWS;
  const rows = truncated ? allRows.slice(0, MAX_VISIBLE_ROWS) : allRows;

  function downloadCsv() {
    const escape = (v: unknown) => {
      const s = v == null ? '' : String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };
    const header = keys.map(escape).join(',');
    const body = allRows.map(row => keys.map(k => escape(row[k])).join(',')).join('\n');
    const csv = `${header}\n${body}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kaltura-data.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <details className="chart-source-data">
      <summary>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="chart-source-data-icon">
          <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        View source data
        <span className="chart-source-data-count">{allRows.length} rows</span>
      </summary>
      <div className="chart-source-data-actions">
        <button
          type="button"
          className="chart-source-data-download"
          onClick={downloadCsv}
          aria-label={`Download ${allRows.length} rows as CSV`}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 2v9M5 8l3 3 3-3M2 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Download CSV ({allRows.length} rows)
        </button>
      </div>
      <div className="chart-source-data-scroll">
        <table>
          <thead>
            <tr>
              {keys.map(k => <th key={k}>{humanizeHeader(k)}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {keys.map(k => (
                  <td key={k} className={isNumericColumn(row[k]) ? 'numeric' : ''}>
                    {formatCellValue(row[k])}
                  </td>
                ))}
              </tr>
            ))}
            {truncated && (
              <tr className="chart-source-data-truncated">
                <td colSpan={keys.length}>
                  Showing {MAX_VISIBLE_ROWS} of {allRows.length} rows — download CSV for full dataset
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function humanizeHeader(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

function isNumericColumn(value: unknown): boolean {
  return typeof value === 'number';
}

function formatCellValue(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'number') {
    if (Number.isInteger(value) && value >= 1000) return value.toLocaleString();
    if (!Number.isInteger(value)) return value.toFixed(1);
    return String(value);
  }
  return String(value);
}
