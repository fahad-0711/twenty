// packages/twenty-server/src/modules/calllive-database/migrations/1700000004-AddProjectUnit.ts
//
// Creates the calllive_project_unit table for individual units within projects.
// Depends on calllive_real_estate_project (migration 1700000003).

import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddProjectUnit1700000004 implements MigrationInterface {
  name = 'AddProjectUnit1700000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Create enum type
    await queryRunner.query(
      `CREATE TYPE "calllive_project_unit_status_enum" AS ENUM('AVAILABLE', 'BLOCKED', 'BOOKED', 'REGISTERED')`,
    );

    // Step 2: Create the table
    await queryRunner.query(
      `CREATE TABLE "calllive_project_unit" (
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
      )`,
    );

    // Step 3: Create indexes

    // FK index on relatedProjectId — "show all units for this project"
    await queryRunner.query(
      `CREATE INDEX "IDX_CALLLIVE_UNIT_PROJECT" ON "calllive_project_unit" ("relatedProjectId")`,
    );

    // Status index for kanban board filtering
    await queryRunner.query(
      `CREATE INDEX "IDX_CALLLIVE_UNIT_STATUS" ON "calllive_project_unit" ("status")`,
    );

    // Index on bookedByContactId for "show all units booked by this person"
    await queryRunner.query(
      `CREATE INDEX "IDX_CALLLIVE_UNIT_BOOKED_BY" ON "calllive_project_unit" ("bookedByContactId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_CALLLIVE_UNIT_BOOKED_BY"`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_CALLLIVE_UNIT_STATUS"`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_CALLLIVE_UNIT_PROJECT"`,
    );

    await queryRunner.query(
      `DROP TABLE IF EXISTS "calllive_project_unit"`,
    );

    await queryRunner.query(
      `DROP TYPE IF EXISTS "calllive_project_unit_status_enum"`,
    );
  }
}
