import js from '@eslint/js';
import globals from 'globals';
import { defineConfig } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

const SECURITY_RULE_LEVEL = 'error';
const HOOKS_RULE_LEVEL = 'error';

// Banned patterns. Each entry is one no-restricted-syntax selector.
const DYNAMIC_IMPORT = {
  selector: "ImportExpression:not([source.type='Literal'])",
  message: 'Dynamic import() with a non-literal argument is only allowed in src/core/unisphere-loader.ts.',
};
const DANGEROUS_HTML = {
  selector:
    "JSXAttribute[name.name='dangerouslySetInnerHTML'], Property[key.name='dangerouslySetInnerHTML'], Property[key.value='dangerouslySetInnerHTML'], AssignmentExpression[left.type='MemberExpression'][left.property.name='dangerouslySetInnerHTML']",
  message: 'dangerouslySetInnerHTML is only allowed in the sanitised flashcards markdown component.',
};
const BANNED_EVERYWHERE = [
  {
    selector:
      "AssignmentExpression[left.type='MemberExpression'][left.property.name=/^(innerHTML|outerHTML)$/], AssignmentExpression[left.type='MemberExpression'][left.property.value=/^(innerHTML|outerHTML)$/]",
    message: 'Do not assign innerHTML or outerHTML. Use textContent or React elements.',
  },
  {
    selector:
      "JSXAttribute[name.name=/^srcdoc$/i], Property[key.name=/^srcdoc$/i], Property[key.value=/^srcdoc$/i], AssignmentExpression[left.type='MemberExpression'][left.property.name=/^srcdoc$/i], AssignmentExpression[left.type='MemberExpression'][left.property.value=/^srcdoc$/i], CallExpression[callee.property.name='setAttribute'][arguments.0.value=/^srcdoc$/i], CallExpression[callee.property.name='setAttributeNS'][arguments.1.value=/^srcdoc$/i]",
    message: 'Do not set srcdoc. Load iframes from a validated https URL.',
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
    selector: "NewExpression[callee.name='Function'], CallExpression[callee.name='Function']",
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
    // Each file owns exactly one exemption. Everything else stays banned.
    files: ['src/core/unisphere-loader.ts'],
    rules: { 'no-restricted-syntax': [SECURITY_RULE_LEVEL, ...BANNED_EVERYWHERE, DANGEROUS_HTML] },
  },
  {
    files: ['src/core/flashcards.tsx'],
    rules: { 'no-restricted-syntax': [SECURITY_RULE_LEVEL, ...BANNED_EVERYWHERE, DYNAMIC_IMPORT] },
  },
]);
