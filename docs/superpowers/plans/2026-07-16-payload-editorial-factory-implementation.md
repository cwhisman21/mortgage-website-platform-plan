# Payload Editorial Factory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Payload backend in `apps/cms` that commissions 60 real consumer-focused mortgage stories daily, sends at least 50—including at least 5 opinions—to human review by 7:00 a.m. Eastern, and never auto-approves or auto-publishes.

**Architecture:** Payload is the backend, CMS, system of record, Admin review interface, access-control boundary, and durable job processor. PostgreSQL is Payload's database adapter. n8n calls narrow Payload endpoints at 4:00, 6:15, and 6:55 Eastern; Payload owns all long-running research and editorial work.

**Tech Stack:** Payload 3.x, Next.js App Router, TypeScript, PostgreSQL, Payload Jobs Queue, Lexical, Vitest, Testing Library, Playwright, pnpm, n8n HTTP Request and Schedule Trigger nodes.

## Global Constraints

- Create the backend at `apps/cms`; do not move or rewrite the existing static prototype.
- Payload is the only editorial system of record.
- Commission exactly 60 distinct real assignments per normal daily run, including exactly 6 opinion or analysis assignments.
- Reach at least 50 real `awaiting-approval` articles, including at least 5 opinions, by 7:00 a.m. `America/New_York` during the final pilot.
- Start with consumer questions; reject agency-announcement rewrites, mortgage-professional jargon, and duplicate borrower intent.
- Local stories require three local findings and a useful national comparison; national stories must explain market variation.
- Automation may not record human approval or publish.
- No secrets, provider keys, bearer tokens, or production webhook URLs enter Git.
- Use test-driven development: write and observe each failing test before production code.
- Real 10/30/60 article pilots are acceptance gates; deterministic fixtures may test infrastructure but do not replace those pilots.

---

## Planned file map

```text
apps/cms/
├── package.json, tsconfig.json, next.config.mjs, vitest.config.ts
├── src/payload.config.ts
├── src/app/(payload)/...
├── src/collections/{Users,Articles,EditorialRuns,StoryPackets}.ts
├── src/collections/{EditorialSources,EditorialClaims,EditorialReviews}.ts
├── src/collections/{ArticleRevisions,EditorialTopics,Authors}.ts
├── src/editorial/domain/{types,state-machine,scoring,portfolio,recovery,gates}.ts
├── src/editorial/jobs/{tasks,workflow,handlers}.ts
├── src/editorial/providers/{contracts,research,model}.ts
├── src/editorial/endpoints/{daily-plan,recovery-plan,run-stage,queue-review,status,retry-failures}.ts
├── src/editorial/admin/EditorialReviewPanel.tsx
├── src/editorial/testing/{fixtures,fake-providers}.ts
└── tests/{unit,integration,e2e}/...
n8n/daily-mortgage-editorial-factory.json
docs/operations/payload-editorial-factory.md
```

Each domain file remains framework-independent. Payload collections and endpoints adapt those functions; provider adapters perform external I/O; jobs coordinate stages without embedding editorial rules.

### Task 1: Scaffold the Payload application and test harness

**Files:**
- Create: `apps/cms/package.json`
- Create: `apps/cms/tsconfig.json`
- Create: `apps/cms/next.config.mjs`
- Create: `apps/cms/vitest.config.ts`
- Create: `apps/cms/src/payload.config.ts`
- Create: `apps/cms/src/app/(payload)/layout.tsx`
- Create: `apps/cms/src/app/(payload)/admin/[[...segments]]/page.tsx`
- Create: `apps/cms/src/app/(payload)/api/[...slug]/route.ts`
- Create: `apps/cms/tests/unit/config.test.ts`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: `DATABASE_URI`, `PAYLOAD_SECRET`, and `NEXT_PUBLIC_SERVER_URL` environment variables.
- Produces: `payloadConfig` and a runnable Payload Admin/API application.

- [ ] **Step 1: Write the failing configuration test**

```ts
import { describe, expect, it } from 'vitest'
import config from '../../src/payload.config'

describe('Payload configuration', () => {
  it('registers the editorial application with drafts and jobs enabled', async () => {
    const resolved = await config
    expect(resolved.collections?.map(({ slug }) => slug)).toContain('users')
    expect(resolved.jobs).toBeDefined()
  })
})
```

- [ ] **Step 2: Run the test and observe the expected failure**

Run: `corepack pnpm --dir apps/cms vitest run tests/unit/config.test.ts`  
Expected: FAIL because `apps/cms` and `payload.config.ts` do not exist.

- [ ] **Step 3: Scaffold the blank Payload application**

Run: `corepack pnpm dlx create-payload-app@latest apps/cms`  
Choose: blank template, PostgreSQL, pnpm, no example content. Preserve the generated Payload and Next.js versions in `apps/cms/package.json`; do not hand-edit them to older versions.

- [ ] **Step 4: Add Vitest and the minimal Payload configuration**

Run: `corepack pnpm --dir apps/cms add -D vitest @testing-library/react @testing-library/jest-dom jsdom`

Configure the PostgreSQL adapter, `users` auth collection, drafts, versions, and an empty jobs task list. Add `.env`, `.env.local`, `apps/cms/.env`, and provider credentials to `.gitignore`.

- [ ] **Step 5: Run validation**

Run: `corepack pnpm --dir apps/cms vitest run tests/unit/config.test.ts`  
Expected: PASS.  
Run: `corepack pnpm --dir apps/cms build`  
Expected: successful Payload/Next.js production build.

- [ ] **Step 6: Commit**

```bash
git add .gitignore apps/cms
git commit -m "feat: scaffold Payload editorial backend"
```

### Task 2: Add roles and human-only approval controls

**Files:**
- Create: `apps/cms/src/access/roles.ts`
- Create: `apps/cms/src/access/editorial.ts`
- Create: `apps/cms/src/collections/Users.ts`
- Create: `apps/cms/tests/unit/access.test.ts`
- Modify: `apps/cms/src/payload.config.ts`

**Interfaces:**
- Produces: `Role`, `hasRole(user, roles)`, `canApprove`, `canPublish`, and `isAutomation`.

- [ ] **Step 1: Write failing access tests**

```ts
import { describe, expect, it } from 'vitest'
import { canApprove, canPublish } from '../../src/access/editorial'

describe('editorial access', () => {
  it('prevents automation from approving or publishing', () => {
    const automation = { roles: ['automation'] }
    expect(canApprove(automation)).toBe(false)
    expect(canPublish(automation)).toBe(false)
  })

  it('allows only publishers to publish approved work', () => {
    expect(canPublish({ roles: ['editor'] })).toBe(false)
    expect(canPublish({ roles: ['publisher'] })).toBe(true)
  })
})
```

- [ ] **Step 2: Verify RED**

Run: `corepack pnpm --dir apps/cms vitest run tests/unit/access.test.ts`  
Expected: FAIL because the access module does not exist.

- [ ] **Step 3: Implement roles**

```ts
export type Role = 'automation' | 'editor' | 'compliance-reviewer' | 'publisher' | 'admin'
type Actor = { roles?: Role[] } | null | undefined
export const hasRole = (actor: Actor, roles: Role[]) =>
  Boolean(actor?.roles?.some((role) => roles.includes(role)))
export const canApprove = (actor: Actor) => hasRole(actor, ['editor', 'admin'])
export const canPublish = (actor: Actor) => hasRole(actor, ['publisher', 'admin'])
export const isAutomation = (actor: Actor) => hasRole(actor, ['automation'])
```

Add the required roles array to `Users` and register it in Payload.

- [ ] **Step 4: Verify GREEN and commit**

Run: `corepack pnpm --dir apps/cms vitest run tests/unit/access.test.ts`  
Expected: PASS.

```bash
git add apps/cms/src/access apps/cms/src/collections/Users.ts apps/cms/src/payload.config.ts apps/cms/tests/unit/access.test.ts
git commit -m "feat: enforce editorial user roles"
```

### Task 3: Define the editorial domain and state machine

**Files:**
- Create: `apps/cms/src/editorial/domain/types.ts`
- Create: `apps/cms/src/editorial/domain/state-machine.ts`
- Create: `apps/cms/tests/unit/state-machine.test.ts`

**Interfaces:**
- Produces: `EditorialStatus`, `EditorialMode`, `Stage`, `assertTransition(from, to, actor)`.

- [ ] **Step 1: Write failing transition tests**

```ts
import { describe, expect, it } from 'vitest'
import { assertTransition } from '../../src/editorial/domain/state-machine'

describe('editorial state machine', () => {
  it('allows the next automated stage', () => {
    expect(() => assertTransition('commissioned', 'mortgage-contract', 'automation')).not.toThrow()
  })

  it('rejects skipped stages and automated approval', () => {
    expect(() => assertTransition('commissioned', 'drafting', 'automation')).toThrow('Invalid transition')
    expect(() => assertTransition('awaiting-approval', 'approved', 'automation')).toThrow('Human approval required')
  })
})
```

- [ ] **Step 2: Verify RED**

Run: `corepack pnpm --dir apps/cms vitest run tests/unit/state-machine.test.ts`  
Expected: FAIL because the state machine does not exist.

- [ ] **Step 3: Implement explicit transitions**

Define the ordered lifecycle from the design plus `blocked`, `approved`, and `published`. Permit `awaiting-approval → approved` only for an editor/admin and `approved → published` only for a publisher/admin. Permit bounded revision transitions from developmental review back to drafting.

- [ ] **Step 4: Verify GREEN and commit**

Run: `corepack pnpm --dir apps/cms vitest run tests/unit/state-machine.test.ts`  
Expected: PASS.

```bash
git add apps/cms/src/editorial/domain apps/cms/tests/unit/state-machine.test.ts
git commit -m "feat: add editorial state machine"
```

### Task 4: Create Payload editorial collections

**Files:**
- Create: `apps/cms/src/collections/Articles.ts`
- Create: `apps/cms/src/collections/EditorialRuns.ts`
- Create: `apps/cms/src/collections/StoryPackets.ts`
- Create: `apps/cms/src/collections/EditorialSources.ts`
- Create: `apps/cms/src/collections/EditorialClaims.ts`
- Create: `apps/cms/src/collections/EditorialReviews.ts`
- Create: `apps/cms/src/collections/ArticleRevisions.ts`
- Create: `apps/cms/src/collections/EditorialTopics.ts`
- Create: `apps/cms/src/collections/Authors.ts`
- Create: `apps/cms/tests/integration/collections.test.ts`
- Modify: `apps/cms/src/payload.config.ts`

**Interfaces:**
- Produces: registered Payload collections matching the approved schema and typed relationships.

- [ ] **Step 1: Write the failing collection-schema test**

```ts
import config from '../../src/payload.config'
import { expect, it } from 'vitest'

it('registers every editorial collection', async () => {
  const resolved = await config
  const slugs = resolved.collections?.map(({ slug }) => slug)
  expect(slugs).toEqual(expect.arrayContaining([
    'articles', 'editorial-runs', 'story-packets', 'editorial-sources',
    'editorial-claims', 'editorial-reviews', 'article-revisions',
    'editorial-topics', 'authors',
  ]))
})
```

- [ ] **Step 2: Verify RED**

Run: `corepack pnpm --dir apps/cms vitest run tests/integration/collections.test.ts`  
Expected: FAIL with missing collection slugs.

- [ ] **Step 3: Implement focused collection files**

Add the exact fields from the design. Enable drafts and versions on `articles`; make article revisions append-only; store opinion thesis, disclosure, counterargument, evidence boundary, and author relationship; index run date, status, editorial mode, slug, and story ID. Add `beforeChange` hooks that call the state machine and reject approval/publishing by automation.

- [ ] **Step 4: Generate Payload types and verify**

Run: `corepack pnpm --dir apps/cms payload generate:types`  
Expected: updated generated types without errors.  
Run: `corepack pnpm --dir apps/cms vitest run tests/integration/collections.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/cms/src/collections apps/cms/src/payload.config.ts apps/cms/src/payload-types.ts apps/cms/tests/integration/collections.test.ts
git commit -m "feat: add Payload editorial collections"
```

### Task 5: Implement consumer-interest scoring and portfolio quotas

**Files:**
- Create: `apps/cms/src/editorial/domain/scoring.ts`
- Create: `apps/cms/src/editorial/domain/portfolio.ts`
- Create: `apps/cms/tests/unit/scoring.test.ts`
- Create: `apps/cms/tests/unit/portfolio.test.ts`

**Interfaces:**
- Produces: `scoreCandidate(candidate): number`, `selectDailyPortfolio(candidates): Candidate[]`.

- [ ] **Step 1: Write failing scoring and quota tests**

```ts
it('weights consumer consequence most heavily', () => {
  expect(scoreCandidate({ consumerConsequence: 10, timeliness: 0, nationalRelevance: 0, localSpecificity: 0, evidenceAvailability: 0, novelty: 0 })).toBe(3)
})

it('selects 60 stories with exactly six opinions and the approved class mix', () => {
  const result = selectDailyPortfolio(makeEligibleCandidates(100))
  expect(result).toHaveLength(60)
  expect(result.filter((item) => item.editorialMode === 'opinion' || item.editorialMode === 'analysis')).toHaveLength(6)
  expect(countByClass(result)).toEqual({ national: 14, nationalLocal: 18, localNational: 14, evergreen: 8, opinion: 6 })
})
```

- [ ] **Step 2: Verify RED**

Run: `corepack pnpm --dir apps/cms vitest run tests/unit/scoring.test.ts tests/unit/portfolio.test.ts`  
Expected: FAIL because scoring and selection do not exist.

- [ ] **Step 3: Implement deterministic scoring and selection**

Use weights `0.30, 0.20, 0.15, 0.15, 0.10, 0.10`. Reject candidates without a consumer question, evidence plan, distinct-intent disposition, national/local relevance, or—when local—three local finding targets plus a national comparison target. Sort deterministically by score then stable candidate ID and fill the exact class quotas.

- [ ] **Step 4: Verify GREEN and commit**

Run: `corepack pnpm --dir apps/cms vitest run tests/unit/scoring.test.ts tests/unit/portfolio.test.ts`  
Expected: PASS.

```bash
git add apps/cms/src/editorial/domain/scoring.ts apps/cms/src/editorial/domain/portfolio.ts apps/cms/tests/unit/scoring.test.ts apps/cms/tests/unit/portfolio.test.ts
git commit -m "feat: select consumer-focused daily portfolio"
```

### Task 6: Implement recovery calculations

**Files:**
- Create: `apps/cms/src/editorial/domain/recovery.ts`
- Create: `apps/cms/tests/unit/recovery.test.ts`

**Interfaces:**
- Produces: `calculateRecovery({ ready, readyOpinions, active, activeOpinions }): RecoveryRequest`.

- [ ] **Step 1: Write failing deficit tests**

```ts
it('protects total and opinion targets without duplicating active work', () => {
  expect(calculateRecovery({ ready: 42, readyOpinions: 3, active: 4, activeOpinions: 1 })).toEqual({
    totalReplacements: 4,
    opinionReplacements: 1,
  })
})
```

- [ ] **Step 2: Verify RED**

Run: `corepack pnpm --dir apps/cms vitest run tests/unit/recovery.test.ts`  
Expected: FAIL because `calculateRecovery` does not exist.

- [ ] **Step 3: Implement recovery math**

Calculate remaining total and opinion deficits after counting ready plus still-healthy active jobs. Opinion replacements count toward the total; never return a negative count. Keep the buffer policy in the endpoint configuration so the pure domain function remains auditable.

- [ ] **Step 4: Verify GREEN and commit**

Run: `corepack pnpm --dir apps/cms vitest run tests/unit/recovery.test.ts`  
Expected: PASS.

```bash
git add apps/cms/src/editorial/domain/recovery.ts apps/cms/tests/unit/recovery.test.ts
git commit -m "feat: calculate editorial recovery deficits"
```

### Task 7: Define provider contracts and guarded structured output

**Files:**
- Create: `apps/cms/src/editorial/providers/contracts.ts`
- Create: `apps/cms/src/editorial/providers/research.ts`
- Create: `apps/cms/src/editorial/providers/model.ts`
- Create: `apps/cms/src/editorial/testing/fake-providers.ts`
- Create: `apps/cms/tests/unit/providers.test.ts`

**Interfaces:**
- Produces: `ResearchProvider`, `EditorialModelProvider`, `ResearchPacket`, `StageResult`, and provider factories selected by environment.

- [ ] **Step 1: Write failing provider-contract tests**

```ts
it('rejects a research result with unsupported or fabricated source URLs', async () => {
  const provider = makeFakeResearchProvider({ sources: [{ url: 'not-a-url' }] })
  await expect(provider.research(validAssignment)).rejects.toThrow('Invalid source URL')
})

it('rejects stage output that omits the canonical story id', async () => {
  const provider = makeFakeModelProvider({ status: 'drafting' })
  await expect(provider.runStage('draft', validPacket)).rejects.toThrow('storyId')
})
```

- [ ] **Step 2: Verify RED**

Run: `corepack pnpm --dir apps/cms vitest run tests/unit/providers.test.ts`  
Expected: FAIL because provider contracts do not exist.

- [ ] **Step 3: Implement provider boundaries**

Validate every external response before use. Research output contains real URLs/internal IDs, retrieved dates, factual periods, geography, authority, limitations, supported claims, and consumer relevance. Model output contains the unchanged story ID, expected stage, verdict, canonical content changes, claim deltas, findings, and next action. Log provider/run identifiers but never secrets or full credential headers.

- [ ] **Step 4: Verify GREEN and commit**

Run: `corepack pnpm --dir apps/cms vitest run tests/unit/providers.test.ts`  
Expected: PASS.

```bash
git add apps/cms/src/editorial/providers apps/cms/src/editorial/testing apps/cms/tests/unit/providers.test.ts
git commit -m "feat: add guarded editorial provider contracts"
```

### Task 8: Implement review gates

**Files:**
- Create: `apps/cms/src/editorial/domain/gates.ts`
- Create: `apps/cms/tests/unit/gates.test.ts`

**Interfaces:**
- Produces: `evaluateReviewReadiness(packet): GateResult`.

- [ ] **Step 1: Write failing gate tests**

```ts
it('blocks unresolved evidence and high-risk compliance findings', () => {
  const result = evaluateReviewReadiness(packetWith({
    claims: [{ state: 'unsupported' }],
    complianceFindings: [{ severity: 'high', resolved: false }],
  }))
  expect(result.ready).toBe(false)
  expect(result.reasons).toEqual(expect.arrayContaining(['unsupported-claim', 'unresolved-high-risk']))
})

it('requires 17/20 and completed duplicate-intent review', () => {
  expect(evaluateReviewReadiness(packetWith({ mortgageScore: 16 })).ready).toBe(false)
  expect(evaluateReviewReadiness(packetWith({ competingPageReview: null })).ready).toBe(false)
})
```

- [ ] **Step 2: Verify RED**

Run: `corepack pnpm --dir apps/cms vitest run tests/unit/gates.test.ts`  
Expected: FAIL because the gate evaluator does not exist.

- [ ] **Step 3: Implement all deterministic gates**

Require passing developmental and fact/copy verdicts, mortgage score at least 17, completed competing-page dispositions, no unresolved data markers, no unsupported material claims, no unresolved high-risk compliance findings, required national/local framing, opinion fields when applicable, sources, disclosures, and internal relationships.

- [ ] **Step 4: Verify GREEN and commit**

Run: `corepack pnpm --dir apps/cms vitest run tests/unit/gates.test.ts`  
Expected: PASS.

```bash
git add apps/cms/src/editorial/domain/gates.ts apps/cms/tests/unit/gates.test.ts
git commit -m "feat: enforce editorial review gates"
```

### Task 9: Build Payload job tasks and stage orchestration

**Files:**
- Create: `apps/cms/src/editorial/jobs/tasks.ts`
- Create: `apps/cms/src/editorial/jobs/handlers.ts`
- Create: `apps/cms/src/editorial/jobs/workflow.ts`
- Create: `apps/cms/tests/integration/jobs.test.ts`
- Modify: `apps/cms/src/payload.config.ts`

**Interfaces:**
- Produces: Payload tasks `commissionRun`, `runEditorialStage`, `recoverRun`, and `auditRun`; `enqueueNextStage(payload, storyId)`.

- [ ] **Step 1: Write failing idempotency and ordering tests**

```ts
it('does not execute the same story stage twice', async () => {
  await runEditorialStage(ctx, { storyId: 'story-1', stage: 'research', idempotencyKey: 'story-1:research' })
  await runEditorialStage(ctx, { storyId: 'story-1', stage: 'research', idempotencyKey: 'story-1:research' })
  expect(ctx.researchProvider.calls).toBe(1)
})

it('does not advance after malformed output', async () => {
  ctx.modelProvider.nextResult = { malformed: true }
  await expect(runEditorialStage(ctx, draftJob)).rejects.toThrow()
  expect(await currentStatus('story-1')).toBe('researching')
})
```

- [ ] **Step 2: Verify RED**

Run: `corepack pnpm --dir apps/cms vitest run tests/integration/jobs.test.ts`  
Expected: FAIL because job tasks do not exist.

- [ ] **Step 3: Implement durable tasks**

Register Payload task definitions with bounded retries and idempotency keys. Persist stage execution records before provider calls, validate output, append immutable revision/review evidence, transition state, then enqueue the next stage. Limit developmental revision to two cycles. Send exhausted work to a queryable dead-letter state.

- [ ] **Step 4: Verify GREEN and commit**

Run: `corepack pnpm --dir apps/cms vitest run tests/integration/jobs.test.ts`  
Expected: PASS.

```bash
git add apps/cms/src/editorial/jobs apps/cms/src/payload.config.ts apps/cms/tests/integration/jobs.test.ts
git commit -m "feat: orchestrate editorial jobs in Payload"
```

### Task 10: Add Payload editorial endpoints

**Files:**
- Create: `apps/cms/src/editorial/endpoints/daily-plan.ts`
- Create: `apps/cms/src/editorial/endpoints/recovery-plan.ts`
- Create: `apps/cms/src/editorial/endpoints/run-stage.ts`
- Create: `apps/cms/src/editorial/endpoints/queue-review.ts`
- Create: `apps/cms/src/editorial/endpoints/status.ts`
- Create: `apps/cms/src/editorial/endpoints/retry-failures.ts`
- Create: `apps/cms/src/editorial/endpoints/index.ts`
- Create: `apps/cms/tests/integration/endpoints.test.ts`
- Modify: `apps/cms/src/payload.config.ts`

**Interfaces:**
- Produces the six approved `/api/editorial/...` HTTP contracts.

- [ ] **Step 1: Write failing endpoint tests**

```ts
it('creates one run with 60 assignments and six opinions', async () => {
  const response = await request(app).post('/api/editorial/daily-plan').set(automationAuth)
  expect(response.status).toBe(202)
  expect(response.body).toMatchObject({ commissioned: 60, opinions: 6 })
})

it('rejects queue-review when a deterministic gate fails', async () => {
  const response = await request(app).post('/api/editorial/articles/blocked-story/queue-review').set(automationAuth)
  expect(response.status).toBe(422)
  expect(response.body.reasons).toContain('unsupported-claim')
})
```

- [ ] **Step 2: Verify RED**

Run: `corepack pnpm --dir apps/cms vitest run tests/integration/endpoints.test.ts`  
Expected: FAIL with missing endpoints.

- [ ] **Step 3: Implement authenticated endpoints**

Use Payload custom endpoints and Local API calls. Daily-plan creates one Eastern-date run and queues commissioning. Recovery reads ready and healthy-active counts, calculates both deficits, and queues distinct replacements. Run-stage validates expected status. Queue-review calls the deterministic gate evaluator. Status returns counts and deadline state. Retry-failures only retries failures classified as transient.

- [ ] **Step 4: Verify GREEN and commit**

Run: `corepack pnpm --dir apps/cms vitest run tests/integration/endpoints.test.ts`  
Expected: PASS.

```bash
git add apps/cms/src/editorial/endpoints apps/cms/src/payload.config.ts apps/cms/tests/integration/endpoints.test.ts
git commit -m "feat: expose Payload editorial automation API"
```

### Task 11: Build the Payload Admin review panel

**Files:**
- Create: `apps/cms/src/editorial/admin/EditorialReviewPanel.tsx`
- Create: `apps/cms/src/editorial/admin/editorial-review.css`
- Create: `apps/cms/tests/unit/EditorialReviewPanel.test.tsx`
- Modify: `apps/cms/src/collections/Articles.ts`

**Interfaces:**
- Produces: an article Admin view showing preview, evidence, relevance, revisions, reviews, and role-controlled actions.

- [ ] **Step 1: Write failing UI tests**

```tsx
it('shows evidence and withholds publish from editors', () => {
  render(<EditorialReviewPanel article={reviewReadyArticle} actor={{ roles: ['editor'] }} />)
  expect(screen.getByText('Why readers care')).toBeVisible()
  expect(screen.getByText('Sources and claims')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Approve' })).toBeEnabled()
  expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Verify RED**

Run: `corepack pnpm --dir apps/cms vitest run tests/unit/EditorialReviewPanel.test.tsx`  
Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the review view**

Render the canonical preview; why-readers-care; national/local comparison; claims with adjacent sources; revisions; developmental, fact/copy, mortgage, and compliance findings; relationships; and role-controlled return, block, approve, and publish actions. Use Payload's component registration path from the generated application.

- [ ] **Step 4: Verify GREEN and commit**

Run: `corepack pnpm --dir apps/cms vitest run tests/unit/EditorialReviewPanel.test.tsx`  
Expected: PASS.

```bash
git add apps/cms/src/editorial/admin apps/cms/src/collections/Articles.ts apps/cms/tests/unit/EditorialReviewPanel.test.tsx
git commit -m "feat: add Payload editorial review panel"
```

### Task 12: Rewire and validate the n8n workflow

**Files:**
- Modify: `n8n/daily-mortgage-editorial-factory.json`
- Modify: `docs/24-n8n-daily-editorial-factory.md`
- Create: `apps/cms/tests/integration/n8n-contract.test.ts`

**Interfaces:**
- Consumes: Payload endpoints from Task 10.
- Produces: three short n8n executions that enqueue, recover, and audit Payload work.

- [ ] **Step 1: Write the failing contract test**

```ts
it('uses only Payload orchestration endpoints', async () => {
  const workflow = await readWorkflow('../../../../n8n/daily-mortgage-editorial-factory.json')
  const urls = httpRequestUrls(workflow)
  expect(urls).toEqual(expect.arrayContaining([
    expect.stringContaining('/api/editorial/daily-plan'),
    expect.stringContaining('/api/editorial/recovery-plan'),
    expect.stringContaining('/api/editorial/runs/'),
  ]))
  expect(urls.some((url) => url.includes('/v1/stages/'))).toBe(false)
})
```

- [ ] **Step 2: Verify RED**

Run: `corepack pnpm --dir apps/cms vitest run tests/integration/n8n-contract.test.ts`  
Expected: FAIL because the workflow still calls the provider-neutral stage gateway.

- [ ] **Step 3: Update the workflow**

Use `PAYLOAD_EDITORIAL_URL`, one Header Auth credential, and three paths: daily plan at 4:00, recovery plan at 6:15, and dated status at 6:55. Remove per-article stage HTTP nodes; Payload jobs own them. Preserve `America/New_York`, retries, inactive export state, and the alert webhook.

- [ ] **Step 4: Validate workflow and tests**

Run: `corepack pnpm --dir apps/cms vitest run tests/integration/n8n-contract.test.ts`  
Expected: PASS.  
Run: `C:\Users\caleb\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe "C:\Users\caleb\OneDrive\Documents\General Agent Tasks\.agents\skills\n8n-workflow\scripts\validate_workflow.py" n8n/daily-mortgage-editorial-factory.json`  
Expected: `OK`; the documented multi-trigger warning is acceptable.

- [ ] **Step 5: Commit**

```bash
git add n8n/daily-mortgage-editorial-factory.json docs/24-n8n-daily-editorial-factory.md apps/cms/tests/integration/n8n-contract.test.ts
git commit -m "feat: connect n8n to Payload editorial jobs"
```

### Task 13: Add operational documentation and end-to-end permission checks

**Files:**
- Create: `docs/operations/payload-editorial-factory.md`
- Create: `apps/cms/tests/e2e/editorial-review.spec.ts`

**Interfaces:**
- Produces: deployment, credential, recovery, approval, and incident runbook.

- [ ] **Step 1: Write the failing browser test**

```ts
test('automation cannot approve and an editor cannot publish', async ({ page }) => {
  await loginAs(page, 'automation')
  await page.goto('/admin/collections/articles/review-ready-id')
  await expect(page.getByRole('button', { name: 'Approve' })).toBeHidden()
  await loginAs(page, 'editor')
  await expect(page.getByRole('button', { name: 'Publish' })).toBeHidden()
})
```

- [ ] **Step 2: Verify RED**

Run: `corepack pnpm --dir apps/cms playwright test tests/e2e/editorial-review.spec.ts`  
Expected: FAIL until seeded role fixtures and Admin controls are wired.

- [ ] **Step 3: Add the runbook and test seed**

Document environment variables, Postgres migration procedure, Payload worker execution, n8n credential setup, provider rate limits, dead-letter triage, 6:15 recovery, 6:55 alert interpretation, approval roles, rollback, and secret rotation. Add deterministic accounts and one review-ready record only to the isolated test database.

- [ ] **Step 4: Verify GREEN and commit**

Run: `corepack pnpm --dir apps/cms playwright test tests/e2e/editorial-review.spec.ts`  
Expected: PASS.

```bash
git add docs/operations/payload-editorial-factory.md apps/cms/tests/e2e/editorial-review.spec.ts
git commit -m "docs: add editorial factory operations runbook"
```

### Task 14: Run the 10-real-article pilot

**Files:**
- Create: `docs/pilots/editorial-pilot-10.md`
- Modify only through Payload: real `editorialRuns`, articles, sources, claims, revisions, and reviews.

**Interfaces:**
- Produces: evidence on source quality, consumer usefulness, state transitions, review usability, duration, and cost.

- [ ] **Step 1: Create a real ten-story run**

Call `POST /api/editorial/daily-plan` with an authorized pilot override of `requestedCount: 10` and `opinionCount: 1`. The override must be restricted to admins and non-scheduled pilot runs.

- [ ] **Step 2: Observe the real pipeline**

Confirm every topic is current, distinct, and consumer-led; inspect live source URLs; verify local stories include three local findings and a national comparison; verify the opinion has a real approved author/voice and disclosure.

- [ ] **Step 3: Complete human review without publishing**

Editors return deficient stories through Payload rather than editing database rows. Record ready, blocked, and failed counts, elapsed time, model/research cost, repeated failure causes, and reviewer minutes per article.

- [ ] **Step 4: Record and commit the pilot report**

The report lists every story ID and title, result, evidence issues, compliance issues, duration, cost, and concrete configuration changes. It contains no provider secret or unpublished sensitive data.

```bash
git add docs/pilots/editorial-pilot-10.md
git commit -m "test: report ten-article editorial pilot"
```

### Task 15: Run the 30-real-article pilot

**Files:**
- Create: `docs/pilots/editorial-pilot-30.md`
- Modify: configuration files only when the ten-article evidence justifies a named change.

**Interfaces:**
- Produces: verified concurrency, recovery, class mix, opinion quota, reviewer workload, and cost envelope.

- [ ] **Step 1: Run 30 real assignments with three opinions**

Use live research and the actual providers. Keep all output unpublished. Trigger at the intended 4:00 a.m. Eastern time in a controlled pilot environment.

- [ ] **Step 2: Exercise recovery**

Allow real failures to follow normal retry policy. At 6:15, call recovery and verify it preserves both the total and opinion target ratio without duplicating an active or completed borrower intent.

- [ ] **Step 3: Review all passing work**

Record stage duration percentiles, provider throttling, ready/blocked/failed counts, opinion count, duplicate rejections, reviewer minutes, estimated daily cost, and editorial quality findings.

- [ ] **Step 4: Commit evidence and justified tuning**

```bash
git add docs/pilots/editorial-pilot-30.md apps/cms n8n/daily-mortgage-editorial-factory.json
git commit -m "test: report thirty-article editorial pilot"
```

Do not include unrelated generated or user-modified files in this commit.

### Task 16: Run the 60-real-article acceptance pilot

**Files:**
- Create: `docs/pilots/editorial-pilot-60.md`
- Modify: `docs/operations/payload-editorial-factory.md` with measured production settings.

**Interfaces:**
- Produces: final acceptance evidence for activation.

- [ ] **Step 1: Execute the production-shaped run**

At 4:00 a.m. Eastern, commission 60 distinct real assignments with the exact `14/18/14/8/6` class mix. Use production-shaped Postgres, Payload workers, providers, and n8n scheduling. Keep publishing disabled.

- [ ] **Step 2: Execute timed recovery and audit**

At 6:15, recover total and opinion deficits. At 6:55, record the ready count, opinion-ready count, active count, blocked count, failed count, and dead-letter count.

- [ ] **Step 3: Evaluate acceptance at 7:00**

Pass only when at least 50 real articles and at least 5 opinions are `awaiting-approval`, all passing articles satisfy deterministic gates, no automated approval/publication occurred, and every material claim retains evidence and limitations.

- [ ] **Step 4: Record measured settings and decision**

Document concurrency, retry limits, stage duration percentiles, total cost, reviewer workload, failure distribution, opinion outcomes, and either `activate` or `do-not-activate` with reasons. A failed pilot results in another evidence-driven pilot; it does not weaken gates.

- [ ] **Step 5: Run the complete automated suite**

Run: `corepack pnpm --dir apps/cms vitest run`  
Expected: all unit and integration tests PASS.  
Run: `corepack pnpm --dir apps/cms playwright test`  
Expected: all e2e tests PASS.  
Run: `corepack pnpm --dir apps/cms build`  
Expected: production build succeeds without warnings that affect execution.

- [ ] **Step 6: Commit the acceptance record**

```bash
git add docs/pilots/editorial-pilot-60.md docs/operations/payload-editorial-factory.md
git commit -m "test: record editorial factory acceptance pilot"
```

## Final activation checklist

- [ ] Payload migrations are applied to the production database through the approved deployment process.
- [ ] Payload API, worker, and n8n use separate least-privilege credentials.
- [ ] Provider and alert secrets exist only in the deployment secret store and n8n credentials.
- [ ] The Admin review screen is usable by editors and compliance reviewers.
- [ ] Automation cannot approve or publish in API, hooks, jobs, or Admin UI.
- [ ] The 60-real-article pilot passed 50-ready and 5-opinion thresholds by 7:00 a.m. Eastern.
- [ ] The workflow remains inactive until an authorized operator records the activation decision.
