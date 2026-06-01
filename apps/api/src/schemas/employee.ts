import { Type, type Static } from '@sinclair/typebox';

export const EmployeeStatus = Type.Union([
  Type.Literal('ASSIGNED'),
  Type.Literal('BENCH'),
  Type.Literal('ON_LEAVE'),
  Type.Literal('INACTIVE'),
]);

export const EmployeeBody = Type.Object({
  first_name: Type.String({ minLength: 1 }),
  last_name: Type.String({ minLength: 1 }),
  position: Type.String({ minLength: 1 }),
  project_id: Type.String({ format: 'uuid' }),
  hourly_rate: Type.Number({ minimum: 0 }),
  allocated_hours: Type.Integer({ minimum: 0 }),
  status: EmployeeStatus,
});

export const Employee = Type.Composite([
  EmployeeBody,
  Type.Object({ id: Type.String({ format: 'uuid' }) }),
]);

export const ListQuery = Type.Object({
  project: Type.Optional(Type.String({ format: 'uuid' })),
  status: Type.Optional(EmployeeStatus),
});

export const SummaryQuery = Type.Object({ project: Type.String({ format: 'uuid' }) });

export type EmployeeBody = Static<typeof EmployeeBody>;
