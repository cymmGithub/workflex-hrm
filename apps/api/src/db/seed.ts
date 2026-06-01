import { Pool } from 'pg';
import { v7 as uuidv7 } from 'uuid';

/**
 * Seed script — populates the `projects` reference table and sample employees.
 * Run with:  pnpm --filter @workflex/api seed   (loads .env, executed via tsx)
 *
 * Uses a one-off pg Pool + raw parametrized SQL — the same data-access style as the API (design D3).
 * IDs are generated with UUID v7, matching how the API creates rows (design D9).
 * Idempotent: TRUNCATEs first inside a transaction, so it is safe to re-run.
 *
 * Employees are generated deterministically from fixed pools (no randomness) so the
 * dataset is reproducible across runs.
 */

const EMPLOYEE_COUNT = 100;

type EmployeeStatus = 'ASSIGNED' | 'BENCH' | 'ON_LEAVE' | 'INACTIVE';

interface SeedProject {
  id: string;
  name: string;
}

interface SeedEmployee {
  projectId: string;
  firstName: string;
  lastName: string;
  position: string;
  hourlyRate: number;
  allocatedHours: number;
  status: EmployeeStatus;
}

// Project ids are generated up front so employees can reference them.
const acme: SeedProject = { id: uuidv7(), name: 'Acme Banking Platform' };
const globex: SeedProject = { id: uuidv7(), name: 'Globex Mobile App' };
const initech: SeedProject = { id: uuidv7(), name: 'Initech Internal Tools' };

const projects: SeedProject[] = [acme, globex, initech];

const FIRST_NAMES = [
  'Anna', 'Marek', 'Piotr', 'Katarzyna', 'Tomasz', 'Magdalena', 'Rafał', 'Agnieszka',
  'Paweł', 'Joanna', 'Krzysztof', 'Monika', 'Michał', 'Ewa', 'Jakub', 'Aleksandra',
  'Łukasz', 'Natalia', 'Grzegorz', 'Karolina', 'Adam', 'Zofia', 'Bartosz', 'Weronika',
];

const LAST_NAMES = [
  'Nowak', 'Wójcik', 'Mazur', 'Krawczyk', 'Woźniak', 'Zając', 'Wieczorek', 'Król',
  'Dudek', 'Kamiński', 'Lewandowski', 'Zieliński', 'Szymański', 'Kowalczyk', 'Jankowski', 'Wojciechowski',
  'Kwiatkowski', 'Kaczmarek', 'Piotrowski', 'Grabowski', 'Pawłowski', 'Michalski', 'Adamczyk', 'Górski',
];

const POSITIONS: { title: string; baseRate: number }[] = [
  { title: 'Backend Developer', baseRate: 95 },
  { title: 'Frontend Developer', baseRate: 88 },
  { title: 'Fullstack Developer', baseRate: 100 },
  { title: 'QA Engineer', baseRate: 70 },
  { title: 'DevOps Engineer', baseRate: 110 },
  { title: 'Project Manager', baseRate: 130 },
  { title: 'UX Designer', baseRate: 85 },
  { title: 'Data Analyst', baseRate: 78 },
  { title: 'Scrum Master', baseRate: 115 },
  { title: 'Tech Lead', baseRate: 140 },
];

// Repeating 20-slot pattern → roughly 70% ASSIGNED, 15% BENCH, 10% ON_LEAVE, 5% INACTIVE.
const STATUS_CYCLE: EmployeeStatus[] = [
  'ASSIGNED', 'ASSIGNED', 'ASSIGNED', 'ASSIGNED', 'ASSIGNED', 'ASSIGNED', 'ASSIGNED',
  'BENCH', 'ASSIGNED', 'ASSIGNED', 'ASSIGNED', 'ON_LEAVE', 'ASSIGNED', 'ASSIGNED',
  'BENCH', 'ASSIGNED', 'ASSIGNED', 'ON_LEAVE', 'BENCH', 'INACTIVE',
];

const HOURS_CYCLE = [160, 150, 168, 120, 80, 40];

/** Index into a non-empty pool with wrap-around; throws on empty (keeps types non-undefined). */
function at<T>(pool: readonly T[], index: number): T {
  const value = pool[index % pool.length];
  if (value === undefined) {
    throw new Error('Cannot pick from an empty pool');
  }
  return value;
}

function buildEmployees(count: number): SeedEmployee[] {
  const out: SeedEmployee[] = [];
  for (let i = 0; i < count; i++) {
    const position = at(POSITIONS, i);
    out.push({
      projectId: at(projects, i).id, // round-robin across the 3 projects
      firstName: at(FIRST_NAMES, i),
      lastName: at(LAST_NAMES, i * 7 + 3), // offset so first/last names don't move in lockstep
      position: position.title,
      hourlyRate: position.baseRate + (i % 6) * 2.5, // deterministic spread, exercises numeric decimals
      allocatedHours: at(HOURS_CYCLE, i),
      status: at(STATUS_CYCLE, i),
    });
  }
  return out;
}

const employees: SeedEmployee[] = buildEmployees(EMPLOYEE_COUNT);

async function seed(): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Idempotency: clear both tables together (one statement satisfies the FK between them).
    await client.query('TRUNCATE employees, projects');

    for (const p of projects) {
      await client.query('INSERT INTO projects (id, name) VALUES ($1, $2)', [p.id, p.name]);
    }

    for (const e of employees) {
      await client.query(
        `INSERT INTO employees
           (id, project_id, first_name, last_name, position, hourly_rate, allocated_hours, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [uuidv7(), e.projectId, e.firstName, e.lastName, e.position, e.hourlyRate, e.allocatedHours, e.status],
      );
    }

    await client.query('COMMIT');
    console.log(`Seeded ${projects.length} projects and ${employees.length} employees.`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err: unknown) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
