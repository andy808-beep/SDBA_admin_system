# Database Migrations

This directory is reserved for incremental database migrations for **future production deployments**.

## Current Status

**Not in production yet** - Using `main.sql` as single source of truth.

When you go to production, use this folder for incremental, safe patches.

## Migration Naming

Format: `{number}_{descriptive_name}.sql`

Example: `002_fix_approve_function.sql`

## How to Apply (For Future Production Use)

### Via Supabase Dashboard (Recommended)

1. Open Supabase Dashboard → SQL Editor
2. Copy the contents of the migration file
3. Review the SQL carefully
4. Execute

### Via Supabase CLI

```bash
supabase db push
```

### Via psql

```bash
psql $DATABASE_URL -f db_schema/migrations/002_fix_approve_function.sql
```

## Migration Tracking

Migrations are tracked in the `public.schema_migrations` table:

```sql
SELECT * FROM public.schema_migrations ORDER BY applied_at;
```

## Current Migrations

_None yet - migrations will be added here when production deployments begin._

## Safety

All migrations in this directory are:
- ✅ Idempotent (safe to run multiple times)
- ✅ Non-destructive (won't delete data)
- ✅ Transaction-wrapped (all-or-nothing)
- ✅ Tested in development first

## Rollback

If you need to rollback a migration, check the migration file for rollback instructions or create a new migration with the reverse changes.

