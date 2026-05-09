import 'dotenv/config';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { db } from './client';
import { env } from './env';
import * as postgresSchema from './schema/postgres';
import * as sqliteSchema from './schema/sqlite';
import { eq } from 'drizzle-orm';
import { hashPassword } from './utils/password';

async function seed() {
  const location = env.databaseDriver === 'postgres'
    ? `schema ${env.databaseSchema}`
    : env.databaseUrl;
  console.log(`Seeding ${env.databaseDriver}: ${location}`);

  if (env.databaseDriver === 'sqlite') {
    const sqliteDb = db as BetterSQLite3Database<typeof sqliteSchema>;

    const existingAdmin = await sqliteDb
      .select({ id: sqliteSchema.users.id })
      .from(sqliteSchema.users)
      .where(eq(sqliteSchema.users.email, env.adminEmail))
      .limit(1);

    if (existingAdmin.length > 0) {
      console.log('Admin user already exists, skipping seed.');
      return;
    }

    const passwordHash = await hashPassword(env.adminPassword);

    await sqliteDb.insert(sqliteSchema.users).values({
      email: env.adminEmail,
      name: 'Admin',
      passwordHash,
    });
  } else {
    const postgresDb = db as NodePgDatabase<typeof postgresSchema>;

    const existingAdmin = await postgresDb
      .select({ id: postgresSchema.users.id })
      .from(postgresSchema.users)
      .where(eq(postgresSchema.users.email, env.adminEmail))
      .limit(1);

    if (existingAdmin.length > 0) {
      console.log('Admin user already exists, skipping seed.');
      return;
    }

    const passwordHash = await hashPassword(env.adminPassword);

    await postgresDb.insert(postgresSchema.users).values({
      email: env.adminEmail,
      name: 'Admin',
      passwordHash,
    });
  }

  console.log(`Admin user created: ${env.adminEmail}`);
}

seed()
  .then(() => {
    console.log('Seed completed.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
