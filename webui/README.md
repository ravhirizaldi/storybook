# Story AI WebUI

React + Vite 3 writing interface for Story AI backend.

## Stack

- React + TypeScript
- Vite 3
- Tailwind CSS
- React Router
- TanStack Query
- Zustand
- Lucide icons

## Setup

1. Copy env file:

```bash
cp .env.example .env
```

2. Install deps from monorepo root:

```bash
pnpm install
```

3. Run frontend:

```bash
pnpm --filter webui dev
```

Default API URL:

`VITE_API_BASE_URL=http://localhost:4000`

## Scripts

- `pnpm --filter webui dev`
- `pnpm --filter webui build`
- `pnpm --filter webui lint`
- `pnpm --filter webui format`
- `pnpm --filter webui preview`

## Main Views

- Login
- Dashboard
- Dashboard includes admin-only live AI settings editor
- Create Project
- Story Project workspace (chapter tree + editor + context panel)
- Characters
- Memories with filters and semantic search
