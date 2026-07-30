# Dependency Governance

GGSP keeps its dependency footprint intentionally small. Dependency changes
must preserve application behavior unless a separately approved change says
otherwise.

## Supported toolchain

- Node.js: the exact major declared in `.nvmrc` and `package.json`
- Package manager: the npm version declared by `packageManager`
- Installation in CI and release workflows: `npm ci`

`package-lock.json` is required and must be committed whenever `package.json`
changes. A clean checkout must not use `npm install` in CI because that can
change the resolved dependency graph.

## Update rules

1. Security patches within the current framework major are preferred.
2. Framework-major, Supabase API, authentication, or database-client upgrades
   require explicit review and regression evidence.
3. New runtime dependencies require a documented product or architecture need.
4. Dependency changes must pass lint, type-check, build, and tests.
5. Critical advisories block release unless maintainers document why they are
   unreachable and approve a time-bounded exception.

External vulnerability-scanning or update services require repository-owner
approval because they receive dependency metadata. Until one is approved,
security review is performed deliberately during dependency-update work and
the result is recorded in the change summary.

## Routine verification

```text
npm ci
npm run lint
npm run typecheck
npm run build
```

Do not run automated forced upgrades against the authoritative branch. Review
the dependency graph and release notes first, then update the lockfile in a
dedicated change.
