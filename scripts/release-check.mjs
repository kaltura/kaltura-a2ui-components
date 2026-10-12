// Checks that a release tag matches package.json. Used by release.yml.
//   node scripts/release-check.mjs v0.2.0 >> "$GITHUB_OUTPUT"
// Prints `version=` and `npm_tag=` lines. Exits 1 with a message on a mismatch.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const TAG = /^v(\d+\.\d+\.\d+)(-[0-9A-Za-z.-]+)?$/;

/** Returns the version and the npm dist-tag for a `vX.Y.Z[-pre]` tag. */
export function parseTag(tag) {
  const match = TAG.exec(tag);
  if (!match) throw new Error(`Tag "${tag}" is not vX.Y.Z or vX.Y.Z-prerelease.`);
  return { version: `${match[1]}${match[2] ?? ''}`, npmTag: match[2] ? 'next' : 'latest' };
}

/** Throws unless the tag and package.json agree. Returns the parsed tag. */
export function checkRelease(tag, pkg) {
  const parsed = parseTag(tag);
  if (pkg.private === true) throw new Error('package.json is private: it cannot be published.');
  if (pkg.version !== parsed.version) {
    throw new Error(`Tag ${tag} does not match package.json version ${pkg.version}. Bump the version in a commit on main, then tag that commit.`);
  }
  return parsed;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    const pkgPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json');
    const { version, npmTag } = checkRelease(process.argv[2] ?? '', JSON.parse(readFileSync(pkgPath, 'utf8')));
    console.log(`version=${version}\nnpm_tag=${npmTag}`);
  } catch (error) {
    console.error(`release-check: ${error.message}`);
    process.exit(1);
  }
}
