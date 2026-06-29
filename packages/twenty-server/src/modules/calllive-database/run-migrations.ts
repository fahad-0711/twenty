// packages/twenty-server/src/modules/calllive-database/run-migrations.ts
import * as dotenv from 'dotenv';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { AddWebhookEvent1700000001 } from './migrations/1700000001-AddWebhookEvent';
import { AddVoiceJourney1700000002 } from './migrations/1700000002-AddVoiceJourney';
import { AddRealEstateProject1700000003 } from './migrations/1700000003-AddRealEstateProject';
import { AddProjectUnit1700000004 } from './migrations/1700000004-AddProjectUnit';
import { AddSiteVisit1700000005 } from './migrations/1700000005-AddSiteVisit';

dotenv.config({ path: path.join(__dirname, '../../../.env') });

async function run() {
  const dbUrl =
    process.env.PG_DATABASE_URL ||
    'postgres://postgres:postgres@localhost:5432/default';
  const dataSource = new DataSource({
    type: 'postgres',
    url: dbUrl,
  });

  await dataSource.initialize();
  const queryRunner = dataSource.createQueryRunner();

  try {
    const schemas = await queryRunner.query(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'workspace_%' LIMIT 1`,
    );

    if (schemas.length === 0) {
      throw new Error('No workspace schema found starting with workspace_');
    }

    const schemaName = schemas[0].schema_name;
    console.log(`Running migrations on schema: ${schemaName}`);

    await queryRunner.query(`SET search_path TO "${schemaName}", public`);

    const migrations = [
      new AddWebhookEvent1700000001(),
      new AddVoiceJourney1700000002(),
      new AddRealEstateProject1700000003(),
      new AddProjectUnit1700000004(),
      new AddSiteVisit1700000005(),
    ];

    for (const migration of migrations) {
      console.log(`Running migration: ${migration.name}`);
      await migration.up(queryRunner);
      console.log(`✅ Completed: ${migration.name}`);
    }
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
