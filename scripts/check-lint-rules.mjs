// Proves that the banned-pattern ESLint rules (eslint.config.js) fail on bad
// samples and stay quiet on good ones. A rule that silently stops matching
// would otherwise go unnoticed. Runs as part of "npm run lint".
import { ESLint } from 'eslint';

const SRC = 'src/core/sample.tsx';
const FLASHCARDS = 'src/core/flashcards.tsx';
const LOADER = 'src/core/unisphere-loader.ts';

// [name, file path, code, expected number of banned-pattern errors]
const samples = [
  ['innerHTML assignment', SRC, 'el.innerHTML = x;', 1],
  ['innerHTML append', SRC, 'el.innerHTML += x;', 1],
  ['innerHTML computed', SRC, "el['innerHTML'] = x;", 1],
  ['outerHTML assignment', SRC, 'el.outerHTML = x;', 1],
  ['insertAdjacentHTML', SRC, "el.insertAdjacentHTML('beforeend', x);", 1],
  ['dangerouslySetInnerHTML', SRC, 'export const A = () => <div dangerouslySetInnerHTML={{ __html: x }} />;', 1],
  ['srcDoc prop', SRC, 'export const A = () => <iframe srcDoc={x} />;', 1],
  ['srcdoc assignment', SRC, 'frame.srcdoc = x;', 1],
  ['srcdoc setAttribute', SRC, "frame.setAttribute('srcdoc', x);", 1],
  ['srcdoc computed assignment', SRC, "frame['srcdoc'] = x;", 1],
  ['srcdoc setAttributeNS', SRC, "frame.setAttributeNS(null, 'srcdoc', x);", 1],
  ['srcdoc JSX attribute lower case', SRC, 'export const A = () => <iframe srcdoc={x} />;', 1],
  ['srcDoc dot assignment', SRC, "const p = {}; p.srcDoc = x; h('iframe', p);", 1],
  ['dangerouslySetInnerHTML dot assignment', SRC, "const p = {}; p.dangerouslySetInnerHTML = { __html: x }; h('div', p);", 1],
  ['srcDoc in createElement props', SRC, "h('iframe', { srcDoc: x });", 1],
  ['srcdoc string key in props', SRC, "h('iframe', { 'srcdoc': x });", 1],
  ['srcDoc in spread-built props', SRC, "const props = { srcDoc: x }; h('iframe', { ...props });", 1],
  ['dangerouslySetInnerHTML in createElement props', SRC, "h('div', { dangerouslySetInnerHTML: { __html: x } });", 1],
  ['dangerouslySetInnerHTML string key in props', SRC, "h('div', { 'dangerouslySetInnerHTML': { __html: x } });", 1],
  ['document.write', SRC, 'document.write(x);', 1],
  ['document.writeln', SRC, 'document.writeln(x);', 1],
  ['eval', SRC, 'eval(x);', 1],
  ['window.eval', SRC, 'window.eval(x);', 1],
  ['new Function', SRC, 'new Function(x);', 1],
  ['Function call', SRC, 'Function(x)();', 1],
  ['dynamic import with variable', SRC, 'import(x);', 1],

  ['reading innerHTML is allowed', SRC, 'const html = el.innerHTML;', 0],
  ['textContent is allowed', SRC, 'el.textContent = x;', 0],
  ['literal import is allowed', SRC, "import('./a.js');", 0],
  ['srcdoc-like attribute names are allowed', SRC, "el.setAttribute('title', x);", 0],

  ['flashcards may use dangerouslySetInnerHTML', FLASHCARDS, 'export const A = () => <div dangerouslySetInnerHTML={{ __html: x }} />;', 0],
  ['flashcards may use dangerouslySetInnerHTML in props', FLASHCARDS, "h('div', { dangerouslySetInnerHTML: { __html: x } });", 0],
  ['flashcards may not set srcDoc in props', FLASHCARDS, "h('iframe', { srcDoc: x });", 1],
  ['flashcards may not assign innerHTML', FLASHCARDS, 'el.innerHTML = x;', 1],
  ['flashcards may not import() a variable', FLASHCARDS, 'import(x);', 1],
  ['loader may import() a variable', LOADER, 'import(x);', 0],
  ['loader may not use eval', LOADER, 'eval(x);', 1],

  ['tests are exempt', 'test/sample.test.tsx', 'el.innerHTML = x;', 0],
];

const eslint = new ESLint();
const failures = [];

for (const [name, filePath, code, expected] of samples) {
  const [result] = await eslint.lintText(code, { filePath });
  const banned = result.messages.filter((m) => m.ruleId === 'no-restricted-syntax');
  const wrongSeverity = banned.filter((m) => m.severity !== 2);
  if (banned.length !== expected) failures.push(`${name}: expected ${expected} banned-pattern error(s), got ${banned.length}.`);
  else if (wrongSeverity.length > 0) failures.push(`${name}: banned pattern reported as a warning, not an error.`);
}

if (failures.length > 0) {
  for (const message of failures) console.error(`FAIL ${message}`);
  console.error(`check-lint-rules: ${failures.length} sample(s) failed.`);
  process.exit(1);
}
console.log(`check-lint-rules: ${samples.length} samples passed.`);
