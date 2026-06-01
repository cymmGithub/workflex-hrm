import type { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createType('employee_status', ['ASSIGNED', 'BENCH', 'ON_LEAVE', 'INACTIVE']);

  pgm.createTable('employees', {
    id: { type: 'uuid', primaryKey: true },
    project_id: { type: 'uuid', notNull: true, references: 'projects', onDelete: 'RESTRICT' },
    first_name: { type: 'text', notNull: true },
    last_name: { type: 'text', notNull: true },
    position: { type: 'text', notNull: true },
    hourly_rate: { type: 'numeric', notNull: true, check: 'hourly_rate >= 0' },
    allocated_hours: { type: 'integer', notNull: true, check: 'allocated_hours >= 0' },
    status: { type: 'employee_status', notNull: true },
  });
  pgm.createIndex('employees', 'project_id');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('employees');
  pgm.dropType('employee_status');
}
