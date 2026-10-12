// Checks a release version before release.yml builds it.
//   node scripts/release-check.mjs 0.2.0 >> "$GITHUB_OUTPUT"
// Prints `version=`, `tag=` and `prerelease=` lines. Exits 1 with a message when the
// version is not semver, is not the package.json version, has no dated CHANGELOG
// section, or package.json is not private.
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

/** The `## X.Y.Z - YYYY-MM-DD` section of the CHANGELOG: its date and its body without the heading. */
export function changelogSection(changelog, version) {
  const prefix = `## ${version} - `;
  const lines = changelog.split('\n');
  const start = lines.findIndex(line => line.startsWith(prefix) && /^\d{4}-\d{2}-\d{2}$/.test(line.slice(prefix.length)));
  if (start === -1) throw new Error(`CHANGELOG.md has no "## ${version} - YYYY-MM-DD" section.`);
  const next = lines.findIndex((line, index) => index > start && line.startsWith('## '));
  const body = lines.slice(start + 1, next === -1 ? undefined : next).join('\n').trim();
  if (!body) throw new Error(`The CHANGELOG.md section for ${version} is empty.`);
  return { date: lines[start].slice(prefix.length), body };
}

/** Throws unless the version, package.json and the CHANGELOG agree. Returns the parsed version. */
export function checkRelease(version, { pkg, changelog }) {
  const parsed = parseVersion(version);
  if (pkg.private !== true) throw new Error('package.json must have "private": true. Releases go to jsDelivr from GitHub tags, never to npm.');
  if (pkg.version !== parsed.version) {
    throw new Error(`Version ${version} does not match package.json version ${pkg.version}. Bump the version in a commit on main first.`);
  }
  changelogSection(changelog, parsed.version);
  return parsed;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    const root = join(dirname(fileURLToPath(import.meta.url)), '..');
    const { version, tag, prerelease } = checkRelease(process.argv[2] ?? '', {
      pkg: JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')),
      changelog: readFileSync(join(root, 'CHANGELOG.md'), 'utf8'),
    });
    console.log(`version=${version}\ntag=${tag}\nprerelease=${prerelease}`);
  } catch (error) {
    console.error(`release-check: ${error.message}`);
    process.exit(1);
  }
}
