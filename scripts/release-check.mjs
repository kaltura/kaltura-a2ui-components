// Checks a release version before release.yml builds it.
//   node scripts/release-check.mjs 0.2.0 >> "$GITHUB_OUTPUT"
// Prints `version=`, `tag=` and `prerelease=` lines. Exits 1 with a message when the
// version is not semver, is not the package.json version, or package.json is not private.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const VERSION = /^(\d+)\.(\d+)\.(\d+)(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$/;

/** Returns the version, the tag and the prerelease flag for `X.Y.Z[-pre]`. */
export function parseVersion(version) {
  const match = VERSION.exec(version);
  if (!match || match.slice(1, 4).some(part => part.length > 1 && part.startsWith('0'))) {
    throw new Error(`Version "${version}" is not X.Y.Z or X.Y.Z-prerelease.`);
  }
  return { version, tag: `v${version}`, prerelease: match[4] !== undefined };
}

/** Same as parseVersion, for a `vX.Y.Z[-pre]` tag. */
export function parseTag(tag) {
  if (!tag.startsWith('v')) throw new Error(`Tag "${tag}" is not vX.Y.Z or vX.Y.Z-prerelease.`);
  return parseVersion(tag.slice(1));
}

/** Throws unless the version and package.json agree. Returns the parsed version. */
export function checkRelease(version, { pkg }) {
  const parsed = parseVersion(version);
  if (pkg.private !== true) throw new Error('package.json must have "private": true. Releases go to jsDelivr from GitHub tags, never to npm.');
  if (pkg.version !== parsed.version) {
    throw new Error(`Version ${version} does not match package.json version ${pkg.version}. Bump the version in a commit on main first.`);
  }
  return parsed;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    const root = join(dirname(fileURLToPath(import.meta.url)), '..');
    const { version, tag, prerelease } = checkRelease(process.argv[2] ?? '', {
      pkg: JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')),
    });
    console.log(`version=${version}\ntag=${tag}\nprerelease=${prerelease}`);
  } catch (error) {
    console.error(`release-check: ${error.message}`);
    process.exit(1);
  }
}
