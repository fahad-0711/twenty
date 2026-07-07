# CallLive AI CRM — Project Documentation

## 1. Project Overview
**CallLive AI CRM** is a customized, voice-first real estate CRM built as a fork of [Twenty CRM](https://twenty.com). It is designed to seamlessly ingest, process, and display AI phone calls (from platforms like Vapi, Retell AI, or Bland AI) directly alongside customer profiles. 

This CRM enables real estate teams to track "Voice Journeys" — logging every automated AI phone call's sentiment, detected intent (e.g., booking a site visit), transcripts, and key extracted entities in a central location.

**Tech Stack:**
- **Backend:** Node.js, NestJS, GraphQL, BullMQ
- **Frontend:** React, TypeScript, Apollo GraphQL
- **Database:** PostgreSQL (with TypeORM), Redis (for queues/caching)
- **Infrastructure:** Docker, Docker Compose, Nginx (Reverse Proxy)
- **Automations:** n8n (External workflows)

## 2. Features
- **Webhook Ingestion Engine:** A highly robust, idempotent webhook controller (`/api/webhooks/calllive/events`) secured with HMAC signature verification that receives raw call payloads from AI telephony providers.
- **Asynchronous Processing:** BullMQ integration processes incoming webhook events in the background to ensure the CRM API remains fast and responsive.
- **Voice Journey Entity:** A custom data model representing a single AI phone call. It stores call duration, recording URLs, timestamps, sentiment scores, and raw transcripts.
- **AI Intent Detection & Auto-Tasking:** Automatically categorizes calls into intents like `SITE_VISIT_REQUEST` or `BOOKING_INTENT`. Automatically creates follow-up tasks for human agents if a high-intent action is detected.
- **Custom Real Estate Entities:** Database models tailored for real estate: Projects, Units, and Site Visits.
- **Voice History UI Tab:** A custom frontend tab injected into the standard Person/Contact view.
- **Rich Call Cards:** React components (`VoiceJourneyCard`, `SentimentChip`) that display call transcripts, intent, and audio recordings in a beautiful, readable format.
- **Production-Ready Deployment:** Custom Docker layers, Nginx reverse proxy configs, automated database backup scripts, and raw SQL migration scripts for easy VPS deployment.
- **n8n Automations:** Pre-built workflow exports for Slack alerts on high-intent leads and daily voice summary emails.

## 3. What You Can Do With It
- **View Full Customer Context:** Open a contact in the CRM and see their entire history of AI phone calls in the "Voice History" tab, without leaving the page.
- **Read & Listen to Calls:** Quickly skim AI-generated call summaries, read full transcripts, and click to listen to the actual call recordings.
- **Automate Follow-ups:** Rely on the CRM to automatically create a "Follow up on site visit" task assigned to a sales agent when the AI detects a `SITE_VISIT_REQUEST`.
- **Monitor High-Intent Leads:** Use the provided n8n workflows to get immediate Slack notifications whenever an AI call results in a `BOOKING_INTENT`.
- **Manage Real Estate Inventory:** Use the backend structures to link callers to specific Real Estate Projects and Units.

## 4. Setup & Installation
### Prerequisites
- Docker and Docker Desktop (or Docker Engine on Linux)
- Git
- Node.js (v18+) & Yarn (for local development only)

### Step-by-step Setup
1. **Clone the repository:**
   ```bash
   git clone https://github.com/fahad-0711/twenty.git
   cd twenty
   ```
2. **Set up environment variables:**
   - Copy `.env.example` to `.env` (or use `.env.production` for VPS deployments).
   - Ensure you set a strong `ENCRYPTION_KEY`, `PG_DATABASE_PASSWORD`, and `TAG=latest`.
   - Set the `SERVER_URL` (e.g., `http://localhost:3000` or your custom domain).

3. **Install Dependencies (Local Dev):**
   ```bash
   yarn install
   ```

## 5. How to Run It

### Production Mode (Using Docker Compose)
This approach builds the image from source, targeting the production `twenty` stage.

1. **Build the custom Docker image:**
   ```bash
   docker build --target twenty -f packages/twenty-docker/twenty/Dockerfile -t callliveai/crm:latest .
   ```
2. **Start the containers:**
   ```bash
   cd packages/twenty-docker
   docker compose down
   docker compose up -d
   ```
3. **Run Custom Database Migrations:**
   Once the CRM is running, create your first Admin user via the browser at `http://localhost:3000` (this initializes the workspace schema). Then run the custom migrations to create the VoiceJourney tables:
   ```bash
   docker compose -f packages/twenty-docker/docker-compose.yml cp scripts/calllive-migrations.sql calllive-ai-db-1:/tmp/migrate.sql
   docker compose -f packages/twenty-docker/docker-compose.yml exec db psql -U twenty -d default -f /tmp/migrate.sql
   ```

### Development Mode
To run locally with hot-reloading:
```bash
npx nx serve twenty-server
npx nx serve twenty-front
```

## 6. How to Use It
1. **Access the CRM:** Navigate to `http://localhost:3000` (or your production domain). Log in with your admin account.
2. **View Voice Journeys:** Go to any Person record. Click the **Voice History** tab to see a list of AI calls associated with that person's phone number.
3. **Send a Test Webhook:** Simulate an AI call completing by sending a POST request to your webhook endpoint:
   ```bash
   curl -X POST http://localhost:3000/api/webhooks/calllive/events \
     -H "Content-Type: application/json" \
     -H "x-calllive-signature: <your-hmac-signature>" \
     -d '{"event_id": "123", "event_type": "call_ended", "call": {"id": "call_123", "status": "completed", "transcript": "Hello, I want to visit the site."}}'
   ```
   *(Note: You must generate a valid HMAC signature matching your webhook secret for this to succeed, otherwise it returns HTTP 401).*

## 7. File Structure
Key custom directories and files added to the Twenty monorepo:

- `packages/twenty-server/src/modules/calllive-webhook/`
  - *Webhook controller, HMAC validator, and BullMQ background processor.*
- `packages/twenty-server/src/modules/voice-journey/`
  - *GraphQL resolver, service logic, and entity definitions for Voice Journeys.*
- `packages/twenty-server/src/modules/calllive-database/migrations/`
  - *TypeORM migration files defining the schema for VoiceJourneys, Projects, Units, etc.*
- `packages/twenty-front/src/modules/voice-journey/`
  - *React components (`VoiceJourneyCard.tsx`, `SentimentChip.tsx`, `VoiceHistoryTab.tsx`) and GraphQL hooks.*
- `scripts/`
  - `backup-db.sh`: *Automated database backup script with 7-day retention.*
  - `calllive-migrations.sql`: *Raw SQL migrations for production VPS deployment.*
- `n8n-workflows/`
  - *Exported JSON files for n8n automations (e.g., Slack alerts, daily email summaries).*
- `Dockerfile.calllive`
  - *An alternative lightweight Dockerfile that seamlessly layers our custom code on top of the official `twentycrm/twenty` image.*
- `nginx/crm.conf`
  - *Production Nginx reverse proxy configuration.*

## 8. Known Limitations / TODOs
- **Frontend Real Estate Tabs:** While backend entities exist for Projects, Units, and Site Visits, the custom frontend UI views for these specific entities have not yet been fully built out.
- **Voice Journey Filtering:** The Voice History tab currently fetches recent calls. Advanced filtering (e.g., "Show me only calls with negative sentiment") is supported by the GraphQL API but not yet fully wired up in the UI.
- **Vapi/Retell Strict Schema:** The webhook processor currently accepts a generalized JSON payload. It may require mapping adjustments depending on the exact schema structure sent by your specific AI telephony provider (e.g., Vapi vs. Bland AI).
