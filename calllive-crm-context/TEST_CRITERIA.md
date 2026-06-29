# TEST_CRITERIA.md — CallLive AI CRM
## Automated Acceptance Testing Protocol
### For AI Coding Agent Consumption

> **AGENT RULE**: A phase is NOT complete until every command in that phase's
> section produces the exact expected output documented here.
> Show the actual command output — do not assert success without evidence.

---

## HOW TO USE THIS FILE

At the end of each phase, run the corresponding section's verification script.
Copy the actual output into the session and compare against expected output.
If they differ: debug before marking the phase done.

**Environment setup for test scripts** (run once after Phase 0):
```bash
# Set these in your shell for test scripts
export CRM_URL="http://localhost:3000"
export CRM_FRONT_URL="http://localhost:3001"
export PG_URL="postgresql://twenty:twenty@localhost:5432/calllive_crm"
export WEBHOOK_SECRET="your-test-secret"  # Must match CALLLIVE_WEBHOOK_SECRET in .env

# Generate a valid test HMAC signature (run this helper):
generate_hmac() {
  local payload="$1"
  echo -n "$payload" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | awk '{print "sha256="$2}'
}
```

---

## PHASE 0 — Environment Setup

### Test 0.1: Docker Containers Are Healthy
```bash
docker compose ps --format "table {{.Name}}\t{{.Status}}"
```
**Expected output (all must show `Up`):**
```
NAME        STATUS
postgres    Up X hours (healthy)
redis       Up X hours (healthy)
```

### Test 0.2: Backend API Is Responding
```bash
curl -s $CRM_URL/healthz | jq .
```
**Expected output:**
```json
{ "status": "ok" }
```

### Test 0.3: Frontend Is Serving
```bash
curl -s -o /dev/null -w "%{http_code}" $CRM_FRONT_URL
```
**Expected output:** `200`

### Test 0.4: Context Files Are Present
```bash
for f in CLAUDE.md SPEC.md PLAN.md ARCHITECTURE.md TEST_CRITERIA.md .cursorrules \
          .claude/skills/typeorm-migrations/SKILL.md \
          .claude/skills/graphql-codegen/SKILL.md \
          .claude/skills/react-design-tokens/SKILL.md; do
  [ -f "$f" ] && echo "✅ $f" || echo "❌ MISSING: $f"
done
```
**Expected output:** All lines show `✅`

### Test 0.5: TypeScript Compiles (baseline)
```bash
yarn workspace twenty-server tsc --noEmit 2>&1 | tail -5
```
**Expected output:** No output (zero errors)

---

## PHASE 1 — Architecture Audit

### Test 1.1: Architecture Audit Document Exists
```bash
[ -f "docs/architecture-audit.md" ] && wc -l docs/architecture-audit.md
```
**Expected output:** `[N] docs/architecture-audit.md` where N > 50 lines

### Test 1.2: Audit Answers Required Questions
```bash
# Each of these keywords must appear in the audit document
for keyword in "metadata" "BullMQ" "workspace schema" "GraphQL" "TypeORM" "webhook"; do
  grep -qi "$keyword" docs/architecture-audit.md && \
    echo "✅ Found: $keyword" || echo "❌ MISSING: $keyword"
done
```
**Expected output:** All lines show `✅`

### Test 1.3: No Code Changed
```bash
git status --short | grep -v "^??" | grep -v "docs/"
```
**Expected output:** Empty (no tracked files modified outside docs/)

---

## PHASE 2 — Database Schema & Migrations

### Test 2.1: New Tables Exist in Workspace Schema
```bash
psql "$PG_URL" -c "\dt workspace_*.*" 2>/dev/null | \
  grep -E "calllive_(voice_journey|webhook_event|real_estate_project|project_unit|site_visit)"
```
**Expected output (5 rows):**
```
 workspace_xxx | calllive_voice_journey       | table | twenty
 workspace_xxx | calllive_webhook_event        | table | twenty
 workspace_xxx | calllive_real_estate_project  | table | twenty
 workspace_xxx | calllive_project_unit         | table | twenty
 workspace_xxx | calllive_site_visit           | table | twenty
```

### Test 2.2: VoiceJourney Schema Has Required Columns
```bash
psql "$PG_URL" -c "
  SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_name = 'calllive_voice_journey'
  ORDER BY ordinal_position;" 2>/dev/null | grep -E "call_id|direction|sentiment_score|transcript_raw|intent_detected"
```
**Expected output (minimum 5 matching lines):**
```
 call_id          | character varying | NO
 direction        | USER-DEFINED      | NO
 sentiment_score  | numeric           | YES
 transcript_raw   | jsonb             | YES
 intent_detected  | USER-DEFINED      | YES
```

### Test 2.3: Unique Constraint on call_id
```bash
psql "$PG_URL" -c "
  SELECT constraint_name, constraint_type
  FROM information_schema.table_constraints
  WHERE table_name = 'calllive_voice_journey'
    AND constraint_type = 'UNIQUE';" 2>/dev/null
```
**Expected output:** At least one row with `UNIQUE` constraint

### Test 2.4: WebhookEvent Has idempotency Constraint
```bash
psql "$PG_URL" -c "
  SELECT constraint_name
  FROM information_schema.table_constraints
  WHERE table_name = 'calllive_webhook_event'
    AND constraint_type = 'UNIQUE';" 2>/dev/null
```
**Expected output:** Row with unique constraint on event_id

### Test 2.5: All Custom Metadata Fields Are Present
```bash
# Query Twenty's metadata API for custom fields on Company object
curl -s -X POST "$CRM_URL/metadata" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "query": "{ objects { edges { node { nameSingular fields { edges { node { name } } } } } } }"
  }' | jq '.data.objects.edges[] | select(.node.nameSingular=="company") | .node.fields.edges[].node.name' | \
  grep -E "gstNumber|reraNumber|companyType"
```
**Expected output (3 fields):**
```
"gstNumber"
"reraNumber"
"companyType"
```

### Test 2.6: No TypeScript Errors After Schema Changes
```bash
yarn workspace twenty-server tsc --noEmit 2>&1 | grep -c "error TS"
```
**Expected output:** `0`

### Test 2.7: No `any` Types in New Entity Files
```bash
grep -r "any" packages/twenty-server/src/modules/{voice-journey,calllive-webhook,real-estate-project,project-unit,site-visit}/ \
  --include="*.ts" -l
```
**Expected output:** Empty (no files found)

---

## PHASE 3 — Backend API Layer

### Test 3.1: Webhook Endpoint Exists and Returns Correct Response
```bash
PAYLOAD='{"event_id":"test-001","event_type":"call.initiated","call_id":"call-abc","agent_id":"agent-1","timestamp":"2025-01-01T10:00:00Z","call":{"direction":"INBOUND","status":"INITIATED","from_number":"+919876543210","to_number":"+918888888888"}}'
SIG=$(generate_hmac "$PAYLOAD")

curl -s -X POST "$CRM_URL/api/webhooks/calllive/events" \
  -H "Content-Type: application/json" \
  -H "X-CallLive-Signature: $SIG" \
  -H "X-CallLive-Event-ID: test-001" \
  -d "$PAYLOAD"
```
**Expected output:**
```json
{"received": true}
```

### Test 3.2: Response Time Is Under 1 Second
```bash
PAYLOAD='{"event_id":"test-timing-001","event_type":"call.initiated","call_id":"call-timing","agent_id":"agent-1","timestamp":"2025-01-01T10:00:00Z","call":{"direction":"INBOUND","status":"INITIATED","from_number":"+919876543211","to_number":"+918888888888"}}'
SIG=$(generate_hmac "$PAYLOAD")

time curl -s -X POST "$CRM_URL/api/webhooks/calllive/events" \
  -H "Content-Type: application/json" \
  -H "X-CallLive-Signature: $SIG" \
  -H "X-CallLive-Event-ID: test-timing-001" \
  -d "$PAYLOAD" -o /dev/null
```
**Expected output:** `real 0m0.XXXs` where XXX < 1000ms

### Test 3.3: Invalid Signature Returns 401
```bash
PAYLOAD='{"event_id":"test-invalid","event_type":"call.initiated","call_id":"call-inv","agent_id":"agent-1","timestamp":"2025-01-01T10:00:00Z","call":{"direction":"INBOUND","status":"INITIATED","from_number":"+919876543212","to_number":"+918888888888"}}'

curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$CRM_URL/api/webhooks/calllive/events" \
  -H "Content-Type: application/json" \
  -H "X-CallLive-Signature: sha256=invalidsignature" \
  -H "X-CallLive-Event-ID: test-invalid" \
  -d "$PAYLOAD"
```
**Expected output:** `HTTP_STATUS:401`

### Test 3.4: WebhookEvent Record Created in DB
```bash
# Wait 2 seconds for processing, then check DB
sleep 2
psql "$PG_URL" -c "
  SELECT event_id, event_type, processing_status
  FROM workspace_*.calllive_webhook_event  -- replace * with actual workspace UUID
  WHERE event_id = 'test-001';" 2>/dev/null
```
**Expected output:**
```
 event_id | event_type       | processing_status
----------+------------------+------------------
 test-001 | call.initiated   | PROCESSED
```

### Test 3.5: VoiceJourney Created by Processor
```bash
sleep 3  # Allow BullMQ job to process
psql "$PG_URL" -c "
  SELECT call_id, direction, status
  FROM workspace_*.calllive_voice_journey
  WHERE call_id = 'call-abc';" 2>/dev/null
```
**Expected output:**
```
  call_id  | direction | status
-----------+-----------+---------
 call-abc  | INBOUND   | INITIATED
```

### Test 3.6: Idempotency — Duplicate Event Is Not Processed Twice
```bash
# Send the same event_id again
PAYLOAD='{"event_id":"test-001","event_type":"call.initiated","call_id":"call-abc","agent_id":"agent-1","timestamp":"2025-01-01T10:00:00Z","call":{"direction":"INBOUND","status":"INITIATED","from_number":"+919876543210","to_number":"+918888888888"}}'
SIG=$(generate_hmac "$PAYLOAD")
curl -s -X POST "$CRM_URL/api/webhooks/calllive/events" \
  -H "Content-Type: application/json" -H "X-CallLive-Signature: $SIG" \
  -H "X-CallLive-Event-ID: test-001" -d "$PAYLOAD"

sleep 2
psql "$PG_URL" -c "
  SELECT COUNT(*) FROM workspace_*.calllive_voice_journey WHERE call_id='call-abc';" 2>/dev/null
```
**Expected output:** `count = 1` (not 2)

### Test 3.7: GraphQL voiceJourneys Query Returns Data
```bash
curl -s -X POST "$CRM_URL/api" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "query": "{ voiceJourneys { edges { node { id callId direction status } } } }"
  }' | jq '.data.voiceJourneys.edges | length'
```
**Expected output:** A number > 0

### Test 3.8: RealEstateProject GraphQL CRUD Works
```bash
# Create
curl -s -X POST "$CRM_URL/api" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "query": "mutation { createRealEstateProject(input: { name: \"Test Project\", city: \"Bangalore\", locality: \"Whitefield\", projectType: APARTMENT, status: UPCOMING }) { id name } }"
  }' | jq '.data.createRealEstateProject.id'
```
**Expected output:** A UUID string (not null, not error)

### Test 3.9: Unit Tests Pass
```bash
yarn workspace twenty-server test \
  --testPathPattern="calllive-webhook|voice-journey|real-estate" \
  --passWithNoTests 2>&1 | tail -10
```
**Expected output:** `Tests: X passed, 0 failed`

---

## PHASE 4 — Frontend UI

### Test 4.1: Voice History Tab Renders on Person Record
```bash
# Open browser (manual step — Playwright automates this)
npx playwright test packages/twenty-front/src/modules/voice-journey/__tests__/VoiceHistoryTab.spec.ts 2>&1 | tail -5
```
**Expected output:** `X passed (Xs)`

### Test 4.2: No TypeScript Errors in New Frontend Files
```bash
yarn workspace twenty-front tsc --noEmit 2>&1 | grep -E "voice-journey|real-estate" | grep "error TS"
```
**Expected output:** Empty (no TypeScript errors in new files)

### Test 4.3: No `any` Types in New Frontend Components
```bash
grep -r ": any" packages/twenty-front/src/modules/{voice-journey,real-estate-project}/ \
  --include="*.tsx" --include="*.ts"
```
**Expected output:** Empty (no occurrences)

### Test 4.4: TranscriptViewer Renders Both Speaker Types
```bash
# Storybook story passes (if Storybook is configured)
# OR: manual verification checklist
echo "Manual check: Open Person record with a VoiceJourney that has transcript_raw populated"
echo "Verify: AI agent messages appear LEFT, Human messages appear RIGHT"
echo "Verify: Sentiment banner shows GREEN (>0.3), YELLOW (-0.3 to 0.3), RED (<-0.3)"
```

### Test 4.5: Frontend Build Has No Errors
```bash
yarn workspace twenty-front build 2>&1 | grep -E "error|Error" | grep -v "node_modules"
```
**Expected output:** Empty (no build errors)

---

## PHASE 5 — n8n Automations

### Test 5.1: n8n Workflows Exist and Are Active
```bash
# Access n8n API
curl -s "http://flow.calllive.in/api/v1/workflows" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" | \
  jq '[.data[] | select(.name | test("CallLive|Voice")) | {name: .name, active: .active}]'
```
**Expected output:**
```json
[
  {"name": "CallLive - High Intent Alert", "active": true},
  {"name": "CallLive - Daily Voice Summary", "active": true}
]
```

### Test 5.2: High Intent Alert Workflow Fires
```bash
# Send a BOOKING_INTENT sentiment webhook and verify n8n processes it
PAYLOAD='{"event_id":"test-booking-001","event_type":"sentiment.analyzed","call_id":"call-booking","agent_id":"agent-1","timestamp":"2025-01-01T10:05:00Z","call":{"direction":"INBOUND","status":"COMPLETED","from_number":"+919876543213","to_number":"+918888888888","duration_seconds":180},"ai_analysis":{"sentiment_score":0.85,"intent":"BOOKING_INTENT","summary":"Lead expressed strong interest in booking Unit A-1204","key_entities":{"budget_max":"8000000","preferred_location":"Whitefield"},"next_action":"Schedule site visit immediately"}}'
SIG=$(generate_hmac "$PAYLOAD")
curl -s -X POST "$CRM_URL/api/webhooks/calllive/events" \
  -H "Content-Type: application/json" -H "X-CallLive-Signature: $SIG" \
  -H "X-CallLive-Event-ID: test-booking-001" -d "$PAYLOAD"
echo "Check Slack / email for notification within 30 seconds"
```

### Test 5.3: n8n Workflows Are Exported to Repo
```bash
ls n8n-workflows/*.json | wc -l
```
**Expected output:** At least `2`

---

## PHASE 6 — Production Deployment

### Test 6.1: HTTPS Endpoint Responds
```bash
curl -s -o /dev/null -w "%{http_code}" https://crm.calllive.in/healthz
```
**Expected output:** `200`

### Test 6.2: SSL Certificate Is Valid
```bash
echo | openssl s_client -servername crm.calllive.in -connect crm.calllive.in:443 2>/dev/null | \
  openssl x509 -noout -dates
```
**Expected output:** `notAfter` date is > 30 days in the future

### Test 6.3: Production Webhook Ingestion Works
```bash
# Send a test event to production
PAYLOAD='{"event_id":"prod-test-001","event_type":"call.initiated","call_id":"prod-call-abc","agent_id":"agent-1","timestamp":"2025-01-01T10:00:00Z","call":{"direction":"OUTBOUND","status":"INITIATED","from_number":"+918888888888","to_number":"+919876543210"}}'
PROD_SECRET="<production-webhook-secret>"
SIG=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$PROD_SECRET" | awk '{print "sha256="$2}')

curl -s -X POST "https://crm.calllive.in/api/webhooks/calllive/events" \
  -H "Content-Type: application/json" \
  -H "X-CallLive-Signature: $SIG" \
  -H "X-CallLive-Event-ID: prod-test-001" \
  -d "$PAYLOAD"
```
**Expected output:** `{"received": true}`

### Test 6.4: No Secrets in Git History
```bash
git log --all --full-history --oneline -- "*.env" "**/.env" | head -5
git grep -i "password\|secret\|api_key\|token" -- "*.env" "*.env.*" 2>/dev/null | \
  grep -v ".env.example"
```
**Expected output:** Both commands return empty

### Test 6.5: Database Backup Script Exists and Runs
```bash
bash scripts/backup-db.sh --dry-run 2>&1
```
**Expected output:** `DRY RUN: Would backup calllive_crm to /backups/...`

---

## CONTINUOUS INTEGRATION — MINIMUM BAR

Before any PR merge, ALL of these must pass:

```bash
# Run this complete check script
#!/bin/bash
set -e

echo "=== TypeScript Check ==="
yarn workspace twenty-server tsc --noEmit
yarn workspace twenty-front tsc --noEmit

echo "=== Unit Tests ==="
yarn workspace twenty-server test --passWithNoTests

echo "=== Lint ==="
yarn workspace twenty-server lint
yarn workspace twenty-front lint

echo "=== No any types ==="
COUNT=$(grep -r ": any\|as any" packages/twenty-server/src/modules/ \
  packages/twenty-front/src/modules/voice-journey/ \
  packages/twenty-front/src/modules/real-estate-project/ \
  --include="*.ts" --include="*.tsx" | wc -l)
[ "$COUNT" -eq 0 ] || (echo "❌ Found $COUNT 'any' type usages" && exit 1)

echo "=== All checks passed ==="
```
