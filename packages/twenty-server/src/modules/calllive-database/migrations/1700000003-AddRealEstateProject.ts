// packages/twenty-server/src/modules/calllive-database/migrations/1700000003-AddRealEstateProject.ts
//
// Creates the calllive_real_estate_project table for real estate development projects.

import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AddRealEstateProject1700000003 implements MigrationInterface {
  name = 'AddRealEstateProject1700000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Create enum types
    await queryRunner.query(
      `CREATE TYPE "calllive_real_estate_project_projecttype_enum" AS ENUM('APARTMENT', 'VILLA', 'PLOT', 'COMMERCIAL')`,
    );

    await queryRunner.query(
      `CREATE TYPE "calllive_real_estate_project_status_enum" AS ENUM('UNDER_CONSTRUCTION', 'READY_TO_MOVE', 'UPCOMING')`,
    );

    // Step 2: Create the table
    await queryRunner.query(
      `CREATE TABLE "calllive_real_estate_project" (
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
      )`,
    );

    // Step 3: Create indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_CALLLIVE_PROJECT_CITY" ON "calllive_real_estate_project" ("city")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_CALLLIVE_PROJECT_STATUS" ON "calllive_real_estate_project" ("status")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_CALLLIVE_PROJECT_TYPE" ON "calllive_real_estate_project" ("projectType")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_CALLLIVE_PROJECT_DEVELOPER" ON "calllive_real_estate_project" ("developerId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_CALLLIVE_PROJECT_DEVELOPER"`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_CALLLIVE_PROJECT_TYPE"`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_CALLLIVE_PROJECT_STATUS"`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_CALLLIVE_PROJECT_CITY"`,
    );

    await queryRunner.query(
      `DROP TABLE IF EXISTS "calllive_real_estate_project"`,
    );

    await queryRunner.query(
      `DROP TYPE IF EXISTS "calllive_real_estate_project_status_enum"`,
    );

    await queryRunner.query(
      `DROP TYPE IF EXISTS "calllive_real_estate_project_projecttype_enum"`,
    );
  }
}
