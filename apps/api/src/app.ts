import Fastify, { type FastifyInstance } from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import ajvFormats from 'ajv-formats';
import dbPlugin from './plugins/db.js';
import employeeRoutes from './routes/employees.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: true,
    // Enable JSON Schema string formats (uuid, email, date-time, …).
    // Ajv v7+ / Fastify v5 do not bundle these, so `format: 'uuid'` is a no-op without this.
    // Cast: ajv-formats' plugin type is stricter on `options` than Fastify's `Plugin<unknown>`
    // (a known ajv-formats × Fastify typing mismatch) — the registration is correct at runtime.
    ajv: { plugins: [ajvFormats.default as never] },
  }).withTypeProvider<TypeBoxTypeProvider>();

  await app.register(dbPlugin);

  app.get('/api/health', () => ({ status: 'ok' }));

  await app.register(employeeRoutes, { prefix: '/api/employees' });

  return app;
}
