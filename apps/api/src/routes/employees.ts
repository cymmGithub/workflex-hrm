import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type, type Static } from '@sinclair/typebox';
import { v7 as uuidv7 } from 'uuid';
import { Employee, EmployeeBody, ListQuery } from '../schemas/employee.js';

const IdParam = Type.Object({ id: Type.String({ format: 'uuid' }) });
const NotFound = Type.Object({ message: Type.String() });

// DB row: same fields as the API Employee, but `numeric` (hourly_rate) arrives from pg as a string.
type EmployeeRow = Omit<Static<typeof Employee>, 'hourly_rate'> & { hourly_rate: string };

// Single place that maps a DB row to the API shape (numeric string -> number).
const toEmployee = (row: EmployeeRow) => ({ ...row, hourly_rate: Number(row.hourly_rate) });

const employeeRoutes: FastifyPluginAsyncTypebox = async (fastify) => {
  // CREATE — POST /api/employees
  fastify.post(
    '/',
    { schema: { body: EmployeeBody, response: { 201: Employee } } },
    async (request, reply) => {
      const { project_id, first_name, last_name, position, hourly_rate, allocated_hours, status } =
        request.body;
      const result = await fastify.pg.query<EmployeeRow>(
        `INSERT INTO employees
           (id, project_id, first_name, last_name, position, hourly_rate, allocated_hours, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          uuidv7(),
          project_id,
          first_name,
          last_name,
          position,
          hourly_rate,
          allocated_hours,
          status,
        ],
      );
      const row = result.rows[0];
      if (!row) throw new Error('INSERT returned no row');
      reply.code(201);
      return toEmployee(row);
    },
  );

  // LIST (+ optional filters) — GET /api/employees?project=&status=
  fastify.get(
    '/',
    { schema: { querystring: ListQuery, response: { 200: Type.Array(Employee) } } },
    async (request) => {
      const { project, status } = request.query;

      const conditions: string[] = [];
      const values: string[] = [];
      if (project) {
        values.push(project);
        conditions.push(`project_id = $${values.length}`);
      }
      if (status) {
        values.push(status);
        conditions.push(`status = $${values.length}`);
      }
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

      const result = await fastify.pg.query<EmployeeRow>(
        `SELECT * FROM employees ${where} ORDER BY last_name, first_name`,
        values,
      );
      return result.rows.map(toEmployee);
    },
  );

  // UPDATE — PUT /api/employees/:id
  fastify.put(
    '/:id',
    { schema: { params: IdParam, body: EmployeeBody, response: { 200: Employee, 404: NotFound } } },
    async (request, reply) => {
      const { id } = request.params;
      const { project_id, first_name, last_name, position, hourly_rate, allocated_hours, status } =
        request.body;
      const result = await fastify.pg.query<EmployeeRow>(
        `UPDATE employees
            SET project_id = $2, first_name = $3, last_name = $4, position = $5,
                hourly_rate = $6, allocated_hours = $7, status = $8
          WHERE id = $1
          RETURNING *`,
        [id, project_id, first_name, last_name, position, hourly_rate, allocated_hours, status],
      );
      const row = result.rows[0];
      if (!row) {
        reply.code(404);
        return { message: 'Employee not found' };
      }
      return toEmployee(row);
    },
  );

  // DELETE — DELETE /api/employees/:id
  fastify.delete(
    '/:id',
    { schema: { params: IdParam, response: { 204: Type.Null(), 404: NotFound } } },
    async (request, reply) => {
      const { id } = request.params;
      const result = await fastify.pg.query('DELETE FROM employees WHERE id = $1', [id]);
      if (result.rowCount === 0) {
        reply.code(404);
        return { message: 'Employee not found' };
      }
      reply.code(204);
      return null;
    },
  );
};

export default employeeRoutes;
