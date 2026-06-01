import { buildApp } from './app.js';

// PORT must match the port assigned by the host (on mikr.us it drives the auto-SSL
// subdomain — design D1). host 0.0.0.0 so the container/VPS accepts external traffic.
const port = Number(process.env.PORT ?? 3000);

const app = await buildApp();

try {
  await app.listen({ port, host: '0.0.0.0' });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
