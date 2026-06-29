// packages/twenty-server/src/modules/calllive-database/migrations/1700000002-AddVoiceJourney.ts
//
// Creates the calllive_voice_journey table — the core entity for CallLive AI CRM.
// Every AI call handled by CallLive.ai creates one row in this table.
//
// 3 enum types: direction, status, intentDetected
// 24 columns matching voice-journey.entity.ts
// 4 indexes as specified in the task

import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddVoiceJourney1700000002 implements MigrationInterface {
  name = 'AddVoiceJourney1700000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Create enum types
    await queryRunner.query(
      `CREATE TYPE "calllive_voice_journey_direction_enum" AS ENUM('INBOUND', 'OUTBOUND')`,
    );

    await queryRunner.query(
      `CREATE TYPE "calllive_voice_journey_status_enum" AS ENUM('INITIATED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'NO_ANSWER')`,
    );

    await queryRunner.query(
      `CREATE TYPE "calllive_voice_journey_intentdetected_enum" AS ENUM('INQUIRY', 'SITE_VISIT_REQUEST', 'BOOKING_INTENT', 'COMPLAINT', 'FOLLOW_UP', 'NOT_INTERESTED', 'CALLBACK_REQUEST')`,
    );

    // Step 2: Create the table with all 24 columns
    await queryRunner.query(
      `CREATE TABLE "calllive_voice_journey" (
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
      )`,
    );

    // Step 3: Create indexes

    // 1. Unique index on callId for fast call lookups and idempotency
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_voice_journey_call_id" ON "calllive_voice_journey" ("callId")`,
    );

    // 2. Index on relatedContactId for "show all calls for this person" queries
    await queryRunner.query(
      `CREATE INDEX "IDX_voice_journey_contact" ON "calllive_voice_journey" ("relatedContactId")`,
    );

    // 3. Composite index on (status, createdAt) for dashboard queries
    //    "show me all COMPLETED calls this week" or "find FAILED calls today"
    await queryRunner.query(
      `CREATE INDEX "IDX_voice_journey_status" ON "calllive_voice_journey" ("status", "createdAt")`,
    );

    // 4. Index on intentDetected for filtering by AI-detected intent
    await queryRunner.query(
      `CREATE INDEX "IDX_voice_journey_intent" ON "calllive_voice_journey" ("intentDetected")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop in reverse order: indexes → table → enum types

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_voice_journey_intent"`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_voice_journey_status"`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_voice_journey_contact"`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_voice_journey_call_id"`,
    );

    await queryRunner.query(
      `DROP TABLE IF EXISTS "calllive_voice_journey"`,
    );

    await queryRunner.query(
      `DROP TYPE IF EXISTS "calllive_voice_journey_intentdetected_enum"`,
    );

    await queryRunner.query(
      `DROP TYPE IF EXISTS "calllive_voice_journey_status_enum"`,
    );

    await queryRunner.query(
      `DROP TYPE IF EXISTS "calllive_voice_journey_direction_enum"`,
    );
  }
}
