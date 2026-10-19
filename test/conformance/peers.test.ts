// Covers: CONF-14: the conformance run uses the oldest peers.
// package.json peers are ranges (both ^0.13.0). The lockfile installs the
// lowest version each range allows, so every test in this suite is an
// "oldest peer" run. CI has no "newest peer" run. To try one by hand, run
// "npm install --no-save @a2ui/web_core@latest @a2ui/react@latest" and then
// "npm run test:conformance" (see CONTRIBUTING.md). Restore with "npm ci".
import { describe, it, expect } from 'vitest';
import { readJson } from './helpers';

interface Pkg {
  version: string;
  peerDependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}
const pkg = readJson<Pkg>('package.json');
const installed = (name: string) => readJson<Pkg>(`node_modules/${name}/package.json`).version;
const floor = (range: string) => range.replace(/^[\^~]/, '');

describe('CONF-14: the installed A2UI packages are the peer range minimums', () => {
  it.each(['@a2ui/web_core', '@a2ui/react'])('CONF-14: %s is installed at the lowest version its range allows', name => {
    expect(installed(name)).toBe(floor(pkg.peerDependencies[name]));
  });

  it.each(['@a2ui/web_core', '@a2ui/react'])('CONF-14: %s peer range is a caret on 0.x (one minor line)', name => {
    expect(pkg.peerDependencies[name]).toMatch(/^\^0\.\d+\.\d+$/);
  });
});
