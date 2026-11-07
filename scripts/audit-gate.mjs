// The npm audit gate for CI: fails on any high or critical advisory, except the
// ones listed below. Every exception has a reason and an expiry date. After the
// date the gate fails again, so the exception gets a new review.
import { execFileSync } from 'node:child_process';

const EXCEPTIONS = [
  {
    // Zod below 4.6.6 builds one issue per bad array element before it checks the
    // array size. The fix exists only in Zod 4. @a2ui/react and @a2ui/web_core
    // (0.14 and 0.15) need Zod ^3, and Zod 4 breaks their types and our tests.
    // The cost is memory in proportion to the size of the message the agent
    // already sent. Remove when @a2ui supports Zod 4 (ADR 0003).
    url: 'https://github.com/advisories/GHSA-mrhx-c7xc-m3w5',
    expires: '2026-12-31',
  },
];

// npm audit exits 1 when it finds anything, and still prints the JSON.
let output;
try {
  output = execFileSync('npm', ['audit', '--json'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
} catch (error) {
  output = error.stdout;
}
const { vulnerabilities = {} } = JSON.parse(output);

const today = new Date().toISOString().slice(0, 10);
const allowed = new Set(EXCEPTIONS.filter(({ expires }) => expires >= today).map(({ url }) => url));
for (const { url, expires } of EXCEPTIONS) {
  if (expires < today) console.error(`Exception for ${url} expired on ${expires}. Review it.`);
}

// A string in `via` is a package that depends on a vulnerable one. An object is an advisory.
const failures = new Map();
for (const [name, { via }] of Object.entries(vulnerabilities)) {
  for (const advisory of via) {
    if (typeof advisory === 'string' || !['high', 'critical'].includes(advisory.severity) || allowed.has(advisory.url)) continue;
    failures.set(advisory.url, `${advisory.severity} in ${name}: ${advisory.title} ${advisory.url}`);
  }
}

for (const message of failures.values()) console.error(message);
if (failures.size) process.exit(1);
console.log(`npm audit: no high or critical advisories (${allowed.size} excepted).`);
