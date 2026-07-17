# Payload n8n Pet Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build importable n8n Cloud workflows that synchronize published Payload content to a vector index, answer grounded website questions, and run deterministic prequal, compare, and sell conversations.

**Architecture:** The website backend is the trust boundary and calls three n8n webhook workflows: content indexing, guide-mode chat, and guided journeys. n8n uses credential-backed HTTP adapters for Payload, the vector database, embeddings, the LLM, and checkpoint persistence; an error workflow and scheduled reconciliation provide operational recovery.

**Tech Stack:** n8n Cloud, Payload CMS REST API and collection hooks, JSON Schema Draft 2020-12, provider-neutral HTTP APIs for embeddings/vector search/LLM, Node.js built-in test runner, Python n8n workflow validator.

## Global Constraints

- The frontend/backend contracts in `docs/superpowers/specs/2026-07-16-payload-n8n-pet-chat-design.md` are authoritative.
- The website backend owns authentication, request signing, rate limiting, sensitive-data controls, journey persistence, and action validation.
- n8n orchestrates and never becomes the authoritative customer database.
- Only explicitly approved, published Payload fields may enter embeddings.
- The LLM may interpret and phrase answers; deterministic code selects fields, validates answers, advances progress, and writes checkpoints.
- Every webhook request carries `requestId`, `sessionId`, and a backend-generated correlation ID.
- Every externally visible action must belong to the action allowlist.
- Invalid requests stop before vector, LLM, or persistence calls.
- Failed or invalid model output never advances journey state.
- Importable workflows contain credential references and configuration keys, never secrets or production samples.
- Build against the current n8n Cloud node versions visible in the target workspace. Before committing JSON, import a minimal Webhook, Respond to Webhook, HTTP Request, Code, If, Switch, Schedule Trigger, Execute Workflow, and Error Trigger workflow from that workspace and copy its exact `typeVersion` values.
- Direct n8n MCP access is unavailable in the planning session. The first execution step must reconnect it or export the node-version probe manually from n8n Cloud.

## Planned File Structure

```text
automation/n8n/
  README.md                              setup, credentials, import order, and smoke tests
  contracts/
    chat-request.schema.json             inbound guide/journey request
    chat-response.schema.json            outbound response and action allowlist
    payload-index-event.schema.json      Payload hook event
    journey-schema.schema.json           declarative journey definition
  fixtures/
    chat-request-guide.json
    chat-request-journey.json
    payload-index-event.json
    payload-public-record.json
    journey-prequal.json
    journey-compare.json
    journey-sell.json
  lib/
    contract-validation.mjs              test-side JSON Schema validation helpers
    journey-engine.mjs                   deterministic next-field and progress logic
    payload-normalization.mjs            public projection, chunks, hashes, metadata
  tests/
    contracts.test.mjs
    payload-normalization.test.mjs
    journey-engine.test.mjs
    workflow-graphs.test.mjs
  workflows/
    00-node-version-probe.json
    01-payload-content-indexer.json
    02-payload-index-reconciliation.json
    03-pet-chat-orchestrator.json
    04-guided-journey-orchestrator.json
    05-pet-chat-error-handler.json
```

The `lib` modules are executable specifications for deterministic Code-node logic. Workflow Code nodes copy these small functions verbatim because n8n Cloud cannot import repository modules at runtime. Tests prevent the copies from drifting by comparing normalized function bodies stored in workflow parameters.

---

### Task 1: Capture the n8n Cloud Node Surface and Repository Harness

**Files:**
- Create: `automation/n8n/workflows/00-node-version-probe.json`
- Create: `automation/n8n/tests/workflow-graphs.test.mjs`
- Create: `automation/n8n/README.md`

**Interfaces:**
- Consumes: A workflow exported from the target n8n Cloud workspace.
- Produces: `assertWorkflowGraph(workflow, expectations)` and authoritative node `typeVersion` examples for all later workflow JSON.

- [ ] **Step 1: Create and export the node-version probe in n8n Cloud**

Create a disabled workflow named `Pet Chat - Node Version Probe` containing these disconnected nodes: Manual Trigger, Webhook, Respond to Webhook, HTTP Request, Code, If, Switch, Schedule Trigger, Execute Workflow, and Error Trigger. Export it as JSON to `automation/n8n/workflows/00-node-version-probe.json`.

Run:

```powershell
python "C:\Users\caleb\OneDrive\Documents\General Agent Tasks\.agents\skills\n8n-workflow\scripts\validate_workflow.py" automation/n8n/workflows/00-node-version-probe.json --strict
```

Expected: `PASS` with no missing-node or connection-target errors. Disconnected-node warnings are acceptable only for this probe; if strict mode rejects them, rerun without `--strict` and confirm they are the only warnings.

- [ ] **Step 2: Write the failing workflow graph test**

Create `automation/n8n/tests/workflow-graphs.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

export async function readWorkflow(name) {
  return JSON.parse(await readFile(new URL(`../workflows/${name}`, import.meta.url), "utf8"));
}

export function assertWorkflowGraph(workflow, { names, edges = [] }) {
  const nodeNames = new Set(workflow.nodes.map((node) => node.name));
  assert.equal(nodeNames.size, workflow.nodes.length, "node names must be unique");
  for (const name of names) assert.ok(nodeNames.has(name), `missing node: ${name}`);
  for (const [source, target] of edges) {
    const outputs = workflow.connections[source]?.main ?? [];
    const targets = outputs.flat().map((connection) => connection.node);
    assert.ok(targets.includes(target), `missing edge: ${source} -> ${target}`);
  }
}

test("node-version probe contains the required Cloud nodes", async () => {
  const workflow = await readWorkflow("00-node-version-probe.json");
  assertWorkflowGraph(workflow, {
    names: [
      "Manual Trigger", "Webhook", "Respond to Webhook", "HTTP Request",
      "Code", "If", "Switch", "Schedule Trigger", "Execute Workflow", "Error Trigger",
    ],
  });
});
```

- [ ] **Step 3: Run the graph test and verify the probe names fail until normalized**

Run: `node --test automation/n8n/tests/workflow-graphs.test.mjs`

Expected: FAIL if exported node names differ from the required stable names.

- [ ] **Step 4: Rename probe nodes in n8n Cloud, re-export, and pass the test**

Run: `node --test automation/n8n/tests/workflow-graphs.test.mjs`

Expected: PASS.

- [ ] **Step 5: Document n8n Cloud setup**

Create `automation/n8n/README.md` with these exact sections:

```markdown
# Pet Chat n8n Workflows

## Import Order
1. `05-pet-chat-error-handler.json`
2. `01-payload-content-indexer.json`
3. `02-payload-index-reconciliation.json`
4. `04-guided-journey-orchestrator.json`
5. `03-pet-chat-orchestrator.json`

## Credential Names
- `Pet Chat - Backend HMAC`
- `Pet Chat - Payload Service`
- `Pet Chat - Vector API`
- `Pet Chat - Embeddings API`
- `Pet Chat - LLM API`
- `Pet Chat - Operations Webhook`

## Activation Rule
Import workflows disabled. Attach the named credentials, set the documented configuration keys for the target environment, run fixture smoke tests, assign the error workflow, and only then activate production webhooks.
```

- [ ] **Step 6: Commit**

```powershell
git add automation/n8n/workflows/00-node-version-probe.json automation/n8n/tests/workflow-graphs.test.mjs automation/n8n/README.md
git commit -m "test: establish n8n Cloud workflow harness"
```

---

### Task 2: Define and Test Workflow Contracts

**Files:**
- Create: `automation/n8n/contracts/chat-request.schema.json`
- Create: `automation/n8n/contracts/chat-response.schema.json`
- Create: `automation/n8n/contracts/payload-index-event.schema.json`
- Create: `automation/n8n/contracts/journey-schema.schema.json`
- Create: `automation/n8n/fixtures/chat-request-guide.json`
- Create: `automation/n8n/fixtures/chat-request-journey.json`
- Create: `automation/n8n/fixtures/payload-index-event.json`
- Create: `automation/n8n/fixtures/journey-prequal.json`
- Create: `automation/n8n/fixtures/journey-compare.json`
- Create: `automation/n8n/fixtures/journey-sell.json`
- Create: `automation/n8n/lib/contract-validation.mjs`
- Create: `automation/n8n/tests/contracts.test.mjs`

**Interfaces:**
- Consumes: Contracts in the approved design spec.
- Produces: `validateSchema(schema, value): string[]` and four JSON schemas used by backend and workflow validation.

- [ ] **Step 1: Write the failing contract tests**

Create `automation/n8n/tests/contracts.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateSchema } from "../lib/contract-validation.mjs";

const load = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));

test("guide request fixture satisfies the closed request contract", async () => {
  assert.deepEqual(validateSchema(await load("../contracts/chat-request.schema.json"), await load("../fixtures/chat-request-guide.json")), []);
});

test("request rejects unknown properties", async () => {
  const schema = await load("../contracts/chat-request.schema.json");
  const fixture = await load("../fixtures/chat-request-guide.json");
  assert.match(validateSchema(schema, { ...fixture, rawPrompt: "no" }).join("\n"), /rawPrompt/);
});

test("response action type is allowlisted", async () => {
  const schema = await load("../contracts/chat-response.schema.json");
  const errors = validateSchema(schema, {
    message: "Continue",
    citations: [],
    intent: "compare",
    mode: "journey",
    actions: [{ type: "run_javascript" }],
    correlationId: "corr_test_12345678",
  });
  assert.match(errors.join("\n"), /run_javascript/);
});
```

- [ ] **Step 2: Run tests to verify missing modules fail**

Run: `node --test automation/n8n/tests/contracts.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement the dependency-free schema subset validator**

Create `automation/n8n/lib/contract-validation.mjs` implementing recursive validation for the exact schema keywords used here: `type`, `required`, `properties`, `additionalProperties`, `enum`, `const`, `minLength`, `maxLength`, `minimum`, `maximum`, `items`, `minItems`, `maxItems`, `oneOf`, and `$ref` to local `#/$defs/*` definitions. Export only:

```js
export function validateSchema(schema, value) {
  const errors = [];
  visit(schema, value, "$", schema, errors);
  return errors;
}
```

Each error string must contain the JSON path and failed keyword. Do not coerce values.

- [ ] **Step 4: Create the four closed schemas and synthetic fixtures**

Use these exact limits in `chat-request.schema.json`:

- `requestId`, `sessionId`, and `correlationId`: strings, 8–128 characters.
- `message`: string, 1–4,000 characters.
- `page.route`: string, 1–500 characters.
- `signals`: at most 10 enum values.
- `conversationSummary`: at most 4,000 characters.
- All objects: `additionalProperties: false`.

Use this exact action enum in `chat-response.schema.json`:

```json
["show_choices", "show_field", "show_review", "open_internal_route", "resume_journey", "start_account_transition", "offer_human_help"]
```

Use Payload event operations `publish`, `update`, `unpublish`, and `delete`. Require `collection`, `documentId`, `contentVersion`, `operation`, and `correlationId`.

Require journey fields `id`, `schemaVersion`, `type`, `fields`, `reviewOrder`, with field properties `id`, `dataType`, `required`, `prompt`, `explanation`, `conditions`, and `validation`.

Create one minimal but complete schema fixture for each journey type. Each fixture must include at least one unconditional required field, one conditional required field, one enum, one number with a bounded range, and a `reviewOrder` containing every field ID exactly once. Use synthetic labels and values only.

- [ ] **Step 5: Run contract tests**

Run: `node --test automation/n8n/tests/contracts.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add automation/n8n/contracts automation/n8n/fixtures automation/n8n/lib/contract-validation.mjs automation/n8n/tests/contracts.test.mjs
git commit -m "feat: define pet chat workflow contracts"
```

---

### Task 3: Implement Deterministic Payload Normalization

**Files:**
- Create: `automation/n8n/fixtures/payload-public-record.json`
- Create: `automation/n8n/lib/payload-normalization.mjs`
- Create: `automation/n8n/tests/payload-normalization.test.mjs`

**Interfaces:**
- Consumes: A public Payload projection `{ id, collection, version, status, title, canonicalUrl, sections, metadata }`.
- Produces: `normalizePayloadRecord(record): VectorChunk[]` and `contentHash(text): string`.

- [ ] **Step 1: Write the failing normalization tests**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { normalizePayloadRecord } from "../lib/payload-normalization.mjs";

test("normalizes public sections into stable vector chunks", () => {
  const chunks = normalizePayloadRecord({
    id: "product-fha", collection: "loan-products", version: 7, status: "published",
    title: "FHA Loans", canonicalUrl: "/loan-options/fha",
    sections: [{ id: "overview", heading: "Overview", text: "FHA loans have program-specific requirements." }],
    metadata: { productIds: ["fha"], locationIds: [], reviewedAt: "2026-07-16" },
  });
  assert.equal(chunks[0].chunkId, "loan-products:product-fha:overview");
  assert.equal(chunks[0].metadata.status, "published");
  assert.match(chunks[0].contentHash, /^[a-f0-9]{64}$/);
});

test("rejects non-published content", () => {
  assert.throws(() => normalizePayloadRecord({ id: "x", status: "draft" }), /published/);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `node --test automation/n8n/tests/payload-normalization.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement normalization**

Create `automation/n8n/lib/payload-normalization.mjs` using `node:crypto` SHA-256. Normalize CRLF to LF, collapse runs of spaces, trim text, discard empty sections, cap each section at 8,000 characters, and emit:

```js
{
  documentId,
  collection,
  chunkId: `${collection}:${id}:${section.id}`,
  contentVersion: version,
  title,
  canonicalUrl,
  text: `${section.heading}\n\n${normalizedText}`,
  contentHash,
  metadata: { ...metadata, status: "published" }
}
```

Reject records with unknown top-level keys, non-published status, missing stable section IDs, or metadata keys outside `productIds`, `locationIds`, `state`, `city`, `topicIds`, `effectiveAt`, and `reviewedAt`.

- [ ] **Step 4: Run normalization tests**

Run: `node --test automation/n8n/tests/payload-normalization.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add automation/n8n/fixtures/payload-public-record.json automation/n8n/lib/payload-normalization.mjs automation/n8n/tests/payload-normalization.test.mjs
git commit -m "feat: normalize Payload content for retrieval"
```

---

### Task 4: Build the Payload Indexer and Reconciliation Workflows

**Files:**
- Create: `automation/n8n/workflows/01-payload-content-indexer.json`
- Create: `automation/n8n/workflows/02-payload-index-reconciliation.json`
- Modify: `automation/n8n/tests/workflow-graphs.test.mjs`
- Modify: `automation/n8n/README.md`

**Interfaces:**
- Consumes: `payload-index-event.schema.json`, Payload public projection endpoint, embedding endpoint, vector upsert/delete endpoint.
- Produces: Idempotent index synchronization result `{ documentId, operation, chunksChanged, correlationId }`.

- [ ] **Step 1: Add failing graph tests**

Add tests requiring these nodes and edges:

```js
test("content indexer has validation, delete, upsert, and response paths", async () => {
  assertWorkflowGraph(await readWorkflow("01-payload-content-indexer.json"), {
    names: ["Payload Event Webhook", "Validate Event", "Route Operation", "Fetch Public Projection", "Normalize and Hash", "Fetch Index Manifest", "Select Changed Chunks", "Generate Embeddings", "Upsert Vectors", "Delete Record Vectors", "Write Index Manifest", "Return Index Result", "Return Validation Error"],
    edges: [["Payload Event Webhook", "Validate Event"], ["Validate Event", "Route Operation"], ["Generate Embeddings", "Upsert Vectors"], ["Delete Record Vectors", "Write Index Manifest"]],
  });
});

test("reconciliation enumerates Payload and invokes the indexer", async () => {
  assertWorkflowGraph(await readWorkflow("02-payload-index-reconciliation.json"), {
    names: ["Nightly Reconciliation", "List Published Records", "List Index Manifest", "Calculate Reconciliation Set", "Loop Records", "Execute Content Indexer", "Summarize Reconciliation"],
    edges: [["Nightly Reconciliation", "List Published Records"], ["Calculate Reconciliation Set", "Loop Records"], ["Loop Records", "Execute Content Indexer"]],
  });
});
```

- [ ] **Step 2: Run graph tests to verify missing workflows fail**

Run: `node --test automation/n8n/tests/workflow-graphs.test.mjs`

Expected: FAIL with `ENOENT` for the two workflow files.

- [ ] **Step 3: Build the content indexer in n8n Cloud**

Use Webhook + Code validation + Switch routing + HTTP Request nodes. Paste the tested normalization logic into `Normalize and Hash`. Configure all external calls with named credentials, 30-second timeouts, three attempts for 429/5xx responses, and `continueErrorOutput` only where an explicit error branch handles the result.

For `publish` and `update`: fetch the public projection, compare chunk hashes with the manifest, embed only changed chunks, upsert changed vectors, delete orphaned chunk IDs, and update the manifest.

For `unpublish` and `delete`: delete vectors by `documentId` and remove the manifest record without fetching content.

Respond with status 200 for a completed idempotent operation, 400 for schema failure, 401 for failed backend authentication, and 502 for a terminal dependency failure.

- [ ] **Step 4: Build scheduled reconciliation**

Run nightly at `03:15` in the workspace timezone. Fetch paginated published-record IDs/versions from the backend projection endpoint and the vector manifest. Calculate missing, stale, and orphaned documents. Invoke the content indexer as a sub-workflow for each record with batch size 20 and summarize counts.

- [ ] **Step 5: Export, sanitize, and validate both workflows**

Run:

```powershell
python "C:\Users\caleb\OneDrive\Documents\General Agent Tasks\.agents\skills\n8n-workflow\scripts\validate_workflow.py" automation/n8n/workflows/01-payload-content-indexer.json --strict
python "C:\Users\caleb\OneDrive\Documents\General Agent Tasks\.agents\skills\n8n-workflow\scripts\validate_workflow.py" automation/n8n/workflows/02-payload-index-reconciliation.json --strict
node --test automation/n8n/tests/workflow-graphs.test.mjs automation/n8n/tests/payload-normalization.test.mjs
```

Expected: all validators and tests PASS; secret scan finds no bearer tokens, API keys, production hosts, `pinData`, or customer samples.

- [ ] **Step 6: Commit**

```powershell
git add automation/n8n/workflows/01-payload-content-indexer.json automation/n8n/workflows/02-payload-index-reconciliation.json automation/n8n/tests/workflow-graphs.test.mjs automation/n8n/README.md
git commit -m "feat: add Payload vector indexing workflows"
```

---

### Task 5: Build Grounded Guide-Mode Chat

**Files:**
- Create: `automation/n8n/workflows/03-pet-chat-orchestrator.json`
- Modify: `automation/n8n/tests/workflow-graphs.test.mjs`
- Modify: `automation/n8n/README.md`

**Interfaces:**
- Consumes: Valid `chat-request.schema.json`, vector search adapter, structured LLM adapter.
- Produces: Valid `chat-response.schema.json` in `guide`, `journey`, or `recovery` mode.

- [ ] **Step 1: Add the failing graph test**

Require these nodes:

```js
test("chat orchestrator grounds and validates every response", async () => {
  assertWorkflowGraph(await readWorkflow("03-pet-chat-orchestrator.json"), {
    names: ["Chat Webhook", "Validate Chat Request", "Route Conversation Mode", "Build Retrieval Query", "Search Public Content", "Check Retrieval Support", "Build Grounded Prompt", "Generate Structured Response", "Validate Response Contract", "Return Chat Response", "Return Unsupported Fallback", "Return Request Error"],
    edges: [["Chat Webhook", "Validate Chat Request"], ["Build Retrieval Query", "Search Public Content"], ["Build Grounded Prompt", "Generate Structured Response"], ["Generate Structured Response", "Validate Response Contract"], ["Validate Response Contract", "Return Chat Response"]],
  });
});
```

- [ ] **Step 2: Run the graph test to verify failure**

Run: `node --test automation/n8n/tests/workflow-graphs.test.mjs`

Expected: FAIL with `ENOENT` for `03-pet-chat-orchestrator.json`.

- [ ] **Step 3: Build request validation and retrieval**

Validate before any external call. Build one retrieval string from `message`, route, entity IDs, and signal names. Send metadata filters for the current `locationIds` and `productIds`; allow an unfiltered fallback only when filtered results do not meet the configured support threshold. Limit grounded context to 8 chunks and 12,000 characters total.

Treat retrieved content as quoted untrusted evidence. Preserve `title`, `canonicalUrl`, `chunkId`, `contentVersion`, and `reviewedAt` for citations.

- [ ] **Step 4: Build structured generation and output validation**

The model instruction must require JSON matching the response contract, answers based only on evidence, concise messages, explicit uncertainty, and no personalized approval/rate/eligibility inference. It may select only `guide`, `journey`, or `recovery` mode and allowlisted actions.

After generation, parse JSON, validate the response schema, confirm each citation maps to a retrieved chunk, and reject unknown actions. Make one repair call for malformed output. On a second failure, return a deterministic recovery response with no journey advancement.

- [ ] **Step 5: Export, sanitize, validate, and smoke test**

Run the workflow manually with `chat-request-guide.json` and a vector stub returning one synthetic FHA chunk. Verify the response cites the synthetic canonical URL. Repeat with an empty vector result and verify `Return Unsupported Fallback` runs without calling the LLM.

Run:

```powershell
python "C:\Users\caleb\OneDrive\Documents\General Agent Tasks\.agents\skills\n8n-workflow\scripts\validate_workflow.py" automation/n8n/workflows/03-pet-chat-orchestrator.json --strict
node --test automation/n8n/tests/workflow-graphs.test.mjs automation/n8n/tests/contracts.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add automation/n8n/workflows/03-pet-chat-orchestrator.json automation/n8n/tests/workflow-graphs.test.mjs automation/n8n/README.md
git commit -m "feat: add grounded pet chat orchestration"
```

---

### Task 6: Implement and Test the Deterministic Journey Engine

**Files:**
- Create: `automation/n8n/lib/journey-engine.mjs`
- Create: `automation/n8n/tests/journey-engine.test.mjs`
- Modify: `automation/n8n/fixtures/journey-prequal.json`
- Modify: `automation/n8n/fixtures/journey-compare.json`
- Modify: `automation/n8n/fixtures/journey-sell.json`

**Interfaces:**
- Consumes: `JourneySchema`, confirmed answer map, and candidate answer.
- Produces: `validateCandidate`, `nextField`, `calculateProgress`, and `applyCorrection` functions copied into workflow Code nodes.

- [ ] **Step 1: Write failing engine tests**

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { applyCorrection, calculateProgress, nextField, validateCandidate } from "../lib/journey-engine.mjs";

const schema = {
  fields: [
    { id: "goal", required: true, dataType: "enum", validation: { enum: ["purchase", "refinance"] }, conditions: [] },
    { id: "property_use", required: true, dataType: "enum", validation: { enum: ["primary", "second", "investment"] }, conditions: [{ field: "goal", equals: "purchase" }] },
    { id: "timeline_months", required: true, dataType: "number", validation: { minimum: 0, maximum: 60 }, conditions: [] },
  ],
};

test("selects the first visible unanswered required field", () => {
  assert.equal(nextField(schema, { goal: "purchase" }).id, "property_use");
});

test("rejects invalid enum candidates", () => {
  assert.deepEqual(validateCandidate(schema.fields[0], "maybe"), { valid: false, reason: "value_not_allowed" });
});

test("progress counts visible required fields only", () => {
  assert.equal(calculateProgress(schema, { goal: "refinance" }), 0.5);
});

test("correction removes answers made invisible downstream", () => {
  assert.deepEqual(applyCorrection(schema, { goal: "purchase", property_use: "primary" }, "goal", "refinance"), { goal: "refinance" });
});

test("all three journey fixtures reach completion with synthetic answers", async () => {
  for (const name of ["journey-prequal.json", "journey-compare.json", "journey-sell.json"]) {
    const fixture = JSON.parse(await readFile(new URL(`../fixtures/${name}`, import.meta.url), "utf8"));
    const answers = Object.fromEntries(fixture.fields.filter((field) => field.testValue !== undefined).map((field) => [field.id, field.testValue]));
    assert.equal(nextField(fixture, answers), null, `${name} remains incomplete`);
    assert.equal(calculateProgress(fixture, answers), 1, `${name} progress is not complete`);
  }
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `node --test automation/n8n/tests/journey-engine.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement the engine**

Support `string`, `number`, `boolean`, `enum`, and `string_array` field types. Support conditions `equals`, `notEquals`, `in`, `exists`, and `all`/`any` groups. Validation returns stable reason codes; it never generates user-facing copy. `nextField` returns `null` only when all visible required fields are confirmed. `calculateProgress` returns a number from 0 through 1 and equals 1 when no visible required fields remain.

- [ ] **Step 4: Run tests**

Run: `node --test automation/n8n/tests/journey-engine.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add automation/n8n/lib/journey-engine.mjs automation/n8n/tests/journey-engine.test.mjs automation/n8n/fixtures/journey-prequal.json automation/n8n/fixtures/journey-compare.json automation/n8n/fixtures/journey-sell.json
git commit -m "feat: add deterministic guided journey engine"
```

---

### Task 7: Build the Guided Journey Workflow

**Files:**
- Create: `automation/n8n/workflows/04-guided-journey-orchestrator.json`
- Modify: `automation/n8n/tests/workflow-graphs.test.mjs`
- Modify: `automation/n8n/README.md`

**Interfaces:**
- Consumes: Valid chat request, authoritative checkpoint API, versioned journey-schema API, structured LLM interpretation endpoint.
- Produces: Valid chat response with confirmed checkpoint version, next field, progress, and account transition on completion.

- [ ] **Step 1: Add the failing graph test**

Require:

```js
test("journey workflow validates before checkpoint advancement", async () => {
  assertWorkflowGraph(await readWorkflow("04-guided-journey-orchestrator.json"), {
    names: ["Journey Webhook", "Validate Journey Request", "Load Authoritative Checkpoint", "Load Pinned Journey Schema", "Select Expected Field", "Interpret Candidate Answer", "Validate Candidate", "Route Candidate Result", "Persist Confirmed Answer", "Handle Checkpoint Conflict", "Calculate Next Step", "Generate Next Question", "Validate Journey Response", "Return Journey Response", "Return Clarification", "Return Journey Recovery"],
    edges: [["Journey Webhook", "Validate Journey Request"], ["Load Authoritative Checkpoint", "Load Pinned Journey Schema"], ["Interpret Candidate Answer", "Validate Candidate"], ["Validate Candidate", "Route Candidate Result"], ["Persist Confirmed Answer", "Calculate Next Step"]],
  });
});
```

- [ ] **Step 2: Run graph tests to verify failure**

Run: `node --test automation/n8n/tests/workflow-graphs.test.mjs`

Expected: FAIL with `ENOENT`.

- [ ] **Step 3: Build checkpoint and schema loading**

The backend returns the authoritative checkpoint with `checkpointVersion`, confirmed answer map, journey type, and pinned schema version. Reject a request whose supplied journey type/schema version does not match. Load the exact pinned schema; never silently upgrade an active journey.

- [ ] **Step 4: Build candidate interpretation and deterministic advancement**

Give the LLM only the expected field, approved explanation, validation vocabulary, and current message. Require `{ candidateValue, confidence, needsClarification, clarificationReason }`. Validate the candidate with the tested engine logic. Persist confirmed answers with `If-Match: <checkpointVersion>` or the backend's equivalent optimistic concurrency header.

On HTTP 409, reload the checkpoint and return a review/confirmation action. On validation failure, do not persist and return one natural clarification. On completion, return `show_review`; after explicit review confirmation, return `start_account_transition`.

- [ ] **Step 5: Export, sanitize, validate, and test three scenarios**

Execute with synthetic fixtures:

1. Valid compare answer advances to `property_use`.
2. Invalid enum returns clarification and makes no checkpoint write.
3. Checkpoint 409 returns recovery without overwriting confirmed answers.

Run:

```powershell
python "C:\Users\caleb\OneDrive\Documents\General Agent Tasks\.agents\skills\n8n-workflow\scripts\validate_workflow.py" automation/n8n/workflows/04-guided-journey-orchestrator.json --strict
node --test automation/n8n/tests/workflow-graphs.test.mjs automation/n8n/tests/journey-engine.test.mjs automation/n8n/tests/contracts.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add automation/n8n/workflows/04-guided-journey-orchestrator.json automation/n8n/tests/workflow-graphs.test.mjs automation/n8n/README.md
git commit -m "feat: add guided journey orchestration"
```

---

### Task 8: Add Error Handling, End-to-End Verification, and Handoff Documentation

**Files:**
- Create: `automation/n8n/workflows/05-pet-chat-error-handler.json`
- Modify: `automation/n8n/tests/workflow-graphs.test.mjs`
- Modify: `automation/n8n/README.md`

**Interfaces:**
- Consumes: n8n Error Trigger payloads from all production workflows.
- Produces: Redacted operational event with workflow ID, execution ID, failure class, timestamp, and correlation ID when available.

- [ ] **Step 1: Add the failing error-workflow graph test**

```js
test("error workflow redacts before notification", async () => {
  assertWorkflowGraph(await readWorkflow("05-pet-chat-error-handler.json"), {
    names: ["Workflow Error Trigger", "Classify Failure", "Redact Error Context", "Notify Operations"],
    edges: [["Workflow Error Trigger", "Classify Failure"], ["Classify Failure", "Redact Error Context"], ["Redact Error Context", "Notify Operations"]],
  });
});
```

- [ ] **Step 2: Run graph test to verify failure**

Run: `node --test automation/n8n/tests/workflow-graphs.test.mjs`

Expected: FAIL with `ENOENT`.

- [ ] **Step 3: Build the error workflow**

Classify `validation`, `authentication`, `dependency`, `model_output`, `checkpoint_conflict`, and `unknown`. The redaction node must drop request bodies, prompts, responses, authorization headers, credentials, and binary data. Notify operations with only workflow name/ID, execution ID/URL, timestamp, failure class, safe node name, and correlation ID.

- [ ] **Step 4: Assign the error workflow and disable execution data retention where policy requires**

In each workflow's settings, select `Pet Chat - Error Handler`. Configure n8n Cloud execution saving according to the development team's approved retention policy; production workflows must not save successful payload data by default.

- [ ] **Step 5: Run full validation**

```powershell
Get-ChildItem automation/n8n/workflows/*.json | ForEach-Object {
  python "C:\Users\caleb\OneDrive\Documents\General Agent Tasks\.agents\skills\n8n-workflow\scripts\validate_workflow.py" $_.FullName --strict
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
node --test automation/n8n/tests/*.test.mjs
rg -n -i "authorization|bearer |api[_-]?key|client[_-]?secret|password|pinData|staticData" automation/n8n
```

Expected: workflow validation and tests PASS. The secret scan matches only documentation/schema field names, never secret values or production samples.

- [ ] **Step 6: Run end-to-end n8n Cloud smoke tests**

Use synthetic data and disabled/test webhook URLs:

1. Publish a synthetic Payload article and confirm it becomes retrievable.
2. Update one section and confirm unchanged chunks are skipped.
3. Unpublish the record and confirm retrieval returns no result.
4. Ask a grounded guide question and confirm citation validity.
5. Start compare, submit a correction, force a checkpoint conflict, resume, review, and receive `start_account_transition`.
6. Force vector and LLM 5xx responses and confirm no journey advancement.
7. Trigger a terminal failure and confirm the operations message contains no request body.

- [ ] **Step 7: Complete README handoff**

Document configuration keys, Payload hook event format, backend endpoint expectations, vector adapter request/response shape, model structured-output shape, webhook activation order, manual rollback, reconciliation procedure, test commands, and the rule that credential IDs must be rebound after import.

- [ ] **Step 8: Commit**

```powershell
git add automation/n8n/workflows/05-pet-chat-error-handler.json automation/n8n/tests/workflow-graphs.test.mjs automation/n8n/README.md
git commit -m "feat: complete pet chat workflow operations"
```

## Final Verification Gate

Do not call the implementation complete until all of the following are true:

- Every workflow JSON passes the strict validator.
- Every Node test passes.
- All workflow node names are unique and all connections resolve.
- The n8n Cloud imports succeed without node migration warnings.
- Credential references are rebound and contain no exported secrets.
- Payload draft/private fields are absent from vector requests.
- Empty retrieval produces a fallback without an LLM-generated factual answer.
- Invalid model output cannot create an action or advance a journey.
- Checkpoint conflicts cannot overwrite newer answers.
- Publish, update, unpublish, delete, and reconciliation tests pass.
- Prequal, compare, and sell schema fixtures each complete through account transition using synthetic data.
- The error workflow notification is redacted.
