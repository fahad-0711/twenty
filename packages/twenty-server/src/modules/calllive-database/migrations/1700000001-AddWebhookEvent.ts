// packages/twenty-server/src/modules/calllive-database/migrations/1700000001-AddWebhookEvent.ts
//
// Creates the calllive_webhook_event table for CallLive.ai webhook ingestion.
// This table stores raw webhook payloads for idempotency and audit.

import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddWebhookEvent1700000001 implements MigrationInterface {
  name = 'AddWebhookEvent1700000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Create the processing_status enum type
    await queryRunner.query(
      `CREATE TYPE "calllive_webhook_event_processingstatus_enum" AS ENUM('RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED')`,
    );

    // Step 2: Create the table with all columns
    await queryRunner.query(
      `CREATE TABLE "calllive_webhook_event" (
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
      )`,
    );

    // Step 3: Create index on eventId for idempotency lookups
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_CALLLIVE_WEBHOOK_EVENT_EVENT_ID" ON "calllive_webhook_event" ("eventId")`,
    );

    // Step 4: Create index on eventType for filtering by event type
    await queryRunner.query(
      `CREATE INDEX "IDX_CALLLIVE_WEBHOOK_EVENT_EVENT_TYPE" ON "calllive_webhook_event" ("eventType")`,
    );

    // Step 5: Create index on processingStatus for filtering failed/pending events
    await queryRunner.query(
      `CREATE INDEX "IDX_CALLLIVE_WEBHOOK_EVENT_PROCESSING_STATUS" ON "calllive_webhook_event" ("processingStatus")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop in reverse order: indexes first, then table, then enum

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_CALLLIVE_WEBHOOK_EVENT_PROCESSING_STATUS"`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_CALLLIVE_WEBHOOK_EVENT_EVENT_TYPE"`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_CALLLIVE_WEBHOOK_EVENT_EVENT_ID"`,
    );

    await queryRunner.query(
      `DROP TABLE IF EXISTS "calllive_webhook_event"`,
    );

    await queryRunner.query(
      `DROP TYPE IF EXISTS "calllive_webhook_event_processingstatus_enum"`,
    );
  }
}
