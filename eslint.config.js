import js from '@eslint/js';
import globals from 'globals';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

// switch to error when Phase 1 lands
const SECURITY_RULE_LEVEL = 'warn';

// Banned patterns (SECF-30837 plan 6.3). Each entry is one selector.
const DYNAMIC_IMPORT = {
  selector: "ImportExpression:not([source.type='Literal'])",
  message: 'Dynamic import() with a non-literal argument is only allowed in src/core/unisphere-loader.ts.',
};
const DANGEROUS_HTML = {
  selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
  message: 'dangerouslySetInnerHTML is only allowed in the sanitised flashcards markdown component.',
};
const BANNED_EVERYWHERE = [
  {
    selector: "AssignmentExpression[left.type='MemberExpression'][left.property.name=/^(innerHTML|outerHTML)$/]",
    message: 'Do not assign innerHTML or outerHTML. Use textContent or React elements.',
  },
  {
    selector: "CallExpression[callee.property.name='insertAdjacentHTML']",
    message: 'Do not use insertAdjacentHTML.',
  },
  {
    selector: "CallExpression[callee.object.name='document'][callee.property.name=/^(write|writeln)$/]",
    message: 'Do not use document.write.',
  },
  {
    selector: "CallExpression[callee.name='eval'], CallExpression[callee.property.name='eval']",
    message: 'Do not use eval.',
  },
  {
    selector: "NewExpression[callee.name='Function']",
    message: 'Do not use new Function.',
  },
];

export default defineConfig([
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', '.audit/**', 'e2e/test-results/**', 'test-results/**', 'playwright-report/**'],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    // src/core/player.tsx has an eslint-disable for a react-hooks rule.
    // eslint-plugin-react-hooks is not installed, so register a no-op rule
    // to keep ESLint from reporting an unknown rule. Replace with the real
    // plugin when it is added. The stub never reports, so unused-directive
    // reporting is off until then.
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    plugins: {
      'react-hooks': { rules: { 'exhaustive-deps': { meta: { schema: [] }, create: () => ({}) } } },
    },
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      'no-restricted-syntax': [SECURITY_RULE_LEVEL, ...BANNED_EVERYWHERE, DYNAMIC_IMPORT, DANGEROUS_HTML],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // Tests, e2e fixtures and scripts build hostile strings and DOM on
    // purpose. The banned-pattern rules guard shipped code only.
    files: ['test/**', 'e2e/**', 'scripts/**', '*.config.*'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    // These files will legitimately own the loader import() and the
    // sanitised markdown HTML. Everything else stays banned.
    files: ['src/core/unisphere-loader.ts', 'src/core/flashcards.tsx'],
    rules: {
      'no-restricted-syntax': [SECURITY_RULE_LEVEL, ...BANNED_EVERYWHERE],
    },
  },
]);
