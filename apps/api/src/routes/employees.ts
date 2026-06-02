import type { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';
import { Employee, EmployeeBody, ListQuery } from '../schemas/employee.js';
import {
  createEmployee,
  deleteEmployee,
  listEmployees,
  updateEmployee,
} from '../repositories/employees.js';

const IdParam = Type.Object({ id: Type.String({ format: 'uuid' }) });
const NotFound = Type.Object({ message: Type.String() });

const employeeRoutes: FastifyPluginAsyncTypebox = async (fastify) => {
  fastify.post(
    '/',
    { schema: { body: EmployeeBody, response: { 201: Employee } } },
    async (request, reply) => {
      const employee = await createEmployee(fastify.pg.pool, request.body);
      reply.code(201);
      return employee;
    },
  );

  fastify.get(
    '/',
    { schema: { querystring: ListQuery, response: { 200: Type.Array(Employee) } } },
    (request) => listEmployees(fastify.pg.pool, request.query),
  );

  fastify.put(
    '/:id',
    { schema: { params: IdParam, body: EmployeeBody, response: { 200: Employee, 404: NotFound } } },
    async (request, reply) => {
      const employee = await updateEmployee(fastify.pg.pool, request.params.id, request.body);
      if (!employee) {
        reply.code(404);
        return { message: 'Employee not found' };
      }
      return employee;
    },
  );

  fastify.delete(
    '/:id',
    { schema: { params: IdParam, response: { 204: Type.Null(), 404: NotFound } } },
    async (request, reply) => {
      const deleted = await deleteEmployee(fastify.pg.pool, request.params.id);
      if (!deleted) {
        reply.code(404);
        return { message: 'Employee not found' };
      }
      reply.code(204);
      return null;
    },
  );
};

export default employeeRoutes;
