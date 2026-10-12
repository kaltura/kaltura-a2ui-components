// Two local origins for browser tests. Node built-ins only.
//   A (default :4310) serves the harness page and dist/.
//   B (default :4311) serves hostile loader modules.
// Both log every request under its first path segment (the test token).
// Read the log with GET /__log?token=<token>. Control routes are not logged.
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const dist = join(root, 'dist');
const portA = Number(process.env.E2E_PORT_A ?? 4310);
const portB = Number(process.env.E2E_PORT_B ?? 4311);

if (!existsSync(join(dist, 'kaltura-wc.js'))) {
  const build = spawnSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit' });
  if (build.status !== 0) process.exit(build.status ?? 1);
}

// Module bodies. Hostile ones push to window.__pwned if they run or inject markup.
const pushPwned = (m) => `(window.__pwned = window.__pwned || []).push(${JSON.stringify(m)});`;
const hostileText = (m) => JSON.stringify(`<img src=x onerror='${pushPwned(m)}'>`);
const MODULES = {
  throw: `throw new Error(${hostileText('error-message')});`,
  throwstr: `throw ${hostileText('string-rejection')};`,
  codeload: `${pushPwned('loader-module-code-ran')}
export const loader = async () => { throw new Error('stub'); };
export const createWorkspace = async () => { throw new Error('stub'); };`,
  ok: `export const loader = async (cfg) => {
  (window.__loaderCalls = window.__loaderCalls || []).push(cfg.serverUrl);
  return { kill() {} };
};
export const createWorkspace = async () => ({
  getRuntimeAsync: async () => ({ mountVisual: async () => 'v1', unmountVisual() {} }),
});`,
};
const SLOW_MS = 3000;
// 1x1 transparent PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

const logs = { A: [], B: [] };

function send(res, status, type, body) {
  res.writeHead(status, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*' });
  res.end(body);
}

function makeServer(name, handle) {
  return createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (req.method === 'OPTIONS') return send(res, 204, 'text/plain', '');
    if (url.pathname === '/__health') return send(res, 200, 'text/plain', 'ok');
    if (url.pathname === '/__log') {
      const token = url.searchParams.get('token');
      return send(res, 200, 'application/json', JSON.stringify(logs[name].filter((e) => e.token === token)));
    }
    logs[name].push({ token: url.pathname.split('/')[1] ?? '', path: url.pathname, ts: Date.now() });
    handle(url, res);
  });
}

const types = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.map': 'application/json' };
function serveFile(res, file) {
  if (!existsSync(file)) return send(res, 404, 'text/plain', 'not found');
  const ext = file.slice(file.lastIndexOf('.'));
  send(res, 200, types[ext] ?? 'application/octet-stream', readFileSync(file));
}

const serverA = makeServer('A', (url, res) => {
  if (url.pathname === '/harness.html') return serveFile(res, join(root, 'e2e', 'fixtures', 'harness.html'));
  if (url.pathname.startsWith('/dist/')) {
    const file = normalize(join(root, url.pathname));
    if (!file.startsWith(dist + sep)) return send(res, 404, 'text/plain', 'not found');
    return serveFile(res, file);
  }
  send(res, 404, 'text/plain', 'not found');
});

// B paths: /<token>/<mode>/v1/loader/index.esm.js, or /<token>/img.png
const serverB = makeServer('B', (url, res) => {
  const [, , mode, ...rest] = url.pathname.split('/');
  if (url.pathname.endsWith('/img.png')) return send(res, 200, 'image/png', PNG);
  if (rest.join('/') !== 'v1/loader/index.esm.js') return send(res, 404, 'text/plain', 'not found');
  if (mode === 'slow') {
    return void setTimeout(() => send(res, 200, 'text/javascript', MODULES.ok), SLOW_MS);
  }
  const body = MODULES[mode];
  if (body === undefined) return send(res, 404, 'text/plain', 'not found');
  send(res, 200, 'text/javascript', body);
});

serverA.listen(portA, '127.0.0.1');
serverB.listen(portB, '127.0.0.1');
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => process.exit(0));
