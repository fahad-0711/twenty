-- ============================================================
-- CallLive AI CRM — Combined Migration Script
-- Run via: docker compose exec db psql -U postgres -d default -f /tmp/migrate.sql
-- ============================================================

-- Step 0: Find and set the workspace schema
DO $$
DECLARE
  ws_schema TEXT;
BEGIN
  SELECT schema_name INTO ws_schema
  FROM information_schema.schemata
  WHERE schema_name LIKE 'workspace_%'
  LIMIT 1;

  IF ws_schema IS NULL THEN
    RAISE EXCEPTION 'No workspace schema found. Create an admin account in the CRM UI first.';
  END IF;

  RAISE NOTICE 'Using schema: %', ws_schema;
  EXECUTE format('SET search_path TO %I, public', ws_schema);
END $$;

-- ============================================================
-- Migration 1: calllive_webhook_event
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calllive_webhook_event_processingstatus_enum') THEN
    CREATE TYPE "calllive_webhook_event_processingstatus_enum" AS ENUM('RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "calllive_webhook_event" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "eventId" character varying NOT NULL,
  "eventType" character varying NOT NULL,
  "rawPayload" jsonb NOT NULL,
  "processingStatus" "calllive_webhook_event_processingstatus_enum" NOT NULL DEFAULT 'RECEIVED',
  "errorMessage" character varying,
  "processedAt" TIMESTAMP WITH TIME ZONE,
  "relatedVoiceJourneyId" uuid,
  "receivedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "deletedAt" TIMESTAMP WITH TIME ZONE,
  CONSTRAINT "PK_calllive_webhook_event_id" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_calllive_webhook_event_eventId" UNIQUE ("eventId")
);

CREATE UNIQUE INDEX IF NOT EXISTS "IDX_CALLLIVE_WEBHOOK_EVENT_EVENT_ID" ON "calllive_webhook_event" ("eventId");
CREATE INDEX IF NOT EXISTS "IDX_CALLLIVE_WEBHOOK_EVENT_EVENT_TYPE" ON "calllive_webhook_event" ("eventType");
CREATE INDEX IF NOT EXISTS "IDX_CALLLIVE_WEBHOOK_EVENT_PROCESSING_STATUS" ON "calllive_webhook_event" ("processingStatus");

-- ============================================================
-- Migration 2: calllive_voice_journey
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calllive_voice_journey_direction_enum') THEN
    CREATE TYPE "calllive_voice_journey_direction_enum" AS ENUM('INBOUND', 'OUTBOUND');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calllive_voice_journey_status_enum') THEN
    CREATE TYPE "calllive_voice_journey_status_enum" AS ENUM('INITIATED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'NO_ANSWER');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calllive_voice_journey_intentdetected_enum') THEN
    CREATE TYPE "calllive_voice_journey_intentdetected_enum" AS ENUM('INQUIRY', 'SITE_VISIT_REQUEST', 'BOOKING_INTENT', 'COMPLAINT', 'FOLLOW_UP', 'NOT_INTERESTED', 'CALLBACK_REQUEST');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "calllive_voice_journey" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "callId" character varying NOT NULL,
  "agentId" character varying,
  "direction" "calllive_voice_journey_direction_enum" NOT NULL,
  "status" "calllive_voice_journey_status_enum" NOT NULL DEFAULT 'INITIATED',
  "fromNumber" character varying NOT NULL,
  "toNumber" character varying NOT NULL,
  "durationSeconds" integer NOT NULL DEFAULT 0,
  "recordingUrl" character varying,
  "startedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
  "endedAt" TIMESTAMP WITH TIME ZONE,
  "sentimentScore" numeric(4,3),
  "intentDetected" "calllive_voice_journey_intentdetected_enum",
  "transcriptSummary" text,
  "nextAction" text,
  "keyEntitiesExtracted" jsonb,
  "transcriptRaw" jsonb,
  "agentPerformanceScore" numeric(4,3),
  "relatedContactId" uuid,
  "relatedOpportunityId" uuid,
  "relatedProjectId" uuid,
  "isReviewed" boolean NOT NULL DEFAULT false,
  "reviewedBy" character varying,
  "reviewedAt" TIMESTAMP WITH TIME ZONE,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "deletedAt" TIMESTAMP WITH TIME ZONE,
  CONSTRAINT "PK_calllive_voice_journey_id" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_calllive_voice_journey_callId" UNIQUE ("callId")
);

CREATE UNIQUE INDEX IF NOT EXISTS "IDX_voice_journey_call_id" ON "calllive_voice_journey" ("callId");
CREATE INDEX IF NOT EXISTS "IDX_voice_journey_contact" ON "calllive_voice_journey" ("relatedContactId");
CREATE INDEX IF NOT EXISTS "IDX_voice_journey_status" ON "calllive_voice_journey" ("status", "createdAt");
CREATE INDEX IF NOT EXISTS "IDX_voice_journey_intent" ON "calllive_voice_journey" ("intentDetected");

-- ============================================================
-- Migration 3: calllive_real_estate_project
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calllive_real_estate_project_projecttype_enum') THEN
    CREATE TYPE "calllive_real_estate_project_projecttype_enum" AS ENUM('APARTMENT', 'VILLA', 'PLOT', 'COMMERCIAL');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calllive_real_estate_project_status_enum') THEN
    CREATE TYPE "calllive_real_estate_project_status_enum" AS ENUM('UNDER_CONSTRUCTION', 'READY_TO_MOVE', 'UPCOMING');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "calllive_real_estate_project" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "name" character varying NOT NULL,
  "reraNumber" character varying,
  "city" character varying NOT NULL,
  "locality" character varying NOT NULL,
  "pinCode" character varying,
  "projectType" "calllive_real_estate_project_projecttype_enum" NOT NULL,
  "status" "calllive_real_estate_project_status_enum" NOT NULL,
  "pricePerSqft" numeric(10,2),
  "minPrice" bigint,
  "maxPrice" bigint,
  "totalUnits" integer,
  "availableUnits" integer,
  "brochureUrl" character varying,
  "amenities" jsonb,
  "possessionDate" TIMESTAMP WITH TIME ZONE,
  "developerId" uuid,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "deletedAt" TIMESTAMP WITH TIME ZONE,
  CONSTRAINT "PK_calllive_real_estate_project_id" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "IDX_CALLLIVE_PROJECT_CITY" ON "calllive_real_estate_project" ("city");
CREATE INDEX IF NOT EXISTS "IDX_CALLLIVE_PROJECT_STATUS" ON "calllive_real_estate_project" ("status");
CREATE INDEX IF NOT EXISTS "IDX_CALLLIVE_PROJECT_TYPE" ON "calllive_real_estate_project" ("projectType");
CREATE INDEX IF NOT EXISTS "IDX_CALLLIVE_PROJECT_DEVELOPER" ON "calllive_real_estate_project" ("developerId");

-- ============================================================
-- Migration 4: calllive_project_unit
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calllive_project_unit_status_enum') THEN
    CREATE TYPE "calllive_project_unit_status_enum" AS ENUM('AVAILABLE', 'BLOCKED', 'BOOKED', 'REGISTERED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "calllive_project_unit" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "unitNumber" character varying NOT NULL,
  "floorNumber" integer,
  "tower" character varying,
  "carpetAreaSqft" numeric(8,2) NOT NULL,
  "builtupAreaSqft" numeric(8,2),
  "bedrooms" integer,
  "bathrooms" integer,
  "status" "calllive_project_unit_status_enum" NOT NULL DEFAULT 'AVAILABLE',
  "priceTotal" bigint NOT NULL,
  "facing" character varying,
  "relatedProjectId" uuid NOT NULL,
  "bookedByContactId" uuid,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "deletedAt" TIMESTAMP WITH TIME ZONE,
  CONSTRAINT "PK_calllive_project_unit_id" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "IDX_CALLLIVE_UNIT_PROJECT" ON "calllive_project_unit" ("relatedProjectId");
CREATE INDEX IF NOT EXISTS "IDX_CALLLIVE_UNIT_STATUS" ON "calllive_project_unit" ("status");
CREATE INDEX IF NOT EXISTS "IDX_CALLLIVE_UNIT_BOOKED_BY" ON "calllive_project_unit" ("bookedByContactId");

-- ============================================================
-- Migration 5: calllive_site_visit
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calllive_site_visit_status_enum') THEN
    CREATE TYPE "calllive_site_visit_status_enum" AS ENUM('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "calllive_site_visit" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "status" "calllive_site_visit_status_enum" NOT NULL,
  "scheduledAt" TIMESTAMP WITH TIME ZONE NOT NULL,
  "completedAt" TIMESTAMP WITH TIME ZONE,
  "notes" text,
  "outcome" text,
  "attended" boolean NOT NULL DEFAULT false,
  "leadId" uuid NOT NULL,
  "projectId" uuid NOT NULL,
  "unitId" uuid,
  "accompaniedById" uuid,
  "scheduledFromCallId" uuid,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "deletedAt" TIMESTAMP WITH TIME ZONE,
  CONSTRAINT "PK_calllive_site_visit_id" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "IDX_CALLLIVE_SITE_VISIT_LEAD" ON "calllive_site_visit" ("leadId");
CREATE INDEX IF NOT EXISTS "IDX_CALLLIVE_SITE_VISIT_PROJECT" ON "calllive_site_visit" ("projectId");

-- ============================================================
-- Done!
-- ============================================================
SELECT 'All 5 CallLive migrations completed successfully!' AS result;
