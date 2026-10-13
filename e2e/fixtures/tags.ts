import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(import.meta.dirname, '..', '..', 'src', 'adapters', 'webcomponent');

/** Tag names listed in KALTURA_WC_TAGS, resolved from the `*_TAG` constants in src. */
export function wcTags(): string[] {
  const constants = new Map<string, string>();
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.ts'))) {
    for (const m of readFileSync(join(dir, file), 'utf8').matchAll(/export const (\w+_TAG) = '([^']+)'/g)) {
      constants.set(m[1], m[2]);
    }
  }
  const index = readFileSync(join(dir, 'index.ts'), 'utf8');
  const list = /KALTURA_WC_TAGS = \[([^\]]*)\]/.exec(index)?.[1] ?? '';
  return list.split(',').map((s) => s.trim()).filter(Boolean).map((name) => {
    const tag = constants.get(name);
    if (!tag) throw new Error(`No tag constant found for ${name}`);
    return tag;
  });
}
