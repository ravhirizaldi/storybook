# Story AI Backend

Fastify + TypeScript backend for AI storytelling platform.

## Stack

- Fastify
- Drizzle ORM + PostgreSQL + pgvector
- Redis + BullMQ workers
- JWT auth + bcrypt
- OpenAI SDK-compatible AI client

## Setup

1. Copy env file:

```bash
cp .env.example .env
```

2. Start infra:

```bash
docker compose up -d
```

3. Install deps from monorepo root:

```bash
pnpm install
```

4. Prepare schema:

```bash
pnpm --filter backend db:migrate
```

5. Seed admin:

```bash
pnpm --filter backend seed
```

6. Run API:

```bash
pnpm --filter backend dev
```

7. Run worker:

```bash
pnpm --filter backend worker
```

## Default Login

- username: `admin`
- password: `admin123`

## Scripts

- `pnpm --filter backend dev`
- `pnpm --filter backend build`
- `pnpm --filter backend lint`
- `pnpm --filter backend format`
- `pnpm --filter backend db:generate`
- `pnpm --filter backend db:migrate`
- `pnpm --filter backend db:studio`
- `pnpm --filter backend worker`
- `pnpm --filter backend seed`

## AI Provider Switching

Provider swap only needs env changes:

- `AI_BASE_URL`
- `AI_API_KEY`
- `AI_MODEL`

Optional tuning:

- `AI_EMBEDDING_MODEL`
- `AI_TEMPERATURE`
- `AI_TOP_P`
- `AI_MAX_TOKENS`
- `AI_CONTEXT_MAX_CHARS`

## API Surface

- Auth: `/auth/login`, `/auth/me`
- Projects CRUD + generation triggers
- Parts list
- Chapters read/update + generate/regenerate/continue/summarize
- Characters read/update
- Memories list/create/delete/search
- Jobs list/get
- Admin runtime AI settings:
  - `GET /admin/ai-settings`
  - `PATCH /admin/ai-settings`
  - admin user only
