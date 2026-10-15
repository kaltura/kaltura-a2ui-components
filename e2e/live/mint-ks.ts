// Mints a short-lived admin KS for the live test. Runs in the test process only: the secret and the KS
// never reach a file, a log or an error message. NVP1 is the US region, so the host is the one in
// src/core/region.ts (`serviceUrl`).
const SERVICE_URL = 'https://www.kaltura.com';
const EXPIRY_SECONDS = 600;

export async function mintKs(partnerId: number, adminSecret: string, userId = 'a2ui-live-test', options: { type?: 0 | 2; privileges?: string } = {}): Promise<string> {
  const res = await fetch(`${SERVICE_URL}/api_v3/service/session/action/start`, {
    method: 'POST',
    body: new URLSearchParams({
      format: '1',
      partnerId: String(partnerId),
      secret: adminSecret,
      type: String(options.type ?? 2),
      userId,
      privileges: options.privileges ?? 'disableentitlement',
      expiry: String(EXPIRY_SECONDS),
    }),
  });
  const body: unknown = await res.json();
  // On failure the API returns an object with a `code`, such as START_SESSION_ERROR.
  if (typeof body === 'string' && body.length > 20) return body;
  const code = typeof body === 'object' && body !== null && 'code' in body ? String(body.code) : `HTTP ${res.status}`;
  throw new Error(
    `session.start failed (${code}). Check the partner id and the admin secret. ` +
      'With a quoted value in .env, load it with node --env-file, which removes the quotes.',
  );
}
