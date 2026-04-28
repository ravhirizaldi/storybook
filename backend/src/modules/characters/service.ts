import { and, asc, eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { chapters, characters, projects } from '../../db/schema.js';
import { AppError } from '../../utils/errors.js';

export async function listProjectCharacters(projectId: string) {
  return db
    .select()
    .from(characters)
    .where(eq(characters.projectId, projectId))
    .orderBy(asc(characters.name));
}

export async function getCharacterOwned(characterId: string, userId: string) {
  const row = await db
    .select({
      character: characters,
      userId: projects.userId,
    })
    .from(characters)
    .innerJoin(projects, eq(characters.projectId, projects.id))
    .where(eq(characters.id, characterId))
    .limit(1);
  if (!row[0] || row[0].userId !== userId) throw new AppError('Character not found', 404);
  return row[0].character;
}

export async function getCharacter(characterId: string, userId: string) {
  return getCharacterOwned(characterId, userId);
}

export async function updateCharacter(
  characterId: string,
  userId: string,
  patch: Partial<{
    name: string;
    role: string;
    description: string;
    traitsJson: unknown[];
    goalsJson: unknown[];
    relationshipsJson: Record<string, unknown>;
    emotionalState: string;
    currentArc: string;
    knownFactsJson: unknown[];
    firstAppearedChapterId: string | null;
    lastSeenChapterId: string | null;
  }>,
) {
  const existing = await getCharacterOwned(characterId, userId);
  const [row] = await db
    .update(characters)
    .set(patch)
    .where(and(eq(characters.id, existing.id), eq(characters.projectId, existing.projectId)))
    .returning();
  return row;
}

export async function upsertCharacterFromModel(input: {
  projectId: string;
  chapterId?: string | null;
  name: string;
  role: string;
  description: string;
  traits: string[];
  goals: string[];
  relationships: Record<string, unknown>;
  emotionalState: string;
  currentArc: string;
  knownFacts: string[];
}) {
  const existing = await db
    .select()
    .from(characters)
    .where(and(eq(characters.projectId, input.projectId), eq(characters.name, input.name)))
    .limit(1);

  if (existing[0]) {
    const [updated] = await db
      .update(characters)
      .set({
        role: input.role,
        description: input.description,
        traitsJson: input.traits,
        goalsJson: input.goals,
        relationshipsJson: input.relationships,
        emotionalState: input.emotionalState,
        currentArc: input.currentArc,
        knownFactsJson: input.knownFacts,
        lastSeenChapterId: input.chapterId ?? existing[0].lastSeenChapterId,
      })
      .where(eq(characters.id, existing[0].id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(characters)
    .values({
      projectId: input.projectId,
      name: input.name,
      role: input.role,
      description: input.description,
      traitsJson: input.traits,
      goalsJson: input.goals,
      relationshipsJson: input.relationships,
      emotionalState: input.emotionalState,
      currentArc: input.currentArc,
      knownFactsJson: input.knownFacts,
      firstAppearedChapterId: input.chapterId ?? null,
      lastSeenChapterId: input.chapterId ?? null,
    })
    .returning();
  return created;
}

export async function listCharactersByNames(projectId: string, names: string[]) {
  if (names.length === 0) return [];
  return db
    .select()
    .from(characters)
    .where(and(eq(characters.projectId, projectId), eq(characters.name, names[0])));
}

export async function getChapterById(chapterId: string) {
  const row = await db.select().from(chapters).where(eq(chapters.id, chapterId)).limit(1);
  return row[0] ?? null;
}
