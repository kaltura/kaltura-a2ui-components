import js from '@eslint/js';
import globals from 'globals';
import { defineConfig } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

// switch to error when Phase 1 lands
const SECURITY_RULE_LEVEL = 'warn';

// RadarChart calls a hook conditionally (QA-06, Phase 2). Switch to error
// when that fix lands.
const HOOKS_RULE_LEVEL = 'warn';

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
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    plugins: { 'react-hooks': reactHooks },
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      'react-hooks/rules-of-hooks': HOOKS_RULE_LEVEL,
      'react-hooks/exhaustive-deps': 'warn',
      'no-restricted-syntax': [SECURITY_RULE_LEVEL, ...BANNED_EVERYWHERE, DYNAMIC_IMPORT, DANGEROUS_HTML],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // Tests, e2e fixtures and scripts build hostile strings and DOM on
    // purpose. The banned-pattern rules guard shipped code only. Playwright
    // fixtures call `use`, which is not a React hook.
    files: ['test/**', 'e2e/**', 'scripts/**', '*.config.*'],
    rules: { 'no-restricted-syntax': 'off', 'react-hooks/rules-of-hooks': 'off' },
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
