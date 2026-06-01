import fp from 'fastify-plugin';
import fastifyPostgres from '@fastify/postgres';

/**
 * Registers @fastify/postgres, decorating the instance with `fastify.pg`
 * (a pooled client for raw parametrized SQL — design D3).
 *
 * @fastify/postgres owns the pool lifecycle and closes it on app shutdown (its own
 * onClose hook), so no manual teardown is needed here.
 */
export default fp(
  async (fastify) => {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set');
    }
    await fastify.register(fastifyPostgres, { connectionString });
  },
  { name: 'db' },
);
