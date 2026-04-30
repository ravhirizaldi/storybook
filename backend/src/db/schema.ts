import { relations } from 'drizzle-orm';
import {
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  vector,
} from 'drizzle-orm/pg-core';

export const EMBEDDING_DIMENSION = Number(process.env.EMBEDDING_DIMENSION ?? 1536);

export const projectStatusEnum = pgEnum('project_status', [
  'draft',
  'outlining',
  'ready',
  'generating',
  'failed',
]);

export const chapterStatusEnum = pgEnum('chapter_status', [
  'pending',
  'queued',
  'generating',
  'completed',
  'failed',
]);

export const memoryTypeEnum = pgEnum('memory_type', [
  'story_bible',
  'plot',
  'character',
  'world',
  'chapter_summary',
  'emotional_state',
  'user_note',
]);

export const jobTypeEnum = pgEnum('generation_job_type', [
  'generate_outline',
  'generate_chapter',
  'continue_chapter',
  'regenerate_chapter',
  'summarize_chapter',
  'extract_characters',
  'refresh_memory',
]);

export const jobStatusEnum = pgEnum('generation_job_status', [
  'queued',
  'running',
  'completed',
  'failed',
]);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  masterPrompt: text('master_prompt').notNull(),
  outputLanguage: text('output_language').notNull(),
  genre: text('genre').notNull(),
  tone: text('tone').notNull(),
  pacing: text('pacing').notNull(),
  temperature: doublePrecision('temperature').notNull().default(0.85),
  status: projectStatusEnum('status').notNull().default('draft'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const storyBibles = pgTable('story_bibles', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  contentJson: jsonb('content_json').notNull(),
  summary: text('summary').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const parts = pgTable('parts', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const chapters = pgTable('chapters', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  partId: uuid('part_id').references(() => parts.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  summary: text('summary').notNull().default(''),
  content: text('content').notNull().default(''),
  status: chapterStatusEnum('status').notNull().default('pending'),
  sortOrder: integer('sort_order').notNull().default(0),
  wordCount: integer('word_count').notNull().default(0),
  charCount: integer('char_count').notNull().default(0),
  arcsJson: jsonb('arcs_json').notNull().default([]),
  generationPromptSnapshot: text('generation_prompt_snapshot').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const characters = pgTable('characters', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  role: text('role').notNull().default(''),
  description: text('description').notNull().default(''),
  traitsJson: jsonb('traits_json').notNull().default([]),
  goalsJson: jsonb('goals_json').notNull().default([]),
  relationshipsJson: jsonb('relationships_json').notNull().default({}),
  emotionalState: text('emotional_state').notNull().default(''),
  currentArc: text('current_arc').notNull().default(''),
  knownFactsJson: jsonb('known_facts_json').notNull().default([]),
  firstAppearedChapterId: uuid('first_appeared_chapter_id').references(() => chapters.id, {
    onDelete: 'set null',
  }),
  lastSeenChapterId: uuid('last_seen_chapter_id').references(() => chapters.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const memories = pgTable(
  'memories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    chapterId: uuid('chapter_id').references(() => chapters.id, { onDelete: 'set null' }),
    characterId: uuid('character_id').references(() => characters.id, { onDelete: 'set null' }),
    type: memoryTypeEnum('type').notNull(),
    title: text('title').notNull(),
    content: text('content').notNull(),
    importance: integer('importance').notNull().default(5),
    embedding: vector('embedding', { dimensions: EMBEDDING_DIMENSION }),
    metadataJson: jsonb('metadata_json').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    embeddingIdx: index('memories_embedding_idx').using(
      'hnsw',
      table.embedding.op('vector_cosine_ops'),
    ),
  }),
);

export const generationJobs = pgTable('generation_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  chapterId: uuid('chapter_id').references(() => chapters.id, { onDelete: 'set null' }),
  type: jobTypeEnum('type').notNull(),
  status: jobStatusEnum('status').notNull().default('queued'),
  inputJson: jsonb('input_json').notNull().default({}),
  outputJson: jsonb('output_json').notNull().default({}),
  error: text('error').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const aiRuntimeSettings = pgTable('ai_runtime_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().default('default').unique(),
  apiKey: text('api_key').notNull().default(''),
  baseUrl: text('base_url').notNull().default('https://api.openai.com/v1'),
  model: text('model').notNull().default('gpt-4.1-mini'),
  embeddingModel: text('embedding_model').notNull().default('text-embedding-3-small'),
  embeddingApiKey: text('embedding_api_key').notNull().default(''),
  embeddingBaseUrl: text('embedding_base_url').notNull().default('https://api.openai.com/v1'),
  temperature: doublePrecision('temperature').notNull().default(0.85),
  topP: doublePrecision('top_p').notNull().default(0.95),
  maxTokens: integer('max_tokens').notNull().default(4000),
  contextMaxChars: integer('context_max_chars').notNull().default(24000),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const projectRelations = relations(projects, ({ one, many }) => ({
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  bible: many(storyBibles),
  parts: many(parts),
  chapters: many(chapters),
  characters: many(characters),
  memories: many(memories),
  jobs: many(generationJobs),
}));
