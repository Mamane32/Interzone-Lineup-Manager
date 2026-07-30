# GGSP production database deployment runner

This runner upgrades an existing Interzone MVP database through migrations
002–006. It intentionally never executes `supabase/schema.sql`.

## Safety model

- Each migration has its own preflight, transaction, post-verification, and
  advisory lock.
- `psql` runs with `ON_ERROR_STOP`; any SQL error closes the connection while
  the transaction is open, causing PostgreSQL to roll it back automatically.
- The runner stops on the first failure.
- A fingerprint of all MVP table row counts and primary-key sets is captured
  before deployment and compared after every committed migration.
- The expected Supabase project reference must occur in the supplied database
  connection string.
- The administrator bootstrap is separate and opt-in.

These packages are intentionally strict one-time deployment packages. If their
objects already or partially exist, they fail instead of guessing whether a
previous deployment was complete.

## Requirements

1. PostgreSQL `psql` installed and available on `PATH`.
2. A verified Supabase backup or Point-in-Time Recovery point.
3. The direct or session-pooler Postgres connection string from Supabase
   Database Settings.
4. A maintenance window with schema writes paused.

Do not commit a database password or connection string.

## Configure the connection

In a private PowerShell session:

```powershell
$env:SUPABASE_DB_URL = 'postgresql://...'
```

The value must belong to project ref `cyhdpobzjytvuecmcwxf`. The runner never
prints the connection string.

## Run migrations only

From the repository root:

```powershell
& .\supabase\deploy\deploy.ps1
```

## Run migrations and the separate super-admin bootstrap

Only after the administrator email exists in Supabase Auth:

```powershell
& .\supabase\deploy\deploy.ps1 `
  -BootstrapSuperAdmin `
  -AdminEmail 'darodebass@gmail.com'
```

## Failure behavior

On any preflight, migration, or post-verification error:

1. `psql` exits non-zero.
2. The open transaction is rolled back by PostgreSQL.
3. The runner throws and does not start the next package.
4. The operator must preserve the full output and investigate.

Never bypass a failed check or start a later package manually.
