import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { characters, memories, projects, type memoryTypeEnum } from '../../db/schema.js';
import { embedTexts } from '../ai/client.js';
import { AppError } from '../../utils/errors.js';

export type MemoryType = (typeof memoryTypeEnum.enumValues)[number];

export async function listProjectMemories(
  projectId: string,
  userId: string,
  filters?: {
    type?: MemoryType;
    characterId?: string;
    chapterId?: string;
  },
) {
  const project = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1);
  if (!project[0]) throw new AppError('Project not found', 404);

  const clauses = [eq(memories.projectId, projectId)];
  if (filters?.type) clauses.push(eq(memories.type, filters.type));
  if (filters?.characterId) clauses.push(eq(memories.characterId, filters.characterId));
  if (filters?.chapterId) clauses.push(eq(memories.chapterId, filters.chapterId));

  return db
    .select()
    .from(memories)
    .where(and(...clauses))
    .orderBy(desc(memories.createdAt));
}

export async function createMemory(input: {
  projectId: string;
  chapterId?: string | null;
  characterId?: string | null;
  type: MemoryType;
  title: string;
  content: string;
  importance: number;
  metadataJson?: Record<string, unknown>;
}) {
  const [embedding] = await embedTexts([`${input.title}\n${input.content}`]);

  const [row] = await db
    .insert(memories)
    .values({
      projectId: input.projectId,
      chapterId: input.chapterId ?? null,
      characterId: input.characterId ?? null,
      type: input.type,
      title: input.title,
      content: input.content,
      importance: input.importance,
      embedding,
      metadataJson: input.metadataJson ?? {},
    })
    .returning();
  return row;
}

export async function deleteMemory(memoryId: string, userId: string) {
  const row = await db
    .select({
      memoryId: memories.id,
      userId: projects.userId,
      projectId: memories.projectId,
      chapterId: memories.chapterId,
    })
    .from(memories)
    .innerJoin(projects, eq(memories.projectId, projects.id))
    .where(eq(memories.id, memoryId))
    .limit(1);
  if (!row[0] || row[0].userId !== userId) throw new AppError('Memory not found', 404);
  await db.delete(memories).where(eq(memories.id, memoryId));
  return {
    projectId: row[0].projectId,
    chapterId: row[0].chapterId,
  };
}

function vectorLiteral(values: number[]): string {
  const normalized = values
    .map((value) => (Number.isFinite(value) ? Number(value) : 0))
    .map((value) => value.toFixed(8));
  return `[${normalized.join(',')}]`;
}

export async function semanticSearchMemories(input: {
  projectId: string;
  userId: string;
  query: string;
  limit?: number;
  type?: MemoryType;
}) {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, input.projectId), eq(projects.userId, input.userId)))
    .limit(1);
  if (!project) throw new AppError('Project not found', 404);

  const [embedding] = await embedTexts([input.query]);
  const literal = vectorLiteral(embedding);
  const limit = Math.min(Math.max(input.limit ?? 12, 1), 50);

  const typeSql = input.type ? sql`AND m.type = ${input.type}` : sql``;
  const rows = await db.execute(sql`
    SELECT
      m.*,
      1 - (m.embedding <=> ${sql.raw(`'${literal}'::vector`)}) AS similarity
    FROM memories m
    WHERE m.project_id = ${input.projectId}
      AND m.embedding IS NOT NULL
      ${typeSql}
    ORDER BY m.embedding <=> ${sql.raw(`'${literal}'::vector`)}, m.importance DESC, m.created_at ASC
    LIMIT ${limit}
  `);
  return rows.rows;
}

export async function resolveCharacterIdByName(projectId: string, name: string) {
  const row = await db
    .select({ id: characters.id })
    .from(characters)
    .where(and(eq(characters.projectId, projectId), eq(characters.name, name)))
    .limit(1);
  return row[0]?.id ?? null;
}

export async function listMemoriesForContext(projectId: string, limit = 40) {
  return db
    .select()
    .from(memories)
    .where(eq(memories.projectId, projectId))
    .orderBy(desc(memories.importance), asc(memories.createdAt))
    .limit(limit);
}
