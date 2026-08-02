# RelayOps — Product Notes

## Product thesis

**RelayOps turns webhook delivery failures into evidence-backed, policy-governed recovery workflows.**

The product is built around a simple observation:

> A failed-looking webhook is not automatically safe to replay.

Before recovery, an operator needs to understand what happened, what remains uncertain, whether automatic delivery is still active, whether replay could create duplicate side effects, and whether the current system state authorizes the action.

RelayOps brings those decisions into one customer-facing developer-platform workflow.

## Portfolio role

RelayOps is Project 6 in a portfolio of working product systems.

The project was designed to demonstrate Senior/Principal-level product judgment in a developer-platform context, with particular emphasis on:

- Operational evidence
- API and webhook semantics
- Environment isolation
- Recovery safety
- Idempotency
- State-machine design
- Failure and ambiguity handling
- Auditability
- Honest prototype boundaries

The goal was not to build the widest webhook-management product.

The goal was to demonstrate how a product leader can take a seemingly simple feature—“retry this webhook”—and uncover the system, policy, and UX decisions required to make it operationally credible.

## Why this problem was selected

Webhook recovery is a compact but high-signal product problem.

It combines:

- Customer-facing developer experience
- Distributed-system uncertainty
- Operational investigation
- Potentially consequential execution
- Role and policy enforcement
- Asynchronous state transitions
- Cross-resource traceability
- Production and Sandbox boundaries
- Failure modes that cannot be reduced to HTTP status labels

It also creates a natural tension between two legitimate customer needs:

1. Restore delivery quickly.
2. Avoid creating a duplicate or unsupported downstream side effect.

That tension requires product judgment rather than only interface design.

## Problem framing

A webhook provider can observe that it sent a request, encountered a timeout, or received a particular HTTP response.

It cannot always determine:

- Whether the receiver processed the event
- Whether a downstream transaction committed
- Whether the receiver is now healthy
- Whether the receiver safely deduplicates repeated events
- Which side caused an authentication or signature-verification failure
- Whether a currently displayed assessment remains valid at execution time

A useful recovery product must therefore distinguish between:

- Confirmed delivery
- Confirmed receiver rejection
- Active retry
- Retry exhaustion
- Unknown receiver acceptance
- Later recovery through a separate replay

RelayOps models these as different operational states rather than collapsing them into “success” and “failure.”

## Target users

### Primary user: Integration administrator

The primary user monitors webhook health, investigates delivery failures, and decides whether to initiate recovery.

They need:

- A fast path from alert to affected delivery
- Understandable attempt evidence
- Clear distinction between fact and hypothesis
- Explainable replay eligibility
- Confidence that recovery actions are traceable

### Secondary user: Integration developer

The integration developer investigates receiver behavior and configuration.

They need:

- Sanitized request and response evidence
- Attempt timing and retry history
- Endpoint and event context
- Clear next investigation steps
- Protection from unnecessary secret or payload exposure

### Supporting user: Platform support operator

The support operator helps customers investigate difficult delivery and recovery cases.

They need:

- Cross-resource traceability
- Actor and role information
- Replay lifecycle evidence
- Recorded-versus-simulated provenance
- Stable references for operational discussion

## Product principles

### 1. Evidence before action

Recovery begins with the strongest facts the system can establish.

The product does not authorize replay merely because a delivery appears in a failed state.

### 2. Unknown is a real state

A missing response is not treated as equivalent to a confirmed receiver rejection.

When receiver acceptance is ambiguous, the product blocks replay until downstream state is confirmed.

### 3. Policy should be explainable

Consequential actions use deterministic policy.

The operator can see both the decision and the reason for it.

### 4. Recovery must not rewrite history

Original delivery attempts remain immutable.

A successful replay becomes separate recovery evidence rather than a retroactive successful attempt.

### 5. Authorization must use current facts

The product revalidates safety when the command is submitted and again before simulated execution.

A previously displayed eligible state is not treated as permanent authority.

### 6. Auditability is part of the workflow

The replay request, lifecycle, outcome, operator, acknowledgement, and related resources are designed as product behavior—not added as an afterthought.

### 7. Simulation must remain explicit

The prototype demonstrates real workflow and state behavior without claiming to execute real customer webhooks.

## Scope definition

### Included

RelayOps includes:

- Operational overview
- Production and Sandbox context
- Endpoint inventory
- Endpoint detail
- Delivery explorer
- URL-backed filters
- Delivery detail
- Attempt-by-attempt evidence
- Sanitized payload and response views
- Deterministic assessment
- Replay eligibility and blockers
- Contextual acknowledgements
- Single-delivery replay requests
- Role enforcement
- Idempotency protection
- Simulated queued, running, completed, failed, and skipped states
- Browser-session replay persistence
- Strict restored-state validation
- Recovery-aware delivery classification
- Replay detail
- Read-only Audit log
- Cross-resource links
- Loading, empty, error, missing-resource, and degraded-evidence states

### Excluded

RelayOps intentionally excludes:

- Real outbound webhook requests
- Real customer authentication
- Durable backend storage
- Background workers
- Cross-device state
- Endpoint configuration writes
- Secret management
- Interactive bulk replay
- Replay cancellation
- Audit export
- AI authorization
- AI root-cause claims
- Receiver-side idempotency verification

These exclusions keep the prototype honest about what a frontend system can safely demonstrate.

## Why replay—not general webhook management—became the center

An early risk in this project was building a conventional webhook dashboard:

- Success-rate charts
- Endpoint lists
- Delivery logs
- Status filters
- A retry button

That would have been visually recognizable but strategically weak.

The project became stronger when the center of gravity moved from monitoring to recovery governance.

The important product question changed from:

> How can an operator see failed webhooks?

to:

> Under what evidence and policy conditions should an operator be allowed to create another delivery attempt?

That reframing produced the project’s deeper system behavior:

- Unknown-outcome handling
- Fail-closed eligibility
- Contextual acknowledgement
- Execution-time revalidation
- Idempotent command creation
- Parent-item coherence
- Recovery-aware classification
- Deterministic audit projection

## Product evolution

The implementation progressed through a deliberately layered sequence.

### Stage 1: Operational foundation

The first stage established:

- Workspace and environment context
- Application shell
- Operational navigation
- Canonical types
- Fixture-backed records
- Repository boundaries
- Representative Production and Sandbox data

The important decision was to create one authoritative environment scope early.

This prevented later pages from developing conflicting interpretations of Production and Sandbox data.

### Stage 2: Monitoring and endpoint context

The next stage added:

- Operational overview
- Delivery and retry metrics
- Endpoint health
- Failure clusters
- Incident context
- Endpoint inventory
- Endpoint detail
- Stale and insufficient telemetry states

The product avoided treating disabled endpoints as ordinary healthy or failing endpoints.

It also separated observed correlation from confirmed root cause.

### Stage 3: Delivery investigation

The delivery explorer and delivery-detail workflow introduced:

- Search and operational filters
- URL-backed filter state
- Attempt timelines
- Confirmed HTTP-response evidence
- Response-absent transport evidence
- Sanitized request and response views
- Payload-retention states
- Missing-resource handling
- Cross-resource navigation

At this point, RelayOps could support investigation, but it still had not crossed the recovery boundary.

### Stage 4: Deterministic assessment and replay policy

The project then introduced a domain-owned assessment model.

This separated:

- Delivery classification
- Replay eligibility
- Eligibility blockers
- Operator-facing explanation
- Required acknowledgement

The assessment model covered successful, retrying, exhausted, ambiguous, unavailable, and later-recovered states.

This was a major progression from page-level status presentation to reusable product policy.

### Stage 5: Safe replay command creation

Replay was implemented as an explicit command rather than a button that directly mutated delivery state.

The command introduced:

- Execution-time fact resolution
- Role enforcement
- Contextual acknowledgement
- Optional operator notes
- Idempotency keys
- Conflicting-key rejection
- Active-replay protection
- Successful-replay protection
- Atomic job-and-item creation

No real webhook request was sent.

The product crossed the execution boundary at the workflow level while preserving an honest simulated-infrastructure boundary.

### Stage 6: Lifecycle, persistence, and recovery semantics

The replay lifecycle added:

```text
Queued → Running → Completed
                 ↘ Failed
                 ↘ Skipped
```

This stage also introduced:

- Browser-session persistence
- Atomic parent-and-item transitions
- Execution-time safety revalidation
- Deterministic simulation adapters
- Strict restored-state validation
- Refresh-safe lifecycle reconciliation
- Recovery-aware delivery assessment

The central semantic decision was that a successful replay does not rewrite the original delivery attempts.

Recovery becomes additional evidence.

### Stage 7: Audit and operational traceability

The final implementation stage added:

- Recorded platform audit fixtures
- Deterministically projected replay events
- Stable audit-event IDs
- Semantic deduplication
- Actor and role resolution
- Environment isolation
- Workspace-wide governance events
- Recorded-versus-simulated provenance
- Directly addressable event detail
- Links to endpoints, deliveries, and replay jobs
- Audit-driven lifecycle reconciliation

This closed the operational loop:

```text
Observe → Investigate → Decide → Acknowledge → Execute → Reconcile → Audit
```

## Canonical scenarios

The project uses three primary scenarios to demonstrate different evidence and recovery outcomes.

### Scenario 1: Confirmed temporary failure followed by successful recovery

Production delivery `dlv_b7e2d911` contains eight confirmed HTTP 503 attempts.

RelayOps can establish that:

- The receiver returned confirmed failures.
- Automatic delivery exhausted its retry policy.
- The original payload remains available.
- The endpoint is active.
- No successful or active replay already exists.
- The operator has permission to request recovery.

The operator must still confirm that the receiver has recovered.

The simulated replay completes with HTTP 200 acceptance.

The original attempts remain unchanged, while the aggregate assessment becomes `recovered_by_replay`.

### Scenario 2: Confirmed authentication-related rejection followed by another rejection

Sandbox delivery `dlv_g6e1c750` contains eight confirmed HTTP 401 attempts with signature-verification-related response evidence.

RelayOps recommends verifying authentication and signature configuration without claiming which side is responsible.

The simulated replay also returns HTTP 401.

The result is retained as factual failed-replay evidence.

The product does not claim recovery and does not convert the failure into a stronger root-cause statement than the evidence supports.

### Scenario 3: Receiver acceptance unknown

Production delivery `dlv_c3a9e047` has response-absent transport evidence.

The system cannot establish whether the receiver applied the event.

Replay is blocked because another attempt could duplicate a side effect that already occurred.

This scenario is important because it demonstrates that the safest recovery behavior can be refusal to act.

## Evidence hierarchy

RelayOps implicitly uses the following evidence hierarchy:

### Strong evidence

- Confirmed receiver HTTP response
- Canonical attempt timestamps
- Retry-policy state
- Payload availability
- Endpoint status
- Coherent retained replay result
- Explicit platform incident state
- Resolved workspace membership and role

### Bounded inference

- A repeated response pattern may suggest an investigation direction.
- A relevant incident may be correlated with a delivery failure.
- Repeated HTTP 503 responses may suggest temporary receiver unavailability.
- Repeated HTTP 401 responses may suggest authentication or signature-verification review.

### Unknown

- Whether a receiver processed a request when no response was observed
- Whether an HTTP 503 receiver has now recovered
- Which side caused a signature-verification failure
- Whether a receiver safely deduplicates all relevant event types
- Whether an external downstream side effect occurred

The product does not promote bounded inference or unknown state into canonical fact.

## AI boundary

RelayOps does not use AI in its implemented workflow.

This is a deliberate product decision rather than a missing feature.

Replay authorization requires:

- Stable rules
- Reproducible outcomes
- Inspectable blockers
- Current canonical facts
- Conservative behavior under uncertainty

An LLM would not improve this authorization boundary.

A future production product could use AI for low-authority assistance such as:

- Summarizing long attempt histories
- Grouping similar failures
- Drafting support notes
- Explaining deterministic policy in customer-friendly language
- Suggesting documentation or investigation steps

The system should continue to keep AI away from:

- Canonical execution facts
- Role authorization
- Idempotency enforcement
- Replay eligibility
- Blocker overrides
- Terminal lifecycle outcomes

## Realism introduced beyond the visible UI

Several of the most important parts of RelayOps are not immediately visible in screenshots.

### Execution-time revalidation

The replay dialog does not become an authorization token.

The command resolves the current delivery, endpoint, retries, incidents, replay history, payload state, and operator role before creating a job.

### Idempotency semantics

Equivalent reuse can return the existing command result.

Conflicting reuse of the same idempotency key is rejected.

This distinction matters because idempotency is not simply duplicate-button protection.

### Atomic local writes

The replay parent and item are created and transitioned together.

If persistence fails, the previously coherent state remains available.

### Restored-state validation

Data restored from browser storage is treated as untrusted input.

It must pass structural and semantic checks before it can influence delivery assessment or audit projection.

### Parent-item coherence

The system rejects combinations where parent and item facts disagree about:

- Lifecycle status
- Counts
- Outcome
- Timestamps
- Execution evidence
- Workspace
- Environment
- Source delivery

### Deterministic audit projection

Simulated replay events are reconstructed from canonical replay state.

The Audit log does not maintain an independently mutable version of the same lifecycle.

## Product risks

### Duplicate downstream side effects

A replay may cause a receiver to repeat a non-idempotent action.

Mitigations include:

- Blocking ambiguous receiver outcomes
- Waiting for automatic retries to finish
- Contextual acknowledgement
- Active and successful replay protection
- Idempotent command creation
- Execution-time revalidation

The prototype cannot verify receiver-side idempotency.

### Misleading root-cause claims

HTTP status codes and response text may be insufficient to establish causality.

RelayOps presents observed evidence and bounded investigation guidance instead of unsupported certainty.

### Stale authorization

A delivery that was eligible during review may no longer be eligible when execution begins.

Safety is revalidated at the command and execution boundaries.

### Incoherent restored state

Browser storage may contain malformed or contradictory replay records.

Restored data fails closed and does not become recovery or audit evidence unless it satisfies canonical invariants.

### Environment leakage

Production and Sandbox data must never be combined accidentally.

One authoritative environment context scopes operational records, replay state, audit events, idempotency checks, and resource resolution.

### Prototype overstatement

A polished frontend can imply infrastructure that does not exist.

RelayOps repeatedly discloses that execution is simulated and browser-local state is not durable production persistence.

## What the project does well

The strongest aspects of RelayOps are:

- A clear customer and operational problem
- A narrow but consequential execution workflow
- Strong separation between evidence, policy, and operator acknowledgement
- Explicit treatment of ambiguous outcomes
- Deterministic, reusable domain behavior
- Current-state revalidation
- Credible idempotency semantics
- Atomic state transitions within the prototype boundary
- Strict restored-state validation
- Immutable original delivery history
- Recovery-aware aggregate classification
- Environment-isolated operational behavior
- Audit projection from canonical state
- Honest disclosure of simulation and frontend-only limitations

## Current limitations

RelayOps remains a portfolio prototype.

Its most important limitations are:

### No backend authority

All application behavior runs in the browser.

The frontend cannot safely own production replay authority, signing secrets, or customer payloads.

### No durable multi-user state

Replay state exists only within the browser session.

There is no shared view across operators, devices, or tabs.

### No real concurrency

The product models active-replay and idempotency protections, but it cannot reproduce concurrent distributed commands or database locking.

### No real worker

Lifecycle transitions are reconciled through repository-owned frontend behavior rather than a durable queue and worker.

### No network ambiguity during replay

The simulation returns deterministic outcomes.

A production executor would also need to handle cases where the replay request may have reached the receiver but the sender cannot confirm the response.

### No automated test suite

The implementation was checked through type validation, builds, canonical workflows, adversarial state scenarios, and cross-environment regression.

The absence of automated tests is still a meaningful limitation.

### No bulk-recovery execution

The product preserves a historical bulk replay but does not expose interactive bulk creation.

A credible bulk workflow would require per-item policy, rate controls, partial outcomes, cancellation, and larger-blast-radius governance.

## Portfolio progression

RelayOps builds on the previous five projects without repeating their central product lessons.

| Project | Primary progression demonstrated |
|---|---|
| Project 1 — Safe Treasury Copilot | Deterministic financial policy around AI-generated decision support |
| Project 2 — Marketplace Dispute Resolution Copilot | Case lifecycle, human decision authority, and auditability |
| Project 3 — Travel Disruption Operations Copilot | SLA-driven operational queues, external data, and role-aware workflows |
| Project 4 — Billing Recovery Execution Console | Durable execution requests, provider writes, retry, reconciliation, and manual recovery |
| Project 5 — SustainOps | Polished multi-role B2B SaaS, evidence gaps, remediation, trust, and supplier collaboration |
| Project 6 — RelayOps | Developer-platform recovery, distributed-system ambiguity, idempotency, coherence, and deterministic audit projection |

### Progression from Project 5

SustainOps demonstrated broad SaaS product composition:

- Portfolio overview
- Supplier detail
- Evidence workflows
- Compliance mapping
- Remediation
- Supplier-facing collaboration
- Trust and methodology

RelayOps deliberately narrows the domain and deepens the system behavior.

It adds:

- A more explicit command boundary
- Asynchronous lifecycle semantics
- Execution-time policy revalidation
- Idempotency conflict handling
- Atomic parent-item transitions
- Strict restored-state coherence
- Immutable operational history
- Recovery-aware read models
- Deterministic audit reconstruction

The progression is therefore not primarily visual.

It is a progression from a broad workflow product toward deeper operational and distributed-system semantics.

### Progression from Project 4

Billing Recovery crossed the external-execution boundary through Stripe test-mode behavior.

RelayOps does not attempt to exceed it by adding another real API call.

Instead, it goes deeper on the safety and evidence semantics surrounding execution:

- When does a failed-looking operation remain ambiguous?
- What evidence permits another attempt?
- What happens if the decision becomes stale?
- How should idempotent command reuse differ from conflicting reuse?
- How is original history preserved after recovery?
- What state is trustworthy after restoration?
- How can audit remain consistent without a parallel mutable store?

This avoids treating external API usage as the only form of technical progression.

## What a production roadmap would prioritize

### Phase 1: Server-owned recovery foundation

- Authentication and workspace membership
- Server-side delivery and endpoint repositories
- Transactional replay commands
- Durable idempotency records
- Role and policy enforcement
- Server-side audit events

### Phase 2: Secure execution

- Durable replay queue
- Worker-owned transitions
- Secure payload retrieval
- Request signing
- Destination restrictions
- Network isolation
- Timeouts
- Rate and concurrency controls

### Phase 3: Reconciliation and operational scale

- Ambiguous replay-outcome reconciliation
- Cursor-based delivery search
- Alerting and operational SLOs
- Replay cancellation where technically safe
- Customer-visible status notifications
- Support escalation workflows

### Phase 4: Controlled bulk recovery

- Per-item eligibility
- Mixed acknowledgement handling
- Partial authorization
- Rate-aware scheduling
- Partial-failure management
- Item-level retry
- Larger-action approval controls
- Complete audit and export behavior

### Phase 5: Assistive intelligence

- Failure-cluster summarization
- Investigation guidance
- Support-note drafting
- Documentation retrieval
- Policy explanation

AI assistance would remain subordinate to deterministic authorization and canonical execution evidence.

## Questions for further product discovery

Before production development, the product team would need to validate:

### Customer workflow

- How frequently do customers need manual replay?
- Which roles investigate failures today?
- When do customers escalate to provider support?
- Which tools and logs must they currently combine?
- What evidence do they consider sufficient before replay?

### Event risk

- Which event types can safely tolerate duplicates?
- Which event types create irreversible downstream effects?
- Which customers enforce receiver-side idempotency?
- Should high-risk events require dual approval?

### Retention and access

- How long must payloads remain replayable?
- Which users may view payload evidence?
- What redaction rules vary by event type or customer?
- What evidence must be retained for regulatory or contractual purposes?

### Operational policy

- When should a failed replay become eligible again?
- Which incidents should block replay?
- What rate and concurrency limits should apply?
- When can an operator cancel queued work?
- How should ambiguous execution outcomes be reconciled?

### Platform strategy

- Is replay a self-service customer feature, a support-assisted tool, or both?
- Should recovery policy be standardized or configurable by workspace?
- Which capabilities belong in the customer console versus internal platform tooling?
- How should API-based recovery differ from UI-based recovery?

## Evaluation guide

An evaluator can understand the project most effectively by following this sequence:

1. Open the Production operational overview.
2. Review endpoint health and incident context.
3. Open the Delivery explorer.
4. Inspect `dlv_b7e2d911`.
5. Compare observed evidence, deterministic assessment, and replay eligibility.
6. Request the replay and observe its lifecycle.
7. Return to the delivery and verify recovery-aware classification.
8. Open replay detail and review execution evidence.
9. Open the Audit log and trace the lifecycle across resources.
10. Switch to Sandbox and execute `dlv_g6e1c750`.
11. Confirm that the failed replay remains failure evidence rather than recovery.
12. Inspect `dlv_c3a9e047` and confirm that ambiguous receiver acceptance blocks replay.

This walkthrough demonstrates the product’s main thesis:

> Recovery is not a retry button. It is an evidence, policy, execution, and audit workflow.

## Final reflection

RelayOps is intentionally narrower than a complete webhook platform.

That narrowness made room for greater depth in the parts that matter most:

- What the system knows
- What the system only suspects
- What the system cannot know
- What action is currently allowed
- What the operator must still confirm
- What must be revalidated
- What state can be trusted
- What history must remain immutable
- What evidence should appear in the audit trail

The result is a working product prototype that treats recovery as a governed operational capability rather than a convenient resend action.