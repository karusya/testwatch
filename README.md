# testwatch

Flaky-test intelligence for Playwright suites running in CI. testwatch pulls test
results from CI builds, scores every test for **flakiness** (0–100), and surfaces
the worst offenders in a dashboard — so you fix the genuinely flaky tests instead
of chasing the merely broken ones.

> Full-stack TypeScript monorepo: Fastify API + React dashboard, with a
> Jenkins data source and a credential-free mock mode for local runs.

## Why flakiness ≠ failure

A test that fails on every run is **broken** — you already know to fix it. A test
that flips pass → fail → pass at random is **flaky** — it erodes trust in the whole
suite and is much harder to catch. testwatch's score is designed to rank the flaky
one *above* the consistently-broken one:

```
score = round( (failRate * 0.5 + transitionRate * 0.5) * 100 )
```

- **failRate** — how often the test failed (a broken test scores here)
- **transitionRate** — how often it flipped result between consecutive runs (a flaky
  test scores here)

| Pattern across 6 runs         | Score | Reading                     |
| ----------------------------- | ----- | --------------------------- |
| pass-fail-pass-fail-pass-fail | 75    | constantly flipping — flaky |
| fail-fail-fail-fail-fail-fail | 50    | always fails — just broken  |
| pass-pass-pass-fail-fail-pass | 37    | a flaky stretch             |
| pass × 6                      | 0     | rock solid                  |

## Architecture

```
CI (Jenkins / mock)  →  Fastify API  →  React dashboard
                         │
                         ├─ jenkins.ts     fetch builds + test results
                         ├─ flakiness.ts   pivot build→test history, score 0–100
                         └─ projects.ts    multi-project registry (config-driven)
```

- **`packages/types`** — shared TypeScript types used by both API and web, so the
  two ends can never drift out of sync.
- **`apps/api`** — Fastify server. `GET /api/projects` and
  `GET /api/projects/:id/tests`.
- **`apps/web`** — Vite + React dashboard: project sidebar, per-project flaky-test
  table with color-coded score badges.

Multiple projects are added by editing `apps/api/src/projects.ts` — credentials are
referenced by env-var *name*, never stored in the config, so it's safe to commit.

## Running locally

Requires Node 22+ and pnpm.

```bash
pnpm install

# Terminal 1 — API (runs in mock mode if no Jenkins env vars are set)
PORT=3001 node --experimental-strip-types apps/api/src/index.ts

# Terminal 2 — dashboard
pnpm --filter @testwatch/web dev
```

Open http://localhost:5173. The dashboard ships with a **Demo (mock data)** project
so it works with zero configuration.

### Connecting real Jenkins

Add a project to `apps/api/src/projects.ts` and set the named env vars:

```ts
{
  id: 'web-e2e',
  name: 'Web E2E Tests',
  source: {
    type: 'jenkins',
    baseUrl: 'https://your-jenkins',
    jobName: 'web-e2e-tests',
    userEnv: 'JENKINS_USER',
    tokenEnv: 'JENKINS_WEB_TOKEN',
  },
}
```

## Roadmap

- [ ] Connect real Jenkins history
- [ ] ML model: predict next-run failure probability from test history
- [ ] Healer agent: AI-proposed fixes for flaky tests (Playwright + GitHub MCP)

## Stack

React · TypeScript · Fastify · Node.js · Vite · pnpm workspaces · Jenkins · Playwright
