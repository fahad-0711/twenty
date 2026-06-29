# CLAUDE.md — CallLive AI CRM
## Claude Code Agent Memory File

> This file is loaded at the start of every Claude Code session.
> Keep it SHORT. Only include what Claude can't infer from reading the code.

---

## PROJECT IDENTITY
- **Repo**: CallLive AI CRM (forked from Twenty CRM)
- **Stack**: NestJS + TypeORM + PostgreSQL + Apollo GraphQL (backend) / React 18 + Recoil + Apollo Client (frontend)
- **Monorepo**: Yarn workspaces (`packages/twenty-front`, `packages/twenty-server`, `packages/twenty-shared`)

## CRITICAL COMMANDS
```bash
# Start development
docker compose up -d postgres redis
yarn workspace twenty-server start:dev
yarn workspace twenty-front start

# Database
yarn workspace twenty-server migration:generate src/database/migrations/<MigrationName>
yarn workspace twenty-server migration:run
yarn workspace twenty-server migration:revert  # Only with user confirmation

# Tests
yarn workspace twenty-server test                    # Unit tests
yarn workspace twenty-server test:e2e                # E2E tests
yarn workspace twenty-front typecheck                # TypeScript check

# Lint
yarn workspace twenty-server lint
yarn workspace twenty-front lint
```

## NON-NEGOTIABLE RULES (read .cursorrules for full rules)
1. SEARCH THE CODEBASE before writing any new code
2. NEVER run `schema:sync` — only `migration:generate` + `migration:run`
3. NO `any` types — TypeScript strict mode is enforced
4. ONE feature per session — commit before next step
5. Webhook payloads: Zod validation + HMAC verification always
6. New entities: always soft-delete via `@DeleteDateColumn() deletedAt`

## ARCHITECTURE CONTEXT
See @SPEC.md for what we're building.
See @PLAN.md for the current phase and task.
See @.cursorrules for full coding guardrails.
See @docs/architecture-audit.md for codebase analysis (created in Phase 1).

## CURRENT STATUS
```
Phase: [AGENT: update this field when you complete a phase]
Current step: [AGENT: update this field when you start a step]
Last commit: [AGENT: paste last git commit hash]
Pending migrations: [AGENT: list any migrations generated but not yet run]
```

## CALLLIVE.AI INTEGRATION
- Webhook endpoint: `POST /api/webhooks/calllive/events`
- Signature header: `X-CallLive-Signature: sha256=<hmac>`
- Event ID header: `X-CallLive-Event-ID: <uuid>` (idempotency key)
- Secret env var: `CALLLIVE_WEBHOOK_SECRET`
- n8n instance: `flow.calllive.in`

## KNOWN GOTCHAS
- Twenty's GraphQL schema is auto-generated from metadata — adding raw TypeORM entities does NOT automatically add them to the GraphQL schema. You must create a NestJS module + resolver.
- BullMQ requires Redis. Check `REDIS_URL` env var is set before testing queue jobs.
- Twenty uses Recoil for state — do NOT introduce React Query, Zustand, or Redux.
- Frontend imports: always use path aliases (`@/modules/...`), never relative (`../../`).
- When reading TypeORM relations: always check if the related entity is imported correctly to avoid circular dependency issues.
