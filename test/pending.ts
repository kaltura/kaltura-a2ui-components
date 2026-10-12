// Security regression files that are written but not yet green.
// A fix removes its entry here in the same change. Must be empty before v0.1.5.
// A file with any red test stays listed until its last red test is fixed.
export const PENDING: string[] = [
  'test/security/load-error.test.tsx',
  'test/security/server-url.test.tsx',
  'test/security/flashcards.test.tsx',
  'test/security/recorder.test.tsx',
  'test/probes/webcomponent-lifecycle.test.tsx',
  'test/probes/charts.test.tsx',
  'test/probes/avatar.test.tsx',
  'test/probes/country-codes.test.ts',
  'test/probes/catalog-drift.test.ts',
];
