// Watches the upstream fixes this repo waits for (docs/roadmap.md, gates G1 and G2 in the 1.0
// plan). Prints one row per item. A "ready" row means upstream shipped what we wait for, so the
// workaround can go. The script reads npm and GitHub and changes nothing.
//
//   node scripts/check-upstream.mjs            print the table
//   GITHUB_OUTPUT=file ...                     also writes ready=true|false for the workflow
import { appendFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import semver from 'semver';

const UPSTREAM = 'a2ui-project/a2ui';
const PACKAGES = ['@a2ui/markdown-it', '@a2ui/react', '@a2ui/web_core'];
// Items to report. Their state is context for the rows, and the SSR issue also gates F4.
const ISSUES = { 4059: 'markdown-it peers web_core ^0.15', 3158: 'react import fails in Node (SSR)' };
const PULLS = { 4073: 'markdown-it 0.2.3', 3197: 'react SSR import fix', 3825: 'zod 4 support', 4170: 'web_core accepts @ keys', 4171: 'emit @child, @action, @functionCall' };

// An empty range means the field is missing. semver reads it as "any version", so it must not pass.
const isRange = range => range !== '' && semver.validRange(range) !== null;
const minimum = range => semver.minVersion(range)?.version ?? '0.0.0';

/**
 * Turns what npm and GitHub say into rows.
 * @param {{ npm: Record<string, { version: string; peerDependencies?: Record<string, string>; dependencies?: Record<string, string> }>, github: Record<number, { state: string; merged: boolean }> }} facts
 * @param {{ peerDependencies: Record<string, string>; overrides: Record<string, unknown> }} pkg
 */
export function evaluate(facts, pkg) {
  const { npm, github } = facts;
  const markdown = npm['@a2ui/markdown-it'];
  const webCore = npm['@a2ui/web_core'];
  const react = npm['@a2ui/react'];
  const ourWebCore = minimum(pkg.peerDependencies['@a2ui/web_core']);
  const ourReact = minimum(pkg.peerDependencies['@a2ui/react']);
  const ourDompurify = minimum(String(pkg.overrides.dompurify));
  const markdownWebCore = markdown.peerDependencies?.['@a2ui/web_core'] ?? '';
  const markdownDompurify = markdown.dependencies?.dompurify ?? '';
  const zodRange = webCore.dependencies?.zod ?? webCore.peerDependencies?.zod ?? '';
  const done = number => github[number]?.merged === true || github[number]?.state === 'closed';

  return [
    {
      id: 'G1',
      watch: `@a2ui/markdown-it ${markdown.version} peers web_core "${markdownWebCore}"`,
      ready: isRange(markdownWebCore) && semver.satisfies(ourWebCore, markdownWebCore),
      action: 'Drop the `@a2ui/markdown-it` entry in `overrides` and the matching gate G1 text (roadmap F3)',
    },
    {
      id: 'G1-dompurify',
      watch: `@a2ui/markdown-it ${markdown.version} depends on dompurify "${markdownDompurify}"`,
      ready: isRange(markdownDompurify) && semver.gte(minimum(markdownDompurify), ourDompurify),
      action: 'Drop the dompurify override advice in the README and `docs/host-integration.md`',
    },
    {
      id: 'G2-web_core',
      watch: `@a2ui/web_core latest ${webCore.version}, we require ^${ourWebCore}`,
      ready: semver.gt(webCore.version, ourWebCore),
      action: 'Run the full matrix on the new version. Plan the envelope keys (roadmap F1, F2)',
    },
    {
      id: 'G2-react',
      watch: `@a2ui/react latest ${react.version}, we require ^${ourReact}`,
      ready: semver.gt(react.version, ourReact),
      action: 'Run the full matrix on the new version. Check `check:consumer` to see if the SSR stub can go (roadmap F4)',
    },
    {
      id: 'F4-ssr',
      watch: `upstream issue 3158 is ${github[3158]?.state ?? 'unknown'}`,
      ready: done(3158),
      action: 'Release with a fix: test it, then remove the SSR stub (ADR 0007, roadmap F4)',
    },
    {
      id: 'zod4',
      watch: `@a2ui/web_core ${webCore.version} needs zod "${zodRange}"`,
      ready: isRange(zodRange) && semver.satisfies('4.6.6', zodRange),
      action: 'Move to zod 4 and drop the audit exception in `scripts/audit-gate.mjs` (ADR 0003)',
    },
  ];
}

/** The open and closed state of the upstream items, as context under the table. */
export function describeItems(github) {
  const label = (number, title) => {
    const item = github[number];
    const state = item ? (item.merged ? 'merged' : item.state) : 'unknown';
    return `| ${number} | ${title} | ${state} |`;
  };
  return [
    '| Upstream item | What | State |',
    '|---|---|---|',
    ...Object.entries(ISSUES).map(([number, title]) => label(Number(number), title)),
    ...Object.entries(PULLS).map(([number, title]) => label(Number(number), title)),
  ].join('\n');
}

export function report(rows, github) {
  const table = ['| Gate | Upstream today | Ready | Then |', '|---|---|---|---|', ...rows.map(row => `| ${row.id} | ${row.watch} | ${row.ready ? '**yes**' : 'no'} | ${row.action} |`)];
  return `${table.join('\n')}\n\n${describeItems(github)}\n`;
}

async function getJson(url, headers = {}) {
  const response = await fetch(url, { headers: { accept: 'application/json', ...headers } });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
}

async function collect() {
  const headers = process.env.GITHUB_TOKEN ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {};
  const npm = Object.fromEntries(await Promise.all(PACKAGES.map(async name => [name, await getJson(`https://registry.npmjs.org/${name.replace('/', '%2f')}/latest`)])));
  const numbers = [...Object.keys(ISSUES), ...Object.keys(PULLS)].map(Number);
  const github = Object.fromEntries(
    await Promise.all(
      numbers.map(async number => {
        // /issues/N answers for pull requests too. A merged pull request has pull_request.merged_at.
        const item = await getJson(`https://api.github.com/repos/${UPSTREAM}/issues/${number}`, headers);
        return [number, { state: item.state, merged: Boolean(item.pull_request?.merged_at) }];
      }),
    ),
  );
  return { npm, github };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const facts = await collect();
  const rows = evaluate(facts, pkg);
  const text = report(rows, facts.github);
  process.stdout.write(text);
  const ready = rows.some(row => row.ready);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `ready=${ready}\n`);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, text);
}
