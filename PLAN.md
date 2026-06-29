# PLAN.md — CallLive AI CRM
## Phased Vibe Coding Execution Plan
### For AI Coding Agent Consumption

> **HOW TO USE THIS FILE**
> Each phase is an isolated, completable unit. Instruct your AI agent:
> _"Read PLAN.md and SPEC.md, then execute only Phase X. Do not proceed to Phase X+1."_
> Every phase ends with a verification checklist. Do not mark a phase done until all checks pass.

---

## PHASE 0 — Environment & Fork Setup
**Estimated Time**: 30–45 mins | **Context Risk**: Low | **DB Changes**: None

### Objective
Get Twenty CRM running locally as a Docker stack, fully forked and namespaced for CallLive AI.

### Step-by-Step Tasks

**0.1 Fork & Clone**
```bash
# Fork https://github.com/twentyhq/twenty on GitHub first
git clone git@github.com:<your-org>/twenty.git calllive-crm
cd calllive-crm
git remote add upstream https://github.com/twentyhq/twenty.git
git checkout -b feat/calllive-base
```

**0.2 Environment Configuration**
```bash
cp packages/twenty-server/.env.example packages/twenty-server/.env
cp packages/twenty-front/.env.example packages/twenty-front/.env
```

Edit `packages/twenty-server/.env`:
```env
# Core
NODE_ENV=development
PORT=3000
FRONT_BASE_URL=http://localhost:3001

# Database
PG_DATABASE_URL=postgresql://twenty:twenty@localhost:5432/calllive_crm

# Auth
ACCESS_TOKEN_SECRET=<generate-with-openssl-rand-hex-32>
REFRESH_TOKEN_SECRET=<generate-with-openssl-rand-hex-32>
LOGIN_TOKEN_SECRET=<generate-with-openssl-rand-hex-32>

# Redis
REDIS_URL=redis://localhost:6379

# CallLive.ai Integration (add these — they don't exist in default .env)
CALLLIVE_WEBHOOK_SECRET=<your-webhook-signing-secret>
CALLLIVE_API_BASE_URL=https://api.calllive.ai
```

**0.3 Start Docker Stack**
```bash
docker compose up -d postgres redis
yarn install
yarn workspace twenty-server migration:run
yarn workspace twenty-server start:dev &
yarn workspace twenty-front start &
```

**0.4 Verify Twenty Runs**
- Open http://localhost:3001
- Create admin account
- Confirm Company, Person, Opportunity objects exist

**0.5 Drop In Context Files**
```bash
# Place in project root (already created)
cp .cursorrules calllive-crm/
cp SPEC.md calllive-crm/
cp PLAN.md calllive-crm/
```

**0.6 Create CLAUDE.md** (for Claude Code users)
```bash
# In project root
cat > CLAUDE.md << 'EOF'
# CallLive AI CRM — Claude Code Instructions

See .cursorrules for full agent rules.
See SPEC.md for what we're building.
See PLAN.md for current phase.

## Quick Commands
- Start server: yarn workspace twenty-server start:dev
- Start frontend: yarn workspace twenty-front start
- Run migrations: yarn workspace twenty-server migration:run
- Generate migration: yarn workspace twenty-server migration:generate src/database/migrations/<Name>
- Run tests: yarn workspace twenty-server test

## Current Focus
Phase: [UPDATE THIS AS YOU PROGRESS]
Last completed task: [UPDATE THIS]
EOF
```

### ✅ Phase 0 Verification Checklist
- [ ] `http://localhost:3001` loads Twenty CRM UI
- [ ] `http://localhost:3000/graphql` shows Apollo sandbox
- [ ] Docker containers: postgres, redis are `Up`
- [ ] `.cursorrules`, `SPEC.md`, `PLAN.md`, `CLAUDE.md` all exist in project root
- [ ] Environment variables for `CALLLIVE_WEBHOOK_SECRET` are set

---

## PHASE 1 — Architecture Audit (Read-Only)
**Estimated Time**: 1–2 hours | **Context Risk**: Medium | **DB Changes**: None

> ⚠️ **NO CODE WRITTEN IN THIS PHASE.** This phase is research only. Instruct your agent to use Plan Mode (Cursor) or `--plan` mode.

### Objective
Understand Twenty's codebase well enough to extend it safely. Build a map before
you start building.

### Agent Prompt for This Phase
```
Enter plan mode. Do NOT write any code or make any file changes.

Read the following files/directories and answer these questions:

1. Read packages/twenty-server/src/modules/person/ end-to-end.
   - What is the module structure?
   - How does the resolver connect to the service?
   - How does the service use TypeORM repositories?

2. Read packages/twenty-server/src/engine/metadata-modules/object-metadata/
   - How does Twenty create custom objects dynamically?
   - Could we add our real estate fields here instead of creating new TypeORM entities?
   - What are the trade-offs?

3. Read packages/twenty-front/src/modules/object-record/
   - How does Twenty render a generic record page?
   - Where would we add a new tab (e.g., "Voice History")?

4. Read packages/twenty-server/src/engine/api/graphql/
   - How is the GraphQL schema generated?
   - How do we add a new Query/Mutation?

5. Search for any existing webhook handling: grep -r "webhook" packages/twenty-server/src --include="*.ts" -l

Produce a written architecture summary document saved to: docs/architecture-audit.md
```

### Key Questions to Answer Before Phase 2
1. Does Twenty have a built-in webhook receiver we can extend, or do we build from scratch?
2. Does BullMQ (or any queue) already exist in the codebase?
3. What is the correct NestJS module to add our webhook controller to?
4. Can we use Twenty's metadata API for `RealEstateProject` or do we need a raw TypeORM entity?

### ✅ Phase 1 Verification Checklist
- [ ] `docs/architecture-audit.md` exists with answers to all 4 questions above
- [ ] You can explain Twenty's module pattern without looking at code
- [ ] You know exactly which files to modify for Phase 2
- [ ] NO new files, NO migrations, NO code changes were made

---

## PHASE 2 — Database Schema & TypeORM Entities
**Estimated Time**: 3–4 hours | **Context Risk**: Medium | **DB Changes**: YES**

### Objective
Create all new TypeORM entities from SPEC.md and generate/run their migrations.
**One entity at a time. One migration per entity.**

### Step 2.1 — Metadata Extensions on Existing Objects (use Metadata API)
**Agent prompt**:
```
Read SPEC.md Section 2 (Existing Twenty Objects).
Using Twenty's metadata API (POST to /api/metadata via fetch or the Twenty UI),
add the following custom fields. Do NOT create TypeORM entities for these.

On Company object, add:
- gst_number (TEXT, nullable)
- rera_developer_number (TEXT, nullable)
- company_type (SELECT with options: DEVELOPER, CHANNEL_PARTNER, BROKERAGE, OTHER)

On Person object, add:
- pan_number (TEXT, nullable)
- role (SELECT with options: LEAD, BROKER, AGENT, DEVELOPER_SALES)
- source_channel (TEXT, nullable)

Show me the GraphQL mutations to create these fields, then execute them against
http://localhost:3000/api/metadata
```

### Step 2.2 — Create `WebhookEvent` Entity First (no relations, simpler)
**Agent prompt**:
```
Read .cursorrules Rule 5 for the module structure pattern.
Read packages/twenty-server/src/modules/person/ as your template.
Read SPEC.md Section 3.5 for the WebhookEvent entity spec.

Create the WebhookEvent TypeORM entity ONLY. Do not create the module, resolver,
or service yet. Steps:
1. Create the entity file: packages/twenty-server/src/modules/webhook-event/webhook-event.entity.ts
2. Register it in the AppModule's TypeORM entities array
3. Generate a migration: yarn workspace twenty-server migration:generate src/database/migrations/AddWebhookEvent
4. Show me the generated migration file for review before running it
```

### Step 2.3 — Create `VoiceJourney` Entity (has relations)
**Agent prompt**:
```
Read packages/twenty-server/src/modules/webhook-event/webhook-event.entity.ts (just created).
Read SPEC.md Section 3.4 for VoiceJourney spec.

Create VoiceJourney entity with ALL columns from the spec.
For relations to Person and Opportunity, use nullable: true ManyToOne with the
existing Twenty entity classes. Check what the import paths are for Person and
Opportunity entities in the existing codebase before writing the import statements.

After creating the entity:
1. Register in AppModule
2. Generate migration: AddVoiceJourney
3. Show migration for review
```

### Step 2.4 — Create `RealEstateProject` + `ProjectUnit` Entities
**Agent prompt**:
```
Read SPEC.md Sections 3.1 and 3.2.
Create RealEstateProject entity. Then create ProjectUnit entity that has a
ManyToOne relation to RealEstateProject. Create both in sequence, one migration each.
```

### Step 2.5 — Create `SiteVisit` Entity
**Agent prompt**:
```
Read SPEC.md Section 3.3. Create SiteVisit entity with all relations.
This entity links Person, RealEstateProject, ProjectUnit, and VoiceJourney.
Verify all FK references exist in the DB before generating the migration.
```

### Step 2.6 — Run All Migrations
```bash
yarn workspace twenty-server migration:run
```

### ✅ Phase 2 Verification Checklist
- [ ] `SELECT tablename FROM pg_tables WHERE schemaname='public'` shows: `webhook_event`, `voice_journey`, `real_estate_project`, `project_unit`, `site_visit`
- [ ] All custom metadata fields appear in Twenty UI for Company and Person
- [ ] `yarn workspace twenty-server start:dev` starts without TypeORM errors
- [ ] All migration files are committed to git
- [ ] Zero `any` types in new entity files (check with `tsc --noEmit`)

---

## PHASE 3 — Backend API Layer (Webhooks + GraphQL)
**Estimated Time**: 4–5 hours | **Context Risk**: High | **DB Changes**: Minor**

> ⚠️ This is the most complex phase. Do it in sub-steps. Never run more than one sub-step per agent session.

### Objective
Build the webhook ingestion system and GraphQL CRUD API for new entities.

### Step 3.1 — Webhook Controller Module
**Agent prompt**:
```
Read .cursorrules for webhook security rules (Rule 6).
Read packages/twenty-server/src/engine/api/ to understand how Twenty handles HTTP routes.
Read SPEC.md Section 4 for the full webhook spec.

Create a new NestJS module: packages/twenty-server/src/modules/calllive-webhook/
Structure:
- calllive-webhook.module.ts
- calllive-webhook.controller.ts  (POST /api/webhooks/calllive/events)
- calllive-webhook.service.ts
- calllive-webhook.validator.ts   (HMAC-SHA256 verification)
- dtos/calllive-payload.dto.ts    (Zod schema for the payload)

The controller must:
1. Read raw body (needed for HMAC) — use rawBody: true in NestJS config
2. Verify X-CallLive-Signature header
3. Store raw payload in WebhookEvent table immediately
4. Return { received: true } within 2 seconds
5. Enqueue a BullMQ job for async processing

Do NOT implement the job processing logic yet — just enqueue with the event_id.
Check if BullMQ/Bull is already in package.json before adding it.
```

### Step 3.2 — BullMQ Job Processor
**Agent prompt**:
```
Read the calllive-webhook module just created.
Read SPEC.md Section 4.2 (Supported Event Types) and 4.4 (Contact Matching Logic).

Create the BullMQ job processor: calllive-webhook.processor.ts
It must handle these event types (each as a separate private method):
- handleCallInitiated(): create VoiceJourney, attempt contact match by phone
- handleCallCompleted(): update VoiceJourney status + duration + recording_url
- handleTranscriptReady(): store transcript_raw on VoiceJourney
- handleSentimentAnalyzed(): store all AI analysis fields, call auto-task creator

Create a separate AutoTaskCreatorService that implements SPEC.md Section 4.5 auto-task rules.
The auto-task must create a Twenty native Task entity — find how Task is created in the
existing codebase and follow the same pattern.
```

### Step 3.3 — GraphQL API for VoiceJourney
**Agent prompt**:
```
Read packages/twenty-server/src/modules/person/ resolver and service as template.
Read SPEC.md Section 3.4 for VoiceJourney fields.

Create the VoiceJourney NestJS module with:
- voiceJourneys query: paginated list with filters (contactId, projectId, status, dateRange)
- voiceJourney query: single record by ID
- updateVoiceJourney mutation: only allow updating is_reviewed, reviewed_by fields

Do NOT create create/delete mutations — VoiceJourney records are only created by webhooks.
```

### Step 3.4 — GraphQL API for Real Estate Objects
**Agent prompt**:
```
Create NestJS modules for RealEstateProject, ProjectUnit, and SiteVisit.
Each needs full CRUD GraphQL (createOne, findOne, findMany, updateOne).
SiteVisit also needs a scheduleVisit mutation that accepts
{ leadId, projectId, unitId?, scheduledAt } and links to the originating VoiceJourney if provided.
```

### ✅ Phase 3 Verification Checklist
- [ ] `curl -X POST http://localhost:3000/api/webhooks/calllive/events -H "Content-Type: application/json" -d '{"event_id":"test-123", "event_type":"call.initiated", ...}'` returns `{ "received": true }` within 1 second
- [ ] WebhookEvent record appears in DB after the curl
- [ ] VoiceJourney record is created by the job processor
- [ ] Apollo sandbox at `:3000/graphql` shows `voiceJourneys`, `realEstateProjects`, `siteVisits` queries
- [ ] HMAC verification rejects requests with wrong signature (HTTP 401)
- [ ] `yarn workspace twenty-server test` passes all tests

---

## PHASE 4 — Frontend UI Components
**Estimated Time**: 4–5 hours | **Context Risk**: Medium | **DB Changes**: None**

### Objective
Build the UI components that make this a voice-first CRM experience.

### Step 4.1 — Voice Journey Timeline Tab on Person Record
**Agent prompt**:
```
Read packages/twenty-front/src/modules/object-record/ to understand how Twenty renders
record show pages and adds tabs.
Read SPEC.md Section 5.1 for the Voice History tab requirements.

Find where existing tabs are added to a Person record page (search for "TimelineTab" or
similar in the codebase). Follow the same pattern to add a "Voice History" tab.

Create components:
- packages/twenty-front/src/modules/voice-journey/components/VoiceJourneyTimeline.tsx
  (list of VoiceJourney records for a contact — uses useQuery hook to fetch by contactId)
- packages/twenty-front/src/modules/voice-journey/components/VoiceJourneyCard.tsx
  (individual call card: direction icon, duration, status badge, sentiment chip, expand button)

Use Twenty's existing design system components. Search for how Badge, Chip, and Avatar
are used in existing components.
```

### Step 4.2 — Transcript Viewer Component
**Agent prompt**:
```
Read VoiceJourneyCard.tsx just created.
Read SPEC.md Section 5.2 for transcript viewer requirements.

Create: packages/twenty-front/src/modules/voice-journey/components/TranscriptViewer.tsx

It receives: transcript_raw (TranscriptSegment[]), sentiment_score, recording_url.
Renders conversation-style: AI agent messages on left (navy background), Human on right
(lighter background). Each bubble shows speaker + timestamp_ms formatted as MM:SS.
At the top: a sentiment banner (green if > 0.3, yellow if -0.3 to 0.3, red if < -0.3).
If recording_url exists, show a native <audio> player at the top.
```

### Step 4.3 — Real Estate Project Pages
**Agent prompt**:
```
Read SPEC.md Section 5.3.
Find how Twenty renders custom object list and detail pages in packages/twenty-front.

Create:
- A Projects list page route with search + filter by city/status
- A Project detail page showing project info + units kanban
  (columns: Available | Blocked | Booked | Registered)
- A Unit detail panel (slide-over or modal) showing site visits and linked voice journeys

Use Recoil for any local UI state (modal open/close, selected unit).
```

### Step 4.4 — Voice KPI Dashboard Widget
**Agent prompt**:
```
Read SPEC.md Section 5.4 for dashboard KPI requirements.
Find how Twenty's existing dashboard/homepage widgets are built. Copy the pattern.

Create a VoiceDashboardWidget component that shows:
- Calls today count (inbound vs outbound) as stat cards
- 7-day sentiment trend as a simple line chart (use recharts if already in package.json)
- Intent breakdown as a donut chart

The widget fetches data via a new GraphQL query: voiceJourneyStats(dateRange: DateRangeInput)
Create this resolver in the VoiceJourney module backend first.
```

### ✅ Phase 4 Verification Checklist
- [ ] Person record page in UI shows "Voice History" tab
- [ ] Voice History tab shows call cards for linked VoiceJourneys
- [ ] Clicking a call card opens TranscriptViewer with formatted conversation
- [ ] Sentiment banner colors are correct (green/yellow/red)
- [ ] Projects page lists with working filters
- [ ] Unit kanban renders correctly
- [ ] Dashboard shows voice stats widgets
- [ ] `yarn workspace twenty-front build` completes with zero TypeScript errors

---

## PHASE 5 — n8n Automations & Integration
**Estimated Time**: 2–3 hours | **Context Risk**: Low | **DB Changes**: None**

### Objective
Build n8n workflows that bridge CallLive.ai's events with CRM actions, and set up
outbound notifications.

### Workflow 5.1 — New Lead Alert to Team (Slack/Email)
Trigger: Webhook from CallLive CRM (when VoiceJourney.intent = BOOKING_INTENT)
Action: Post to team Slack channel with lead summary + sentiment + next action

n8n Setup:
1. Webhook node → receives Twenty's webhook (Twenty has outgoing webhooks)
2. IF node → checks intent_detected = 'BOOKING_INTENT'
3. Slack / Gmail node → sends formatted message to team

### Workflow 5.2 — Daily Voice Summary Report
Trigger: Cron (daily 9 AM IST)
Action:
1. HTTP Request → fetch yesterday's VoiceJourney stats from CRM GraphQL API
2. Gemini API node → generate natural language summary
3. Gmail node → send to manager email list

n8n GraphQL query to use:
```graphql
query DailySummary($date: DateTime!) {
  voiceJourneys(filter: { createdAt: { gte: $date } }) {
    edges {
      node { sentiment_score intent_detected status duration_seconds }
    }
  }
}
```

### Workflow 5.3 — Site Visit Reminder (WhatsApp / SMS — future)
Trigger: Cron (every 30 mins)
Action:
1. HTTP Request → fetch SiteVisits scheduled in next 2 hours
2. For each → send SMS/WhatsApp reminder to lead

### n8n Environment Variables
```env
# Add to n8n's environment
CALLLIVE_CRM_API_URL=https://crm.calllive.in/api
CALLLIVE_CRM_API_TOKEN=<service-account-token>
CALLLIVE_N8N_WEBHOOK_SECRET=<secret>
```

### ✅ Phase 5 Verification Checklist
- [ ] Triggering a test BOOKING_INTENT webhook → Slack notification received
- [ ] Daily summary workflow runs on cron and sends email
- [ ] All n8n credentials stored as n8n credentials (not hardcoded)
- [ ] n8n workflows exported as JSON and committed to `n8n-workflows/` folder in repo

---

## PHASE 6 — Production VPS Deployment
**Estimated Time**: 3–4 hours | **Context Risk**: Low | **DB Changes**: Run migrations on prod**

### Objective
Deploy the CRM to a production VPS with SSL, Docker, and proper monitoring.

### Step 6.1 — Production Docker Compose
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  twenty-server:
    build: ./packages/twenty-server
    restart: always
    env_file: .env.production
    depends_on: [postgres, redis]
    networks: [calllive-net]

  twenty-front:
    build: ./packages/twenty-front
    restart: always
    networks: [calllive-net]

  postgres:
    image: postgres:15-alpine
    restart: always
    volumes: [postgres_data:/var/lib/postgresql/data]
    networks: [calllive-net]

  redis:
    image: redis:7-alpine
    restart: always
    networks: [calllive-net]

  nginx:
    image: nginx:alpine
    restart: always
    ports: ["80:80", "443:443"]
    volumes:
      - ./nginx/crm.conf:/etc/nginx/conf.d/default.conf
      - ./certbot/conf:/etc/letsencrypt
    networks: [calllive-net]

volumes: { postgres_data: }
networks: { calllive-net: }
```

### Step 6.2 — Nginx Config
```nginx
# nginx/crm.conf
server {
    server_name crm.calllive.in;
    location /api { proxy_pass http://twenty-server:3000; }
    location / { proxy_pass http://twenty-front:3001; }
    # SSL via certbot
}
```

### Step 6.3 — Deployment Commands
```bash
# On VPS
git clone <your-repo> /opt/calllive-crm
cd /opt/calllive-crm
cp .env.example .env.production
# Fill in production values
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml exec twenty-server yarn migration:run
```

### Step 6.4 — SSL Certificate
```bash
docker run -it --rm \
  -v ./certbot/conf:/etc/letsencrypt \
  -v ./certbot/www:/var/www/certbot \
  certbot/certbot certonly --webroot \
  -w /var/www/certbot -d crm.calllive.in
```

### ✅ Phase 6 Verification Checklist
- [ ] `https://crm.calllive.in` loads with valid SSL
- [ ] `https://crm.calllive.in/api/health` returns `{ status: "ok" }`
- [ ] Database backups scheduled (pg_dump cron)
- [ ] All production secrets in `.env.production` (NOT in git — add to .gitignore)
- [ ] Twenty CRM UI fully functional in production
- [ ] A real CallLive.ai webhook fires and creates a VoiceJourney in production DB

---

## QUICK REFERENCE — Agent Session Prompts

Copy these exact prompts to start each phase:

```
# Start Phase 1
"Read PLAN.md phases 0 and 1. Phase 0 is complete. Enter plan mode and execute Phase 1 exactly as specified. Do not write any code. Save output to docs/architecture-audit.md."

# Start Phase 2, Step 2.2
"Read PLAN.md Phase 2 Step 2.2. Read .cursorrules Rule 5. Read packages/twenty-server/src/modules/person/ as your template. Now create ONLY the WebhookEvent entity as specified. Stop after generating the migration and show it to me."

# Start Phase 3, Step 3.1
"Read PLAN.md Phase 3 Step 3.1. Read .cursorrules Rule 6. Read SPEC.md Section 4. Create the calllive-webhook NestJS module. Do not proceed to Step 3.2."
```

## CONTEXT WINDOW MANAGEMENT RULES

Apply these rules in every agent session:

| Context Level | Action |
|---------------|--------|
| 0-50% | Work freely |
| 50-70% | Finish current sub-step and commit |
| 70-90% | Run /compact (Claude Code) or start new session |
| 90%+ | STOP — start fresh session, reload CLAUDE.md + PLAN.md |

**The #1 rule: One sub-step per session. Commit before moving on.**
