// packages/twenty-server/src/modules/calllive-database/migrations/1700000005-AddSiteVisit.ts
//
// Creates the calllive_site_visit table.

import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddSiteVisit1700000005 implements MigrationInterface {
  name = 'AddSiteVisit1700000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Create enum type
    await queryRunner.query(
      `CREATE TYPE "calllive_site_visit_status_enum" AS ENUM('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW')`,
    );

    // Step 2: Create the table
    await queryRunner.query(
      `CREATE TABLE "calllive_site_visit" (
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
      )`,
    );

    // Step 3: Create indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_CALLLIVE_SITE_VISIT_LEAD" ON "calllive_site_visit" ("leadId")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_CALLLIVE_SITE_VISIT_PROJECT" ON "calllive_site_visit" ("projectId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_CALLLIVE_SITE_VISIT_PROJECT"`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_CALLLIVE_SITE_VISIT_LEAD"`,
    );

    await queryRunner.query(
      `DROP TABLE IF EXISTS "calllive_site_visit"`,
    );

    await queryRunner.query(
      `DROP TYPE IF EXISTS "calllive_site_visit_status_enum"`,
    );
  }
}
