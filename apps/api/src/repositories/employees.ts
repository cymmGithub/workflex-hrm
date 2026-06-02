import type { Pool } from 'pg';
import type { Static } from '@sinclair/typebox';
import { v7 as uuidv7 } from 'uuid';
import { Employee, ListQuery, type EmployeeBody } from '../schemas/employee.js';

type EmployeeDto = Static<typeof Employee>;
type EmployeeFilters = Static<typeof ListQuery>;
type EmployeeRow = Omit<EmployeeDto, 'hourly_rate'> & { hourly_rate: string };

const toEmployee = (row: EmployeeRow): EmployeeDto => ({
  ...row,
  hourly_rate: Number(row.hourly_rate),
});

export async function listEmployees(db: Pool, filters: EmployeeFilters): Promise<EmployeeDto[]> {
  const conditions: string[] = [];
  const values: string[] = [];
  if (filters.project) {
    values.push(filters.project);
    conditions.push(`project_id = $${values.length}`);
  }
  if (filters.status) {
    values.push(filters.status);
    conditions.push(`status = $${values.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await db.query<EmployeeRow>(
    `SELECT * FROM employees ${where} ORDER BY last_name, first_name`,
    values,
  );
  return result.rows.map(toEmployee);
}

export async function createEmployee(db: Pool, data: EmployeeBody): Promise<EmployeeDto> {
  const result = await db.query<EmployeeRow>(
    `INSERT INTO employees
       (id, project_id, first_name, last_name, position, hourly_rate, allocated_hours, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      uuidv7(),
      data.project_id,
      data.first_name,
      data.last_name,
      data.position,
      data.hourly_rate,
      data.allocated_hours,
      data.status,
    ],
  );
  const row = result.rows[0];
  if (!row) throw new Error('INSERT returned no row');
  return toEmployee(row);
}

export async function updateEmployee(
  db: Pool,
  id: string,
  data: EmployeeBody,
): Promise<EmployeeDto | null> {
  const result = await db.query<EmployeeRow>(
    `UPDATE employees
        SET project_id = $2, first_name = $3, last_name = $4, position = $5,
            hourly_rate = $6, allocated_hours = $7, status = $8
      WHERE id = $1
      RETURNING *`,
    [
      id,
      data.project_id,
      data.first_name,
      data.last_name,
      data.position,
      data.hourly_rate,
      data.allocated_hours,
      data.status,
    ],
  );
  const row = result.rows[0];
  return row ? toEmployee(row) : null;
}

export async function deleteEmployee(db: Pool, id: string): Promise<boolean> {
  const result = await db.query('DELETE FROM employees WHERE id = $1', [id]);
  return result.rowCount !== 0;
}
