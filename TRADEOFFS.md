# RelayOps — Product and Technical Trade-offs

RelayOps is a frontend prototype of a webhook operations and recovery console. Its design prioritizes evidence integrity, safe recovery decisions, and operational traceability over feature breadth.

This document records the most important product and system decisions, the alternatives considered, and the conditions under which those decisions should change.

## Decision principles

The following principles guided the implementation:

1. Preserve observed facts instead of rewriting history.
2. Treat uncertainty as a first-class operational state.
3. Use deterministic policy for consequential actions.
4. Revalidate safety when an action is executed.
5. Fail closed when canonical evidence is missing or contradictory.
6. Keep simulated behavior explicit.
7. Avoid creating parallel sources of truth.
8. Demonstrate production-relevant boundaries without pretending the prototype is production infrastructure.

## Decision summary

| Decision | Chosen approach | Main trade-off |
|---|---|---|
| Recovery scope | Single-delivery replay | Safer and more explainable, but lower operational throughput |
| Replay authorization | Deterministic policy | Inspectable and reproducible, but less flexible than human judgment |
| Ambiguous outcomes | Block replay | Reduces duplicate risk, but may delay legitimate recovery |
| Delivery history | Preserve original attempts | Maintains audit integrity, but requires a separate recovery model |
| Safety timing | Revalidate at command and execution time | Reduces stale-decision risk, but adds orchestration complexity |
| Operator confirmation | Contextual acknowledgement | Makes residual risk explicit, but cannot prove downstream readiness |
| Execution | Deterministic simulation adapters | Supports coherent workflows without external side effects, but not real network behavior |
| Replay persistence | Environment-scoped `sessionStorage` overlay | Demonstrates lifecycle persistence, but is not durable or multi-user |
| Replay writes | Atomic parent-job and item updates | Prevents partial local state, but does not provide database-grade transactions |
| Restored state | Strict coherence validation | Prevents unsafe interpretation, but discards malformed local state |
| Audit model | Projection from canonical replay state | Avoids a second mutable truth, but is not a durable compliance ledger |
| Environment selection | One authoritative global context | Prevents conflicting scopes, but does not support cross-environment comparison |
| Historical bulk replay | Preserve aggregate facts without expansion | Avoids fabricated evidence, but limits item-level investigation |
| AI usage | No AI in authorization or execution | Protects safety and explainability, but forgoes assisted investigation |
| Frontend boundary | Async repository abstraction | Keeps migration path open, but cannot reproduce backend concurrency guarantees |

---

## 1. Single-delivery replay instead of interactive bulk recovery

### Decision

RelayOps supports recovery of one eligible delivery at a time.

The product displays a historical bulk replay record, but does not provide interactive bulk replay creation.

### Why

Single-delivery recovery makes it possible to present and verify:

- The original delivery evidence
- The endpoint state
- The retry state
- The payload-retention state
- The acknowledgement required for that failure pattern
- The requesting operator
- The resulting execution evidence
- The relationship between the replay and the original delivery

This produces a high-integrity workflow in which the operator can understand exactly what is being resent and why it is currently permitted.

### Alternatives considered

#### Interactive bulk replay

A bulk workflow would better represent high-volume operational recovery, but introduces materially different problems:

- Per-item eligibility evaluation
- Mixed acknowledgements across failure categories
- Partial execution
- Rate limiting
- Concurrency controls
- Job cancellation
- Progress aggregation
- Item-level retry
- Partial authorization failure
- Larger blast radius
- More complex idempotency semantics

Adding only a bulk-selection interface without these controls would create visual breadth without credible operational depth.

#### Automatic replay

Automatic recovery could reduce operator effort, but would require stronger confidence in downstream idempotency, endpoint recovery, incident status, and ambiguous delivery outcomes than the prototype can establish.

### Consequence

RelayOps demonstrates a deeper safety model for a narrow recovery action rather than a broader but weaker execution surface.

### Revisit when

Bulk replay should be added only after the system has:

- Durable backend state
- Per-item eligibility snapshots
- Queue and worker infrastructure
- Rate and concurrency controls
- Cancellation semantics
- Partial-failure handling
- Receiver-specific idempotency controls
- Server-side audit retention

---

## 2. Deterministic replay policy instead of AI authorization

### Decision

Delivery assessment, replay eligibility, acknowledgement selection, and command validation are deterministic.

No LLM decides whether a replay is permitted.

### Why

A replay can create duplicate downstream actions such as:

- Duplicate subscription changes
- Duplicate fulfillment
- Duplicate notifications
- Repeated billing-related processing
- Conflicting customer or account state

The rules governing this action therefore need to be:

- Inspectable
- Reproducible
- Testable
- Stable across refreshes
- Explainable to operators
- Conservative when evidence is incomplete

An AI-generated recommendation could sound confident while relying on missing, contradictory, or semantically weak evidence.

### Alternatives considered

#### LLM-based root-cause classification

An LLM could summarize attempts and propose a likely cause. This could improve investigation speed, but should not convert a hypothesis into canonical delivery truth.

#### LLM-based replay recommendation

This would create a probabilistic authorization boundary for a consequential action. The product could not guarantee that the same evidence always produces the same decision.

#### Human-only authorization

Leaving the entire decision to operators would support exceptional cases, but would also produce inconsistent decisions and weaken the product’s safety guarantees.

### Consequence

RelayOps may be more conservative than an experienced operator, but its authorization behavior is explainable and repeatable.

### Appropriate future AI role

AI could assist with:

- Summarizing long attempt histories
- Grouping similar failure evidence
- Drafting incident or support notes
- Explaining deterministic blockers in simpler language
- Suggesting investigation steps
- Identifying likely related documentation

AI should not:

- Override replay blockers
- Invent missing evidence
- Determine whether an ambiguous receiver processed an event
- Rewrite canonical execution results
- Authorize replay independently

---

## 3. Unknown outcomes are not treated as confirmed failures

### Decision

RelayOps distinguishes a confirmed receiver failure from an outcome where receiver acceptance is unknown.

An ambiguous outcome blocks replay.

### Why

A confirmed HTTP response proves that the receiver returned a particular status.

A timeout or missing response does not necessarily prove that the receiver rejected the request. The receiver may have:

- Processed the request before the connection failed
- Accepted the request but failed to return a response
- Committed a downstream side effect before timing out
- Returned a response that the sender never received

Automatically classifying this as a failed delivery would hide duplicate-side-effect risk.

### Alternatives considered

#### Treat every non-success as failed

This produces a simpler status model and a more permissive recovery workflow, but collapses materially different evidence states.

#### Allow replay with a warning

A warning transfers the risk to the operator without first requiring downstream confirmation. For irreversible or non-idempotent events, that is not a sufficient safeguard.

### Consequence

Some deliveries cannot be recovered immediately through RelayOps. The operator must first verify downstream state.

This increases recovery time in ambiguous cases but preserves the distinction between:

- Known rejection
- Known acceptance
- Unknown acceptance

---

## 4. Preserve original delivery history and model recovery separately

### Decision

A successful replay does not change the original delivery attempts.

The original delivery remains exhausted, while the aggregate assessment becomes `recovered_by_replay` based on additional coherent replay evidence.

### Why

The original attempts describe what happened during automatic delivery. Rewriting one of those attempts after a later replay would create a false history.

For the canonical Production recovery:

- The original eight HTTP 503 attempts remain unchanged.
- The replay records separate simulated HTTP 200 acceptance.
- The aggregate can truthfully state that the delivery was recovered later.

This separates:

- Original delivery truth
- Recovery execution truth
- Current operational assessment

### Alternatives considered

#### Change the original delivery state to succeeded

This produces a simpler UI but obscures the fact that automatic delivery exhausted its retries.

#### Add the replay as a ninth delivery attempt

This would merge two distinct execution mechanisms:

- Automatic delivery attempts
- Operator-authorized recovery

The replay has its own requester, acknowledgement, idempotency key, lifecycle, and audit trail, so it should remain a separate resource.

#### Leave the delivery permanently classified as failed

This preserves history but does not communicate that the business event was later accepted through recovery.

### Consequence

The read model is more sophisticated because it must combine immutable delivery evidence with coherent replay history.

The resulting semantics are more accurate and auditable.

---

## 5. Revalidate safety at execution time

### Decision

Replay safety is evaluated at multiple points:

1. When presenting the delivery assessment
2. When submitting the replay command
3. Before producing a terminal execution result

### Why

The state observed when an operator opens a dialog can become stale.

Between review and execution:

- An automatic retry may succeed
- Another replay may start
- Another replay may complete
- The endpoint may become disabled
- A blocking incident may become active
- Payload availability may change
- The operator’s authorization may change

The command therefore resolves canonical facts again instead of trusting the previously rendered assessment.

The lifecycle also revalidates safety before simulated execution. If a new blocker appears, the replay can be skipped rather than executed against stale assumptions.

### Alternatives considered

#### Trust the original assessment

This is simpler, but turns a UI snapshot into an authorization artifact.

#### Lock all related state when the dialog opens

A production system could reserve the delivery temporarily, but doing so would require backend coordination, expiry behavior, and recovery from abandoned dialogs.

#### Validate only when the job is created

This is stronger than relying on the UI, but does not protect against state changes while the job is queued.

### Consequence

The workflow contains more validation paths, but all paths reuse canonical policy rather than creating page-specific rules.

---

## 6. Contextual acknowledgement instead of a generic confirmation

### Decision

The acknowledgement presented to the operator depends on the evidence category.

Examples include:

- Confirming receiver recovery after repeated HTTP 503 responses
- Confirming authentication and signature-verification review after repeated HTTP 401 responses
- Acknowledging duplicate-side-effect risk for other eligible scenarios

### Why

A generic checkbox such as “I understand the risk” does not help the operator understand what must be verified.

Different failure patterns leave different residual uncertainties:

- HTTP 503 suggests temporary receiver unavailability, but does not prove recovery.
- HTTP 401 suggests an authentication or signature-verification problem, but does not establish which side is misconfigured.
- Other errors may require a more general duplicate-risk confirmation.

### Alternatives considered

#### One universal acknowledgement

Simpler to implement, but operationally weak and easy to accept without meaningful review.

#### Automatically infer that the receiver recovered

The sender does not possess sufficient evidence to make this claim.

#### Free-text justification only

A note can add context, but unstructured text does not ensure that the required safety condition was considered.

### Consequence

Acknowledgement becomes a deliberate product control rather than ceremonial confirmation.

It still does not prove external system readiness. That limitation remains explicit.

---

## 7. Deterministic simulation instead of real webhook execution

### Decision

RelayOps never sends a real webhook request.

Two deterministic simulation adapters implement the canonical outcomes:

- Production `dlv_b7e2d911` returns simulated HTTP 200 acceptance.
- Sandbox `dlv_g6e1c750` returns simulated HTTP 401 evidence.

### Why

Real execution would require:

- Secure payload retrieval
- Secret and signing-key management
- Network egress controls
- Destination allowlisting
- Request signing
- Timeouts
- Retry and cancellation semantics
- Protection against arbitrary endpoints
- Durable ambiguous-outcome reconciliation
- Legal and security review

A frontend portfolio prototype cannot implement these responsibilities credibly.

Deterministic adapters still allow the product to demonstrate:

- Queued and running states
- Successful, failed, and skipped outcomes
- Recovery-aware classification
- Stable audit projection
- Safe evidence display
- Refresh-safe lifecycle behavior

### Alternatives considered

#### Call a public test endpoint

This would prove that a network call occurred, but would not represent secure customer webhook execution. It would add technical novelty without solving the important safety problems.

#### Randomized outcomes

Randomness could make the demo appear dynamic, but would weaken reproducibility and make audit results unstable.

#### Immediate terminal results

Skipping the lifecycle would simplify implementation but would not demonstrate queued work, reconciliation, or execution-time revalidation.

### Consequence

The workflow behavior is real, while the external side effect is explicitly simulated.

The prototype demonstrates orchestration and product policy, not production webhook infrastructure.

---

## 8. Browser-local overlay instead of backend persistence

### Decision

New simulated replay state is stored in an environment-scoped `sessionStorage` overlay.

Fixture-backed operational data remains unchanged.

### Why

The overlay provides enough persistence to demonstrate:

- Job creation
- Lifecycle advancement
- Refresh-safe state
- Idempotent command behavior
- Delivery reassessment
- Audit reconstruction
- Environment isolation
- Restored-state validation

Using `sessionStorage` also keeps the prototype self-contained and avoids presenting a lightweight backend as production-ready infrastructure.

### Alternatives considered

#### In-memory React state

This would lose the replay after refresh and would make lifecycle and audit behavior less credible.

#### `localStorage`

This would persist longer, but could surprise evaluators by retaining demo state indefinitely across sessions.

#### Supabase or another hosted backend

This would add durable storage quickly, but would not automatically solve:

- Transaction design
- Authorization
- Concurrency
- Worker execution
- Audit integrity
- Secrets management
- Multi-tenant isolation

It would risk overstating the prototype’s production readiness.

### Consequence

Replay state is limited to one browser tab session and is not shared between users or devices.

The limitation is disclosed in the product and README.

### Production replacement

A production version would use:

- Authenticated server-side commands
- Transactional persistence
- Version or lock-based concurrency control
- A durable queue
- Worker-owned lifecycle transitions
- Server-side reconciliation
- Durable audit retention

---

## 9. Atomic parent-job and item persistence

### Decision

Replay job and replay item state are written together through one overlay operation.

Lifecycle transitions also update the parent and item atomically from the overlay’s perspective.

### Why

A replay has related parent and item facts.

Writing them separately could produce states such as:

- Completed parent with a running item
- Running parent with a terminal item
- Retained job without its required item
- Delivery recovery inferred from only half of a transition

Even in a browser prototype, these contradictory states would weaken replay and audit semantics.

### Alternatives considered

#### Independent writes

Simpler to implement, but creates observable intermediate states and harder recovery behavior.

#### Repair contradictory state during reads

Automatic repair could conceal persistence defects and requires choosing which record is authoritative.

#### Store one denormalized replay object

This would reduce synchronization problems for the single-item prototype, but would not model the parent-item boundary needed for future bulk execution.

### Consequence

The overlay has additional validation and write orchestration.

This is still not equivalent to a database transaction. It demonstrates the intended invariant within the prototype boundary.

---

## 10. Strict coherence validation for restored state

### Decision

Restored replay state must satisfy canonical structural and semantic invariants before it can affect delivery assessment or audit projection.

Malformed overlay snapshots are rejected rather than partially trusted.

### Why

Browser storage can be:

- Stale
- Manually modified
- Partially written
- Created by an older schema
- Internally contradictory

A replay record should not become recovery evidence merely because it contains a terminal-looking status.

Validation checks include:

- Known execution mode and outcome values
- Workspace and environment alignment
- Parent-item relationship
- Timestamp chronology
- Count consistency
- Status compatibility
- Required execution evidence
- Canonical single-item structure for simulated replays

### Alternatives considered

#### Best-effort parsing

This preserves more state, but can allow malformed records to influence authorization and recovery.

#### Trust TypeScript types

Compile-time types do not validate data restored from browser storage.

#### Repair malformed data automatically

Repair rules could invent facts, obscure corruption, or transform contradictory evidence into apparently valid recovery history.

### Consequence

A malformed snapshot may be discarded, causing local demo state to disappear.

That is preferable to treating incoherent data as operational evidence.

---

## 11. Audit projection instead of a separate mutable audit store

### Decision

Simulated replay lifecycle events are projected deterministically from canonical replay state.

They are not independently persisted as mutable audit records.

Recorded platform audit fixtures remain separate factual records.

### Why

Persisting both replay state and simulated audit state would create two sources of truth.

They could disagree if:

- A lifecycle transition succeeds but its audit write fails
- An audit write is duplicated
- Replay state is restored without its corresponding audit records
- Audit state claims completion while the replay remains running

Projection ensures that a coherent replay state always produces the same audit events.

### Projection guarantees

The implementation provides:

- Stable deterministic event IDs
- Semantic deduplication
- Chronological ordering
- Environment isolation
- Workspace scoping
- Actor and role resolution
- Recorded-versus-simulated provenance
- Safe event-specific details
- Valid related-resource links

A simulated replay produces:

| Replay state | Projected events |
|---|---|
| Queued | Requested |
| Running | Requested, started |
| Completed | Requested, started, completed |
| Failed | Requested, started, failed |
| Skipped | Requested, started, skipped |

### Alternatives considered

#### Write an audit record at every transition

This more closely resembles a production event log, but requires transactional coupling or durable event delivery to stay consistent.

#### Store audit events only

This could support event sourcing, but would require replay state to be reconstructed entirely from events and would substantially change the prototype architecture.

#### Generate audit events inside pages

This would couple audit behavior to navigation and could make lifecycle evidence appear only after visiting a particular route.

### Consequence

The Audit log is a read-only operational projection, not a compliance-grade immutable ledger.

### Production replacement

A production implementation should emit durable audit or domain events from the same server-side transaction that changes replay state, commonly using an outbox pattern.

---

## 12. One authoritative environment context

### Decision

Production or Sandbox is selected globally.

Pages do not introduce independent environment selectors.

### Why

An independent page-level environment filter could disagree with the application context and create misleading combinations such as:

- Production delivery with Sandbox endpoint data
- Sandbox replay viewed in a Production audit list
- Cross-environment resource links
- Wrong-environment detail disclosure

The selected environment scopes:

- Overview telemetry
- Endpoints
- Deliveries
- Replay state
- Audit events
- Resource resolution
- Idempotency evaluation

Workspace-wide audit records remain visible in both contexts and are explicitly labeled `Workspace-wide`.

### Alternatives considered

#### Per-page environment filters

This increases flexibility but also increases the risk of inconsistent context.

#### Show both environments together

This may help internal platform teams, but customer-facing operational work benefits from a clear execution boundary.

### Consequence

Cross-environment comparison is not available.

That limitation is intentional because recovery actions should always occur within an explicit environment.

---

## 13. Preserve incomplete historical bulk facts without fabrication

### Decision

RelayOps preserves the historical recorded bulk replay exactly as supplied:

- 18 total items
- 15 succeeded
- 1 failed
- 2 skipped
- One retained displayed skipped item

The system does not generate the other 17 item records.

### Why

Aggregate counts can be valid even when the prototype contains only one representative item.

Creating the missing items would require inventing:

- Delivery IDs
- Outcomes
- Timestamps
- HTTP evidence
- Failure reasons
- Related resources

Those fabricated records could then appear as operational or audit evidence.

### Alternatives considered

#### Expand the aggregate into synthetic items

This would make the UI appear more complete but would create unsupported facts.

#### Remove the historical replay

This would avoid incomplete data but would eliminate a useful recorded-versus-simulated provenance case.

#### Require every item before accepting the parent

Appropriate for newly created simulated single replays, but too strict for a preserved historical bulk summary.

### Consequence

The historical replay supports parent-level lifecycle and audit traceability, while item-level detail remains intentionally incomplete.

No missing item is treated as failed, succeeded, or skipped.

---

## 14. Correlation is not presented as confirmed root cause

### Decision

RelayOps describes observable failure patterns and possible investigation directions without claiming unsupported causality.

### Why

Repeated HTTP 401 responses with signature-verification-related text may indicate:

- Sender signing configuration
- Receiver verification configuration
- Secret mismatch
- Clock or timestamp handling
- A deployment or configuration change

The sender-side evidence alone may not prove which explanation is correct.

Similarly, a platform incident can be relevant without proving that it caused a particular delivery failure.

### Alternatives considered

#### Assign a definitive root cause from response text

This would make the product appear more decisive but could mislead operators.

#### Avoid interpretation entirely

Showing raw attempts alone would preserve facts but provide less operational value.

### Consequence

RelayOps provides bounded assessment:

- What was observed
- What remains unknown
- What should be checked next
- Whether replay is currently allowed

This supports investigation without converting correlation into fact.

---

## 15. Repository-owned aggregates instead of page-level fixture joins

### Decision

Pages consume repository-supplied aggregates.

They do not independently import fixtures or reconstruct replay and audit relationships.

### Why

Page-level joins would distribute domain behavior across routes.

That could lead to:

- Different replay history on delivery and replay pages
- Different environment filtering in separate screens
- Inconsistent actor resolution
- Duplicate lifecycle reconciliation
- Audit events that disagree with replay detail
- UI components becoming authorization logic

The repository owns:

- Workspace and environment scoping
- Canonical fact resolution
- Replay lifecycle reconciliation
- Replay-history aggregation
- Audit projection
- Related-resource resolution

### Alternatives considered

#### Direct fixture imports in each page

Faster for a static prototype, but creates tight coupling and inconsistent behavior as workflows become stateful.

#### Global application store containing all joined data

Could simplify consumption, but would move orchestration into client state and make a later backend boundary less clear.

### Consequence

The repository layer contains more composition logic, but pages remain presentation-oriented.

Repository functions are asynchronous even though the current data is local, preserving a plausible migration path to backend APIs.

---

## 16. Fail closed when evidence is missing or contradictory

### Decision

Missing, malformed, or contradictory canonical facts produce an unavailable assessment or block recovery.

They do not produce optimistic defaults.

### Examples

RelayOps refuses to infer replay safety when:

- Required delivery references are missing
- The endpoint cannot be resolved
- Parent and item replay states contradict each other
- Restored timestamps are invalid
- Execution outcomes are unknown
- Replay counts do not match the terminal status
- A simulated replay contains zero or multiple items
- A replay belongs to another environment
- A recorded terminal parent is incoherent
- An item has no valid parent

### Alternatives considered

#### Default to eligible unless a blocker is found

This is convenient but unsafe because missing data would silently weaken protection.

#### Show the action but warn about incomplete evidence

This still allows execution without a reliable authorization basis.

### Consequence

Some malformed or incomplete scenarios result in no action being offered.

For a recovery tool, refusing to act is safer than constructing certainty from incomplete state.

---

## 17. Read-only operational audit rather than compliance export

### Decision

The Audit log is inspectable and directly addressable, but it cannot be edited or exported.

### Why

A credible compliance export requires more than a download button. It would need:

- Durable server-side retention
- Completeness guarantees
- Tamper protection
- Access control
- Export scope and schema
- Time-zone and timestamp policy
- Data-retention policy
- Potential signing or verification
- Handling of sensitive data
- Evidence of actor identity

A frontend-generated file from fixture and browser-local state would not provide these guarantees.

### Alternatives considered

#### Add a non-functional export button

Rejected because it would imply a capability that does not exist.

#### Export the currently visible table

Technically possible, but potentially incomplete due to filters, environment scope, and browser-local state.

### Consequence

RelayOps demonstrates operational traceability without presenting itself as a compliance system of record.

---

## 18. Manual verification over a superficial automated test suite

### Decision

The prototype is verified through:

- TypeScript checking
- Production builds
- Canonical workflow execution
- Adversarial state checks
- Cross-environment regression checks
- Fixture-integrity checks

A full automated test suite is not included in the current project scope.

### Why

The project prioritized implementation of:

- Domain semantics
- Execution-time safety
- Idempotency
- Atomic local persistence
- State coherence
- Audit projection
- Cross-resource traceability

Adding a few shallow tests primarily for repository optics would not materially improve confidence.

### Alternatives considered

#### Add a small number of happy-path unit tests

This would increase visible test coverage but could create a false sense of completeness.

#### Expand the project to comprehensive testing

This would be valuable, but would extend the project beyond its intended cycle and reduce time available for portfolio progression.

### Consequence

The absence of automated tests remains a real limitation, not something hidden by the documentation.

### Highest-priority future tests

A production-oriented test strategy should include:

- Unit tests for assessment precedence
- Table-driven replay-eligibility tests
- Property tests for parent-item coherence
- Idempotency conflict tests
- Atomic persistence failure tests
- Environment-isolation tests
- Lifecycle reconciliation tests with controlled time
- Audit projection and deduplication tests
- Cross-route integration tests
- End-to-end canonical replay scenarios

---

## What would change in production?

The product model can remain, but the execution infrastructure would need to change substantially.

A production architecture would introduce:

1. Authenticated user, workspace, membership, and role resolution
2. Server-side delivery and endpoint repositories
3. Transactional replay command handling
4. Durable idempotency records
5. Queue-backed replay execution
6. Worker-owned lifecycle transitions
7. Secure payload retrieval and request signing
8. Destination restrictions and network isolation
9. Timeouts and ambiguous-outcome reconciliation
10. Durable audit events written through an outbox or equivalent mechanism
11. Concurrency and rate controls
12. Monitoring, alerting, and operational SLOs
13. Retention and data-governance policies
14. Automated unit, integration, contract, and end-to-end testing

The frontend should never directly possess the payload, signing secret, or authority required to execute a production replay.

## Deliberately unresolved questions

The prototype does not claim to settle several production decisions:

- How long should replayable payloads be retained?
- Which event types require stronger acknowledgement or dual approval?
- Should some receiver integrations be considered safely idempotent?
- How should ambiguous replay outcomes be reconciled?
- When should a failed replay become eligible again?
- Should blocking incidents apply globally, by event type, or by endpoint?
- What replay rate and concurrency limits should apply?
- What evidence must be retained for compliance?
- Which roles may view sanitized payload evidence?
- When should bulk recovery require approval from a second operator?

These questions depend on customer contracts, event semantics, infrastructure guarantees, and organizational risk tolerance. RelayOps exposes the boundaries rather than inventing universal answers.

## Final perspective

The central trade-off in RelayOps is deliberate:

> Recovery speed is valuable, but not at the cost of rewriting evidence, hiding uncertainty, or authorizing consequential actions from stale or incoherent state.

The prototype therefore optimizes for a recovery workflow that is narrow, explainable, reversible where possible, and honest about what it can and cannot prove.