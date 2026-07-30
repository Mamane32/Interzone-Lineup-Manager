[CmdletBinding()]
param(
  [Parameter()]
  [string]$ExpectedProjectRef = "cyhdpobzjytvuecmcwxf",

  [Parameter()]
  [switch]$BootstrapSuperAdmin,

  [Parameter()]
  [string]$AdminEmail
)

$ErrorActionPreference = "Stop"
$deployRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$packageRoot = Join-Path $deployRoot "packages"
$databaseUrl = $env:SUPABASE_DB_URL

if ([string]::IsNullOrWhiteSpace($databaseUrl)) {
  throw "SUPABASE_DB_URL is required. Copy the production Postgres connection string from Supabase Database Settings."
}

if ($databaseUrl -notlike "*$ExpectedProjectRef*") {
  throw "Connection string does not contain expected project ref '$ExpectedProjectRef'. Deployment refused."
}

if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
  throw "psql is required but was not found on PATH."
}

$packages = @(
  "002_live_center.deploy.sql",
  "003_unified_access.deploy.sql",
  "004_iam_foundation.deploy.sql",
  "005_iam_hardening.deploy.sql",
  "006_competition_foundation.deploy.sql"
)

function Invoke-Psql {
  param([string[]]$Arguments)
  & psql $databaseUrl -X @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "psql exited with code $LASTEXITCODE. The active migration transaction was rolled back. Do not continue."
  }
}

function Get-MvpFingerprint {
  $query = @"
select concat_ws('|',
  (select count(*) from public.competitions),
  (select count(*) from public.teams),
  (select count(*) from public.players),
  (select count(*) from public.matches),
  (select count(*) from public.lineups),
  coalesce((select string_agg(id::text, ',' order by id) from public.competitions), ''),
  coalesce((select string_agg(id::text, ',' order by id) from public.teams), ''),
  coalesce((select string_agg(id::text, ',' order by id) from public.players), ''),
  coalesce((select string_agg(id::text, ',' order by id) from public.matches), ''),
  coalesce((select string_agg(id::text, ',' order by id) from public.lineups), '')
);
"@
  $result = & psql $databaseUrl -X -v ON_ERROR_STOP=1 -A -t -c $query
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace(($result -join ""))) {
    throw "Unable to capture the Interzone MVP data fingerprint."
  }
  return ($result -join "").Trim()
}

Write-Host "GGSP production deployment"
Write-Host "Expected project ref: $ExpectedProjectRef"
Write-Host "schema.sql is intentionally excluded."

$baselineFingerprint = Get-MvpFingerprint
Write-Host "MVP data fingerprint captured."

foreach ($package in $packages) {
  $packagePath = Join-Path $packageRoot $package
  if (-not (Test-Path -LiteralPath $packagePath)) {
    throw "Deployment package not found: $packagePath"
  }

  Write-Host ""
  Write-Host "Running $package"
  Invoke-Psql -Arguments @("-v", "ON_ERROR_STOP=1", "-f", $packagePath)

  $currentFingerprint = Get-MvpFingerprint
  if ($currentFingerprint -ne $baselineFingerprint) {
    throw "MVP data fingerprint changed after $package. Stop deployment and investigate immediately."
  }
  Write-Host "PASS | $package | MVP data preserved"
}

Write-Host ""
Write-Host "PASS | migrations 002-006 completed | Interzone MVP data preserved"

if ($BootstrapSuperAdmin) {
  if ([string]::IsNullOrWhiteSpace($AdminEmail)) {
    throw "-AdminEmail is required with -BootstrapSuperAdmin."
  }
  $bootstrapPath = Join-Path $packageRoot "bootstrap_super_admin.deploy.sql"
  Write-Host "Running separate super_admin bootstrap for $AdminEmail"
  Invoke-Psql -Arguments @(
    "-v", "ON_ERROR_STOP=1",
    "-v", "admin_email=$AdminEmail",
    "-f", $bootstrapPath
  )
}
else {
  Write-Host "Administrator bootstrap was not requested and was not executed."
}
