# Payload Editorial Factory Design

Date: 2026-07-16  
Status: Approved design

## Objective

Build a Payload-centered editorial factory in `apps/cms` that produces at least 50 real mortgage articles for human review by 7:00 a.m. Eastern every day. It begins at 4:00 a.m., commissions 60 real assignments, and reserves 10% of both commissioned and review-ready output for clearly labeled opinion or analysis. Nothing publishes automatically.

## Architecture

Payload is the backend, CMS, editorial system of record, API, review interface, access-control boundary, and job processor. PostgreSQL is Payload's storage adapter. n8n only starts the daily run, requests recovery at 6:15, checks the SLO at 6:55, and sends infrastructure alerts.

Long-running editorial stages execute as durable Payload jobs. n8n must not hold hundreds of research or model requests open during the three-hour window.

## Collections

- `editorialRuns`: run date, Eastern deadline, total and opinion targets, counts, SLO state, and recovery history.
- `articles`: public copy, editorial mode, audience, relevance scores, author, relationships, SEO package, review state, and publication state.
- `storyPackets`: assignment, constraints, acceptance criteria, research questions, source/claim state, canonical draft, findings, risks, approvals, and next action.
- `editorialSources`: URL or internal ID, source type, dates, geography, authority, consumer relevance, supported claims, methodology, and limitations.
- `editorialClaims`: material claim, supporting sources, period, geography, limitation, verification state, and approval state.
- `editorialReviews`: role, verdict, findings, blockers, reviewer identity, model execution identity where applicable, and timestamp.
- `articleRevisions`: immutable draft versions and change evidence.
- `editorialTopics`: consumer questions, coverage opportunities, canonical-page comparisons, and duplicate-intent dispositions.
- Related collections: locations, products, loan officers, branches, calculators, authors, users, and disclosures.

## Access and lifecycle

Automation may commission, research, draft, revise, and package previews. It may not record human approval or publish. Editors may return or approve editorial work; compliance reviewers resolve compliance findings; publishers publish only approved packages. Server hooks reject unauthorized or skipped transitions.

```text
commissioned
→ mortgage-contract
→ researching
→ drafting
→ developmental-review
→ revision when required
→ fact-and-copy-review
→ mortgage-audit
→ compliance-review
→ packaging
→ awaiting-approval
```

Every stage is idempotent and verifies the expected current status. Invalid model output or failed gates do not advance state or replace the canonical draft. Developmental review permits at most two automated revision cycles before human intervention or a blocked state.

## Daily portfolio

| Story class | Count |
| --- | ---: |
| National consumer reporting | 14 |
| National trends with local comparisons | 18 |
| Local stories with national relevance | 14 |
| Evergreen consumer explainers | 8 |
| Clearly labeled opinion or analysis | 6 |
| **Total** | **60** |

At least 50 articles must reach review, including at least 5 opinions. Recovery protects both thresholds.

## Assignment and research standard

Candidate scoring is 30% consumer consequence, 20% timeliness, 15% national relevance, 15% local specificity, 10% evidence availability, and 10% novelty against canonical coverage.

Every assignment begins with a consumer question. Reject stories that merely summarize an agency announcement, primarily interest mortgage professionals, rely on unexplained industry language, duplicate an existing borrower question, or cannot explain a consumer consequence.

Research may use government, housing-market, economic, local, academic, and approved commercial sources. Primary sources establish facts when available, but source vocabulary does not determine framing. Technical terms must be translated into plain consumer language.

Every article explains what is happening, who could be affected, why a buyer or homeowner might care, whether the effect is national or local, how markets differ, what decision it could help investigate, and what remains uncertain. Local stories require three genuinely local findings and a useful national comparison. National stories must explain market variation rather than treating an average as universal.

Before commissioning an indexable article, compare it with accessible canonical content by borrower intent. Record direct, near, and supporting pages and assign a keep, differentiate, merge, canonicalize, redirect, or do-not-create disposition.

## Opinion standard

- Exactly 6 of 60 commissioned assignments are opinion or analysis.
- At least 5 of 50 review-ready articles are opinion or analysis.
- Opinion content is clearly labeled and uses a named, approved human author or editorial voice.
- It states a thesis, evidence, counterargument, uncertainty, and consumer takeaway.
- Factual claims receive the same verification as reported content.
- It may not invent beliefs, disguise promotion as independent judgment, make unsupported forecasts, or give personalized financial advice.

Required fields include editorial mode, opinion thesis, author, disclosure, counterargument, and evidence boundary.

## Payload endpoints

```text
POST /api/editorial/daily-plan
POST /api/editorial/recovery-plan
POST /api/editorial/articles/:id/run-stage
POST /api/editorial/articles/:id/queue-review
GET  /api/editorial/runs/:date/status
POST /api/editorial/runs/:date/retry-failures
```

Stage requests name the requested stage and expected current status. Payload validates the transition, creates an idempotent job, and returns its ID. The review endpoint independently verifies evidence, editorial, mortgage, duplicate-content, and compliance gates.

## Failure recovery

- Invalid structured output retries without advancing status.
- Evidence, compliance, or duplicate-content failures block the article.
- Transient provider failures use bounded delayed retries.
- Exhausted jobs enter an Admin-visible dead-letter state.
- The 6:15 recovery run commissions eligible replacements for total and opinion deficits.
- The 6:55 audit reports current counts but never bypasses a gate.

## Payload Admin review

The review screen shows the rendered preview, why-readers-care statement, national/local relevance, local-versus-national comparison, sources beside claims, revision history, all independent findings, and internal-link recommendations. Role-controlled actions allow return, block, approval, and—only after approval—publication.

## Verification with real articles

Acceptance uses staged production pilots, not synthetic article generation:

1. Ten real articles using live research and actual review gates.
2. Thirty real articles to tune concurrency, recovery, editorial mix, cost, and reviewer workload.
3. Sixty real articles to verify the 4:00–7:00 a.m. window and the 50-ready/5-opinion targets.

Pilot articles remain unpublished until individually approved. Deterministic fixtures remain appropriate for infrastructure unit and integration tests, but they do not substitute for the real-article pilot.

Automated tests cover access rules, transitions, opinion quotas, duplicate rejection, scoring, recovery, idempotency, blocked gates, and Eastern daylight-saving behavior.

## Acceptance criteria

- Payload is the only editorial system of record.
- A daily run commissions 60 distinct real assignments, exactly 6 of them opinion or analysis.
- At least 50 real articles, including at least 5 opinions, reach `awaiting-approval` by 7:00 a.m. Eastern during the final pilot.
- Every article answers a consumer question and explains national, local, or comparative relevance.
- Every material claim retains auditable evidence and limitations.
- No unresolved data, evidence, duplicate-intent, or high-risk compliance blocker reaches review.
- Automation cannot approve or publish.
- Failed work remains observable and safely retryable without duplication.

## Out of scope

- Automatic publishing or automated human approval.
- Personalized mortgage advice or borrower-specific underwriting.
- A separate editorial microservice before measured scaling needs justify it.
- Post-publication performance review without real publication evidence.
