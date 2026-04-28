import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db, pool } from './index.js';
import { users } from './schema.js';

async function seedAdmin() {
  const username = 'admin';
  const password = 'admin123';
  const existing = await db.select().from(users).where(eq(users.username, username)).limit(1);

  if (existing.length > 0) {
    console.log('Admin user already exists.');
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await db.insert(users).values({
    username,
    passwordHash,
  });
  console.log('Seeded admin user: admin / admin123');
}

seedAdmin()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
