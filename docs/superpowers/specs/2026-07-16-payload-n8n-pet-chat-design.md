# Payload + n8n Pet Chat Design

Date: 2026-07-16

## Summary

Build a website chat assistant that begins as a restrained chat icon and reveals a character only when opened. The assistant helps visitors understand public mortgage content and then guides them through one of three structured journeys:

- Prequalification.
- Mortgage comparison.
- Home-sale planning.

The assistant uses public content published in Payload CMS and retrieved from a vector database. n8n coordinates content indexing, grounded chat responses, and guided-journey progression. The website backend remains the trust boundary and authoritative system of record.

## Product Goals

The assistant should:

1. Answer useful questions using published website content.
2. Use the current page, location, product, calculator, and session context to make answers relevant.
3. Recognize prequalification, comparison, and home-sale intent.
4. Collect journey answers conversationally without allowing the LLM to control business rules.
5. Help visitors complete the selected journey and reach its existing account-creation step.
6. Recover cleanly from invalid input, model failure, retrieval failure, and downstream outages.

## Non-Goals

This design does not specify:

- The visual character artwork or animation system.
- Authentication implementation.
- Encryption, consent, retention, or regulated-data controls.
- The authoritative schemas for every prequalification, comparison, or sale-planning field.
- A specific LLM, embedding model, or vector database vendor.
- A full mortgage application or underwriting decision engine.

Those concerns must be implemented by the application and security teams. The workflow contracts in this design must allow their controls to be enforced.

## Experience Principles

### Closed and open states

The closed assistant is a professional chat icon. The character appears only after the visitor opens the chat. It does not visibly follow the cursor or compete with page content.

### Proactive messages

The website, not the LLM, determines when the assistant may proactively speak. Examples include:

- A completed calculator result.
- Repeated product-page visits.
- Extended engagement with a page.
- A return to an unfinished journey.
- Movement between related purchase, refinance, or sale content.

The frontend sends a named, allowlisted signal. The workflow selects from an approved response family or asks the model to phrase a response within that family. The model cannot invent behavioral triggers.

### Help before conversion

The assistant first resolves the visitor's immediate question. It introduces a journey only when the visitor expresses relevant intent or the page signal supports a useful next step.

## System Boundaries

### Website frontend

The frontend owns:

- Chat presentation and character states.
- Collection of the visitor's message.
- Page and UI context.
- Rendering citations, choices, progress, validation messages, and review screens.
- Executing only allowlisted actions returned by the backend.

### Website backend

The backend is the trust boundary and owns:

- Authentication and authorization.
- Rate limits and abuse controls.
- Request signing and n8n webhook authentication.
- Session identity and replay protection.
- Authoritative journey persistence.
- Sensitive-data controls.
- Validation of frontend actions.
- Payload access and public/private field separation.

### Payload CMS

Payload is the editorial source of truth. Only explicitly approved public collections and fields may be indexed for retrieval.

### n8n

n8n coordinates deterministic workflow steps, retrieval calls, LLM calls, validation, retries, and controlled API writes. It is not the authoritative customer database.

### Vector database

The vector database stores searchable chunks derived from published Payload content. It does not store authoritative journey answers.

## Workflow Architecture

The design uses three primary workflows and one recommended operational workflow.

### 1. Payload Content Indexer

Purpose: keep the public assistant knowledge index synchronized with Payload.

```text
Payload publish/update/delete hook
  -> authenticate and validate event
  -> load approved public record projection
  -> normalize content and metadata
  -> split into stable chunks
  -> calculate content hashes
  -> skip unchanged chunks
  -> generate embeddings
  -> upsert or delete vectors
  -> record synchronization result
  -> controlled webhook response
```

Approved collection examples:

- Locations.
- Loan products.
- Articles and FAQs.
- Market-data explanations.
- Calculator descriptions.
- Branch public profiles.
- Loan-officer public profiles.

Drafts, private fields, internal notes, customer records, and unpublished versions are excluded.

### 2. Pet Chat Orchestrator

Purpose: answer grounded questions and decide whether to remain in guide mode or enter a journey.

```text
Signed backend request
  -> validate request contract
  -> enforce size and state limits
  -> classify route: guide, journey, or recovery
  -> create retrieval query from message and page context
  -> vector search with metadata filters
  -> assemble bounded grounded context
  -> call LLM for structured response
  -> validate output schema, citations, and action allowlist
  -> return response or recoverable fallback
```

### 3. Guided Journey Orchestrator

Purpose: progress prequalification, comparison, and home-sale conversations through versioned deterministic schemas.

```text
Validated chat request plus authoritative checkpoint
  -> load pinned journey-schema version
  -> identify expected field
  -> interpret message into candidate values
  -> validate values deterministically
  -> clarification branch when invalid or ambiguous
  -> persist confirmed values through backend API
  -> calculate next field and progress
  -> generate natural next question
  -> review completed answers
  -> return existing account-creation transition
```

### 4. Reconciliation and Failure Operations

Purpose: repair missed indexing events and centralize failed executions.

```text
Schedule trigger
  -> enumerate published Payload records
  -> compare source versions and hashes with index manifest
  -> enqueue missing, stale, or orphaned records
  -> invoke indexer
  -> report reconciliation result
```

An n8n error workflow should receive terminal failures, redact payloads, attach correlation IDs, and route operational notifications.

## Conversation Modes

### Guide

The assistant answers questions and helps visitors navigate. Answers must be grounded in retrieved published content. When evidence is inadequate, the assistant says it cannot confirm the answer and offers a relevant page, journey, or human-help route.

### Journey

The assistant collects the next required answer for a prequalification, comparison, or sale-planning journey. One logical question is asked at a time. Visitors can correct earlier answers or request an explanation.

### Recovery and handoff

The assistant restores a saved checkpoint, resolves ambiguous intent, or returns a safe next step after a dependency failure. A failure must never silently advance a journey.

## Retrieval Design

### Vector record

Each searchable chunk uses stable source and chunk identifiers.

```json
{
  "documentId": "payload-record-id",
  "collection": "loan-products",
  "chunkId": "stable-chunk-id",
  "contentVersion": 7,
  "status": "published",
  "title": "FHA Loans",
  "canonicalUrl": "/loan-options/fha",
  "locationIds": [],
  "productIds": ["fha"],
  "effectiveAt": "2026-07-16",
  "reviewedAt": "2026-07-16",
  "contentHash": "sha256-placeholder"
}
```

Additional metadata may include state, city, content type, audience, topic, disclosure IDs, and freshness state.

### Indexing rules

- Use stable chunk IDs derived from source identity and semantic section identity.
- Hash normalized chunk content and skip unchanged chunks.
- Remove all vectors for a record when it is unpublished or deleted.
- Maintain separate non-production and production indexes.
- Prefer metadata filters for page entities before relying on semantic similarity alone.
- Return canonical URLs and source titles with retrieval results.
- Exclude stale content according to collection-specific freshness rules or visibly label it when policy permits use.

### Grounding rules

- The model receives only a bounded conversation summary, active page context, permitted journey schema, and retrieved public chunks.
- Editorial content cannot establish personalized eligibility, approval, a rate offer, or a financial outcome.
- Responses containing factual website claims must reference retrieved sources.
- Retrieved text is untrusted data and cannot modify system instructions or permitted actions.

## Guided-Journey Model

Each journey is a versioned declarative schema. A conversation remains pinned to the schema version under which it began unless an explicit migration succeeds.

Each field defines:

- Stable field ID.
- Data type.
- Required or optional status.
- Validation rules.
- Conditional visibility rules.
- Dependencies.
- Approved explanation.
- Approved prompt family.
- Review formatting.

The three initial schema families are:

- `prequal`: borrower goal, property intent, occupancy, location, timing, transaction context, income, assets, obligations, and developer-defined fields.
- `compare`: goal, property context, financing priorities, timeline, available funds, product preferences, and tradeoff questions.
- `sell`: property context, estimated value, mortgage obligations, selling costs, timing, proceeds goals, and planning inputs.

The exact regulated field inventory is owned by the development, product, and compliance teams.

### LLM responsibilities

The model may:

- Convert conversational language into candidate structured values.
- Explain an approved field purpose.
- Phrase a clarification.
- Summarize confirmed information for review.
- Draft a grounded guide response.

The model may not:

- Select an arbitrary next field.
- Mark an invalid answer as confirmed.
- Write directly to authoritative customer storage.
- Create new frontend actions.
- Infer approval, eligibility, or unavailable facts.

### Deterministic responsibilities

Workflow and application rules control:

- The expected field.
- Validation and branching.
- Checkpoint writes.
- Progress calculation.
- Completion state.
- The final transition to the existing account-creation step.

## API Contracts

### Chat request

The website backend sends a sanitized request similar to:

```json
{
  "requestId": "idempotency-key",
  "sessionId": "opaque-session-id",
  "message": "I want to compare FHA and conventional",
  "page": {
    "route": "/locations/texas/austin",
    "entityIds": {
      "locationIds": ["city-austin-tx"],
      "productIds": []
    }
  },
  "signals": ["calculator_completed"],
  "conversationSummary": "Bounded server-generated summary",
  "journey": {
    "type": "compare",
    "schemaVersion": "1",
    "checkpointId": "opaque-checkpoint-id"
  }
}
```

The production contract must use explicit maximum lengths, enum allowlists, and unknown-field rejection.

### Chat response

```json
{
  "message": "I can help you compare those options.",
  "citations": [],
  "intent": "compare",
  "mode": "journey",
  "journey": {
    "type": "compare",
    "status": "in_progress",
    "nextField": "property_use",
    "progress": 0.25,
    "checkpointVersion": 4
  },
  "actions": [
    {
      "type": "show_choices",
      "options": ["Primary home", "Second home", "Investment"]
    }
  ],
  "correlationId": "opaque-correlation-id"
}
```

Initial action allowlist:

- `show_choices`.
- `show_field`.
- `show_review`.
- `open_internal_route`.
- `resume_journey`.
- `start_account_transition`.
- `offer_human_help`.

The backend validates every action before returning it to the browser.

## Error Handling

### Validation failure

Return a controlled 4xx response for malformed or oversized requests. Do not call the vector database or LLM.

### Retrieval failure

Retry only transient failures. If retrieval remains unavailable, return a neutral fallback and do not present unsupported website facts.

### LLM failure or invalid output

Use bounded retry for transient provider errors. Invalid structured output follows a repair attempt and then a deterministic fallback. Journey state does not advance.

### Persistence conflict

Use checkpoint versions or equivalent optimistic concurrency. On conflict, reload the authoritative checkpoint and ask the visitor to confirm any disputed answer.

### Indexing failure

Use idempotency keys, bounded retry, and a dead-letter path. A failed update must remain visible to reconciliation and operations.

### Duplicate request

Return the prior completed response for the same request ID when safe. Never create two journey checkpoints from one user action.

## Observability

Use correlation IDs across the website backend, n8n, Payload synchronization, vector calls, and LLM calls.

Track:

- Chat response latency.
- Retrieval latency and result counts.
- Unsupported-answer fallbacks.
- Invalid structured model output.
- Journey starts, completions, resumptions, and abandonment.
- Field validation and clarification rates.
- Indexing lag and failed records.
- Proactive-message opens and dismissals.
- Entry into prequal, compare, and sell flows.

Logs must use redacted operational metadata. Prompt and response logging is disabled by default unless the development team's data controls explicitly permit it.

## Credential and Configuration Model

Importable n8n templates must contain placeholders only. Expected credential categories are:

- Website backend webhook authentication.
- Payload service authentication.
- Vector database authentication.
- Embedding provider authentication.
- LLM provider authentication.
- Operational notification integration.

Environment-specific hosts, collection names, index names, timeouts, and model names must be configuration values rather than embedded production values.

## Testing Strategy

### Content indexer

- Publish creates the expected chunks.
- An unchanged update performs no vector writes.
- A changed section updates only affected chunks.
- Unpublish and delete remove all record vectors.
- Private and draft fields never enter embeddings.
- Reconciliation repairs missed events and removes orphans.

### Chat orchestrator

- Page context improves metadata filtering.
- Answers cite retrieved public content.
- Missing support produces the controlled fallback.
- Retrieved prompt injection cannot change instructions or actions.
- Unknown actions and malformed model output are rejected.
- Duplicate request IDs do not duplicate side effects.

### Journey orchestrator

- Every conditional branch selects the expected next field.
- Invalid answers do not advance progress.
- Corrections update the intended field and downstream branches.
- Checkpoints resume after interruption.
- Persistence conflicts are recoverable.
- Completion produces the existing account-transition action.
- Model and dependency outages preserve the last confirmed state.

### End-to-end

- A visitor asks a grounded local-market question and starts prequalification.
- A visitor compares two products, corrects an answer, reviews the result, and reaches account creation.
- A visitor begins a home-sale plan, leaves, returns, and resumes from the checkpoint.
- A Payload article update becomes retrievable and an unpublish event removes it.

## Acceptance Criteria

The design is ready for implementation planning when:

1. The frontend/backend request and response contracts are accepted by the development team.
2. Payload collections and public field projections are enumerated.
3. Vector database and model providers are selected or represented by stable adapters.
4. The first version of each journey schema is supplied by the owning team.
5. Action and proactive-signal allowlists are approved.
6. The backend persistence API supports idempotent checkpoint reads and writes.
7. Error, retry, dead-letter, and reconciliation ownership is assigned.
8. Test fixtures contain synthetic data only.

## Implementation Sequence

The subsequent implementation plan should proceed in this order:

1. Finalize contracts, allowlists, and provider adapters.
2. Build the Payload content indexer and reconciliation workflow.
3. Build grounded guide-mode chat.
4. Build the declarative journey engine and one journey schema.
5. Add compare and sell schemas.
6. Integrate proactive website signals and character UI states.
7. Add operational error workflow, dashboards, and end-to-end tests.

