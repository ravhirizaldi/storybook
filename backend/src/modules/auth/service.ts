import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { db } from '../../db/index.js';
import { users } from '../../db/schema.js';
import { AppError } from '../../utils/errors.js';

export async function loginWithPassword(
  fastify: FastifyInstance,
  username: string,
  password: string,
) {
  const user = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (!user[0]) {
    throw new AppError('Invalid credentials', 401);
  }

  const ok = await bcrypt.compare(password, user[0].passwordHash);
  if (!ok) {
    throw new AppError('Invalid credentials', 401);
  }

  const token = await fastify.jwt.sign({
    sub: user[0].id,
    username: user[0].username,
  });

  return {
    token,
    user: {
      id: user[0].id,
      username: user[0].username,
      isAdmin: user[0].username === 'admin',
    },
  };
}

export async function findUserById(userId: string) {
  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return user[0] ?? null;
}
