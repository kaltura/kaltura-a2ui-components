/** Kaltura ids arrive from agent output. Check them before they reach a URL or the DOM. */

export function isPositiveInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

/** Entry ids look like `1_abc12345`. Accept letters, digits and underscore only. */
export function isEntryId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_]{1,64}$/.test(value);
}

/** Category ids are integers. Accept up to 12 digits. */
export function isCategoryId(value: unknown): value is string {
  return typeof value === 'string' && /^\d{1,12}$/.test(value);
}
