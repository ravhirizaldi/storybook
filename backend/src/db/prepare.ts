import { pool } from './index.js';

async function prepare() {
  await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
  await pool.query('CREATE EXTENSION IF NOT EXISTS vector;');
  console.log('Postgres extensions ready: uuid-ossp, vector');
}

prepare()
  .catch((error) => {
    console.error('Failed preparing database extensions:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
