export const PORT_A = Number(process.env.E2E_PORT_A ?? 4310);
export const PORT_B = Number(process.env.E2E_PORT_B ?? 4311);
export const ORIGIN_A = `http://127.0.0.1:${PORT_A}`;
export const ORIGIN_B = `http://127.0.0.1:${PORT_B}`;

// Approved Unisphere origins (plan task 1.2). Requests to them are stubbed, never sent.
export const ALLOWED_HOSTS = ['nvp1', 'irp2', 'frp2', 'cap2', 'syp2'].map(
  (r) => `https://unisphere.${r}.ovp.kaltura.com`,
);
