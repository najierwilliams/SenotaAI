# Neon PostgreSQL migration strategy

The production database is Neon PostgreSQL. The active Drizzle configuration therefore uses the PostgreSQL dialect and `DATABASE_URL`. The historical files under `drizzle/0000` through `drizzle/0006` are preserved as audit history and are not replayable against Neon because they were generated for the former MySQL/TiDB configuration.

## Existing production database

For the existing production database, first verify that the existing `agent_settings` table is present and that the migration history has not already recorded the Foundation columns. Then apply only `drizzle-pg/0000_luna_foundation.sql`. Every operation is additive and uses `ADD COLUMN IF NOT EXISTS`; it does not drop, reset, truncate, recreate, or overwrite existing tables or rows.

## Fresh PostgreSQL database

A fresh PostgreSQL database must be bootstrapped from a PostgreSQL baseline generated from the current `drizzle/schema.ts`, followed by the PostgreSQL Foundation migration. The legacy MySQL migration files must not be used as a fresh-database bootstrap. Creating or applying that baseline is a separate database-initialization operation and is intentionally not performed by this compatibility change.

## Credential handling

All database commands use `DATABASE_URL` from the deployment environment. No credentials are stored in this repository, printed in logs, or included in migration files.
