import type {
  AssessmentClassification,
  DeliveryAssessment,
  DeliveryAssessmentInput,
  DeliveryAttemptRecord,
  EvidenceFinding,
  OperatorPermission,
  RecommendedAction,
  ReplayBlocker,
  ReplayEligibilityResult,
} from "@/types"

// ---- Authorization policy ----

const REPLAY_PERMITTED_ROLES = ["integration_admin", "integration_developer"] as const

export function evaluateOperatorPermission(
  role: DeliveryAssessmentInput["operatorRole"]
): OperatorPermission {
  const permitted = (REPLAY_PERMITTED_ROLES as readonly string[]).includes(role)
  return {
    permission: permitted ? "permitted" : "not_permitted",
    role,
    ruleId: "auth-role-policy",
    explanation: permitted
      ? `${roleLabel(role)} role is permitted to request replays.`
      : `${roleLabel(role)} role is not permitted to request replays.`,
  }
}

function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    integration_admin: "Integration Admin",
    integration_developer: "Integration Developer",
    observer: "Observer",
    platform_support: "Platform Support",
    platform_system: "Platform System",
  }
  return labels[role] ?? role
}

// ---- Evidence helpers ----

function hasSuccessfulAttempt(attempts: DeliveryAttemptRecord[]): DeliveryAttemptRecord | null {
  return attempts.find((a) => a.outcome === "success") ?? null
}

function hasResponselessAttempt(attempts: DeliveryAttemptRecord[]): boolean {
  return attempts.some((a) => a.response.responseAbsent)
}

function attemptsByCategory(
  attempts: DeliveryAttemptRecord[],
  category: string
): DeliveryAttemptRecord[] {
  return attempts.filter((a) => a.observedFailureCategory === category)
}

function hasHttp401Evidence(attempts: DeliveryAttemptRecord[]): boolean {
  return attempts.some((a) => a.httpStatusCode === 401)
}

function hasSignatureRelatedResponseText(attempts: DeliveryAttemptRecord[]): boolean {
  return attempts.some(
    (a) =>
      a.httpStatusCode === 401 &&
      a.response.sanitizedBody != null &&
      /signature|signing|secret|hmac|verification/i.test(a.response.sanitizedBody)
  )
}

function hasHttp429ThenSuccess(attempts: DeliveryAttemptRecord[]): boolean {
  const has429 = attempts.some((a) => a.httpStatusCode === 429)
  const hasSuccess = hasSuccessfulAttempt(attempts) !== null
  return has429 && hasSuccess
}

function hasUnknownOutcome(attempts: DeliveryAttemptRecord[]): boolean {
  return attempts.some((a) => a.outcome === "outcome_unknown")
}

// ---- Evidence-finding formatting helpers ----

function formatAttemptNumbers(attempts: DeliveryAttemptRecord[]): string {
  const nums = attempts.map((a) => a.attemptNumber)
  if (nums.length === 1) return `Attempt ${nums[0]}`
  if (nums.length === 2) return `Attempts ${nums[0]} and ${nums[1]}`
  return `Attempts ${nums.slice(0, -1).join(", ")}, and ${nums[nums.length - 1]}`
}

function isConsecutive(nums: number[]): boolean {
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] !== nums[i - 1] + 1) return false
  }
  return true
}

function formatRangeOrList(attempts: DeliveryAttemptRecord[]): string {
  const nums = attempts.map((a) => a.attemptNumber).sort((a, b) => a - b)
  if (nums.length === 1) return `Attempt ${nums[0]}`
  if (isConsecutive(nums)) return `Attempts ${nums[0]}–${nums[nums.length - 1]}`
  return formatAttemptNumbers(attempts)
}

// ---- Evidence findings ----

function buildEvidenceFindings(input: DeliveryAssessmentInput): EvidenceFinding[] {
  const { delivery, attempts } = input
  const findings: EvidenceFinding[] = []

  const successAttempt = hasSuccessfulAttempt(attempts)
  if (successAttempt) {
    if (successAttempt.attemptNumber === 1) {
      findings.push({
        ruleId: "ev-success-first",
        text: `Attempt ${successAttempt.attemptNumber} was accepted with HTTP ${successAttempt.httpStatusCode}.`,
      })
    } else {
      findings.push({
        ruleId: "ev-success-after-retry",
        text: `Attempt ${successAttempt.attemptNumber} was accepted with HTTP ${successAttempt.httpStatusCode}. Earlier attempts did not produce confirmed delivery.`,
      })
    }
  }

  const http503s = attemptsByCategory(attempts, "http_503")
  if (http503s.length > 0) {
    findings.push({
      ruleId: "ev-http-503",
      text: `${formatRangeOrList(http503s)} returned HTTP 503.`,
    })
  }

  const http401s = attemptsByCategory(attempts, "http_401")
  if (http401s.length > 0) {
    findings.push({
      ruleId: "ev-http-401",
      text: `${formatRangeOrList(http401s)} returned HTTP 401.`,
    })
  }

  const http429s = attemptsByCategory(attempts, "http_429")
  if (http429s.length > 0) {
    findings.push({
      ruleId: "ev-http-429",
      text: `Attempt ${http429s[0].attemptNumber} returned HTTP 429.`,
    })
  }

  const timeouts = attempts.filter((a) => a.observedFailureCategory === "timeout")
  if (timeouts.length > 0) {
    findings.push({
      ruleId: "ev-timeout",
      text:
        timeouts.length === 1
          ? `Attempt ${timeouts[0].attemptNumber} ended without a receiver response.`
          : `${formatRangeOrList(timeouts)} ended without a receiver response.`,
    })
  }

  const terminated = attempts.filter((a) => a.observedFailureCategory === "connection_terminated")
  if (terminated.length > 0) {
    findings.push({
      ruleId: "ev-connection-terminated",
      text: `${formatRangeOrList(terminated)} ended without receiver responses following connection termination.`,
    })
  }

  if (delivery.state === "exhausted" && delivery.maxAttempts > 0) {
    findings.push({
      ruleId: "ev-retry-limit",
      text: `The configured retry limit of ${delivery.maxAttempts} attempts was reached.`,
    })
  }

  if (delivery.state === "retrying" && delivery.nextRetryAt) {
    findings.push({
      ruleId: "ev-next-retry",
      text: `Another automatic retry is scheduled for ${formatTimeOnly(delivery.nextRetryAt)} UTC.`,
    })
  }

  if (input.endpointStatus === "disabled") {
    findings.push({
      ruleId: "ev-endpoint-disabled",
      text: "The destination endpoint is currently disabled.",
    })
  }

  if (input.activeReplayJobIds.length > 0) {
    findings.push({
      ruleId: "ev-active-replay",
      text: "This delivery is already included in an active replay job.",
    })
  }

  if (input.blockingIncidents.length > 0) {
    findings.push({
      ruleId: "ev-blocking-incident",
      text: `An active platform incident is blocking replay: ${input.blockingIncidents[0].title}.`,
    })
  }

  if (input.event?.payloadState === "expired") {
    findings.push({
      ruleId: "ev-payload-expired",
      text: "The event payload has expired and is no longer available.",
    })
  }

  if (input.event?.payloadState === "redacted") {
    findings.push({
      ruleId: "ev-payload-redacted",
      text: "The event payload has been redacted and is no longer available.",
    })
  }

  if (findings.length === 0) {
    findings.push({
      ruleId: "ev-no-evidence",
      text: "No specific evidence findings were recorded.",
    })
  }

  return findings.slice(0, 4)
}

function formatTimeOnly(iso: string): string {
  const d = new Date(iso)
  const hh = String(d.getUTCHours()).padStart(2, "0")
  const mm = String(d.getUTCMinutes()).padStart(2, "0")
  return `${hh}:${mm}`
}

// ---- Fail-closed validation ----

function validateAssessmentInputs(input: DeliveryAssessmentInput): string | null {
  if (!input.event) {
    return "The event reference for this delivery could not be resolved."
  }
  if (!input.endpoint) {
    return "The endpoint reference for this delivery could not be resolved."
  }
  if (input.endpointStatus === null) {
    return "The endpoint status for this delivery could not be resolved."
  }
  if (input.endpointRetryMaxAttempts === null) {
    return "The canonical endpoint retry configuration could not be resolved."
  }
  if (input.attempts.length === 0) {
    return "No attempt evidence is available for this delivery."
  }
  if (input.delivery.state === "delivered" && !hasSuccessfulAttempt(input.attempts)) {
    return "The delivery state is Delivered but no successful attempt was recorded."
  }
  if (input.delivery.state === "retrying" && !input.delivery.nextRetryAt) {
    return "The delivery is Retrying but no scheduled next-retry timestamp is available."
  }
  if (
    input.delivery.state === "exhausted" &&
    input.endpointRetryMaxAttempts !== null &&
    input.attempts.length !== input.endpointRetryMaxAttempts
  ) {
    return `The delivery is Exhausted but the attempt count (${input.attempts.length}) does not match the canonical endpoint retry limit (${input.endpointRetryMaxAttempts}).`
  }
  return null
}

// ---- Classification ----

function classify(input: DeliveryAssessmentInput): AssessmentClassification {
  const { delivery, attempts } = input

  if (hasSuccessfulAttempt(attempts)) {
    const successAttempt = hasSuccessfulAttempt(attempts)!
    return successAttempt.attemptNumber === 1 ? "delivered" : "delivered_after_retry"
  }

  if (delivery.state === "retrying") return "retrying"

  if (delivery.state === "unknown") return "outcome_unknown"

  if (delivery.state === "exhausted") {
    const canonicalLimit = input.endpointRetryMaxAttempts
    const reachesLimit = canonicalLimit !== null && attempts.length === canonicalLimit

    const all503 =
      reachesLimit &&
      attempts.every(
        (a) =>
          a.outcome === "confirmed_failure" &&
          a.httpStatusCode === 503 &&
          a.observedFailureCategory === "http_503"
      )
    if (all503) return "exhausted_http_503"

    const all401 =
      reachesLimit &&
      attempts.every(
        (a) =>
          a.outcome === "confirmed_failure" &&
          a.httpStatusCode === 401 &&
          a.observedFailureCategory === "http_401"
      )
    if (all401) return "exhausted_http_401"

    return "exhausted_other"
  }

  return "assessment_unavailable"
}

// ---- Headline and explanation ----

function buildHeadline(
  classification: AssessmentClassification,
  input: DeliveryAssessmentInput
): string {
  const { attempts } = input
  switch (classification) {
    case "delivered":
      return "Receiver accepted the delivery on the first attempt."
    case "delivered_after_retry":
      return "Receiver accepted the delivery after retry."
    case "retrying":
      return "Automatic delivery is still in progress."
    case "exhausted_http_503": {
      const count = attemptsByCategory(attempts, "http_503").length
      return `Receiver returned HTTP 503 for all ${count} attempts; retries exhausted.`
    }
    case "exhausted_http_401":
      return "Receiver returned HTTP 401 repeatedly; retries exhausted."
    case "exhausted_other":
      return "Retry limit reached without confirmed delivery."
    case "outcome_unknown":
      return "Receiver acceptance could not be confirmed."
    case "assessment_unavailable":
      return "Assessment unavailable."
  }
}

function buildExplanation(
  classification: AssessmentClassification,
  input: DeliveryAssessmentInput
): string {
  const { attempts } = input
  switch (classification) {
    case "delivered":
      return "The webhook was accepted successfully on the first attempt. No further action is needed."
    case "delivered_after_retry":
      return hasHttp429ThenSuccess(attempts)
        ? "The receiver initially rate-limited the delivery (HTTP 429) and later accepted it. The delivery is complete."
        : "The webhook was accepted after one or more retries. Earlier attempts did not produce confirmed delivery and are retained in the timeline."
    case "retrying": {
      const parts: string[] = ["Another automatic retry is scheduled."]
      if (hasResponselessAttempt(attempts)) {
        parts.push("An earlier attempt ended without a receiver response, which remains inconclusive.")
      }
      if (attempts.some((a) => a.observedFailureCategory === "http_503")) {
        parts.push("Subsequent attempts received confirmed HTTP 503 responses.")
      }
      if (hasHttp401Evidence(attempts)) {
        parts.push("Recorded attempts include confirmed HTTP 401 responses.")
      }
      return parts.join(" ")
    }
    case "exhausted_http_503":
      return "The receiver repeatedly returned HTTP 503 across all attempts and the configured retry limit was reached. The cause of the 503 responses is not established by the recorded evidence."
    case "exhausted_http_401":
      return hasSignatureRelatedResponseText(attempts)
        ? "The receiver returned HTTP 401 repeatedly and the response body contained signature-related text. The recorded evidence does not establish whether the sender or receiver configuration is at fault."
        : "The receiver returned HTTP 401 repeatedly and the retry limit was reached. The recorded evidence does not establish the root cause."
    case "exhausted_other":
      return "The retry policy reached its configured limit without confirmed delivery. No single failure pattern dominates the recorded evidence."
    case "outcome_unknown": {
      const hasConfirmed = attempts.some((a) => a.outcome === "confirmed_failure")
      const hasAmbiguous = hasUnknownOutcome(attempts)
      const parts: string[] = ["No conclusive final receiver outcome was observed."]
      if (hasConfirmed && hasAmbiguous) {
        parts.push("The timeline includes both confirmed HTTP responses and ambiguous transport evidence.")
      }
      parts.push("The receiver may have processed the request, but acceptance could not be confirmed.")
      return parts.join(" ")
    }
    case "assessment_unavailable":
      return "Required delivery or endpoint references could not be resolved. Assessment is unavailable and replay is blocked by default."
  }
}

// ---- Recommended action ----

function buildRecommendedAction(
  classification: AssessmentClassification,
  input: DeliveryAssessmentInput
): { action: RecommendedAction; ruleId: string; text: string } {
  switch (classification) {
    case "delivered":
    case "delivered_after_retry":
      return {
        action: "no_action",
        ruleId: "rec-no-action",
        text: "No action required.",
      }
    case "retrying": {
      const has401 = hasHttp401Evidence(input.attempts)
      if (has401) {
        return {
          action: "allow_retries",
          ruleId: "rec-allow-retries-verify-auth",
          text: "Allow automatic retry processing to continue. Verify the receiver's authentication and signature-verification configuration before the next attempt.",
        }
      }
      return {
        action: "allow_retries",
        ruleId: "rec-allow-retries",
        text: "Allow automatic retry processing to continue.",
      }
    }
    case "exhausted_http_503":
      return {
        action: "confirm_receiver_recovery",
        ruleId: "rec-confirm-recovery-503",
        text: "Confirm receiver recovery before replaying.",
      }
    case "exhausted_http_401":
      return {
        action: "verify_auth_config",
        ruleId: "rec-verify-auth-401",
        text: "Verify the receiver's authentication and signature-verification configuration before replay.",
      }
    case "exhausted_other":
      return {
        action: "review_evidence",
        ruleId: "rec-review-evidence",
        text: "Review the recorded evidence to determine the appropriate next step.",
      }
    case "outcome_unknown":
      return {
        action: "confirm_downstream",
        ruleId: "rec-confirm-downstream",
        text: "Confirm downstream processing before considering replay.",
      }
    case "assessment_unavailable":
      return {
        action: "review_evidence",
        ruleId: "rec-assessment-unavailable",
        text: "Assessment dependencies could not be resolved. Review the delivery record directly.",
      }
  }
}

// ---- Replay eligibility policy ----

function buildReplayEligibility(
  classification: AssessmentClassification,
  input: DeliveryAssessmentInput
): ReplayEligibilityResult {
  const blockers: ReplayBlocker[] = []
  const { delivery, event, endpoint, endpointStatus, activeReplayJobIds, blockingIncidents } = input

  // 1. Missing references
  if (!endpoint || !event || endpointStatus === null || input.endpointRetryMaxAttempts === null) {
    blockers.push({
      reason: "missing_reference",
      ruleId: "replay-missing-reference",
      explanation: "Required delivery, event, or endpoint data could not be resolved.",
    })
    return finalizeEligibility("assessment_unavailable", blockers, false)
  }

  // 2. Already succeeded
  if (delivery.state === "delivered") {
    blockers.push({
      reason: "already_succeeded",
      ruleId: "replay-already-succeeded",
      explanation: "This delivery already succeeded. Replay is not needed.",
    })
    return finalizeEligibility("already_succeeded", blockers, false)
  }

  // 3. Automatic retry active
  if (delivery.state === "retrying" && delivery.nextRetryAt) {
    blockers.push({
      reason: "retry_active",
      ruleId: "replay-retry-active",
      explanation: "An automatic retry is still scheduled. Replay is blocked while automatic retries are active.",
    })
    return finalizeEligibility("retry_active", blockers, false)
  }

  // 4. Outcome unknown / receiver confirmation required
  if (delivery.state === "unknown") {
    blockers.push({
      reason: "confirmation_required",
      ruleId: "replay-confirmation-required",
      explanation: "Receiver acceptance could not be confirmed. Replay may create duplicate side effects.",
    })
    return finalizeEligibility("confirmation_required", blockers, false)
  }

  // 5. Payload unavailable
  if (event.payloadState === "expired") {
    blockers.push({
      reason: "payload_expired",
      ruleId: "replay-payload-expired",
      explanation: "The event payload has expired and is no longer available for replay.",
    })
    return finalizeEligibility("payload_unavailable", blockers, false)
  }
  if (event.payloadState === "redacted") {
    blockers.push({
      reason: "payload_redacted",
      ruleId: "replay-payload-redacted",
      explanation: "The event payload has been redacted and is no longer available for replay.",
    })
    return finalizeEligibility("payload_unavailable", blockers, false)
  }

  // 6. Endpoint disabled
  if (endpointStatus === "disabled") {
    blockers.push({
      reason: "endpoint_disabled",
      ruleId: "replay-endpoint-disabled",
      explanation: "The destination endpoint is disabled. Replay is blocked while the endpoint remains disabled.",
    })
    return finalizeEligibility("endpoint_disabled", blockers, false)
  }

  // 7. Active replay already exists
  if (activeReplayJobIds.length > 0) {
    blockers.push({
      reason: "in_active_replay",
      ruleId: "replay-in-active-replay",
      explanation: "This delivery is already included in an active replay job.",
    })
    return finalizeEligibility("in_active_replay", blockers, false)
  }

  // 8. Active replay-blocking incident
  if (blockingIncidents.length > 0) {
    blockers.push({
      reason: "blocked_by_incident",
      ruleId: "replay-blocked-by-incident",
      explanation: `An active platform incident is blocking replay: ${blockingIncidents[0].title}.`,
    })
    return finalizeEligibility("blocked_by_incident", blockers, false)
  }

  // 9. Eligible
  const recommendedNow =
    classification === "exhausted_http_503" || classification === "exhausted_other"
      ? false
      : classification === "exhausted_http_401"
        ? false
        : true

  return finalizeEligibility("eligible", blockers, recommendedNow)
}

function finalizeEligibility(
  decision: ReplayEligibilityResult["decision"],
  blockers: ReplayBlocker[],
  recommendedNow: boolean
): ReplayEligibilityResult {
  const ruleId = blockers.length > 0 ? blockers[0].ruleId : "replay-eligible"
  const explanation = blockers.length > 0
    ? blockers[0].explanation
    : "All replay-safety gates passed. RelayOps policy permits a future replay request."
  return { decision, ruleId, explanation, blockers, recommendedNow }
}

// ---- Main entry point ----

export function assessDelivery(input: DeliveryAssessmentInput): DeliveryAssessment {
  const validationError = validateAssessmentInputs(input)

  if (validationError) {
    const classification: AssessmentClassification = "assessment_unavailable"
    const operatorPermission = evaluateOperatorPermission(input.operatorRole)
    return {
      classification,
      headline: "Assessment unavailable.",
      explanation: validationError,
      evidenceFindings: [],
      recommendedAction: {
        action: "review_evidence",
        ruleId: "rec-assessment-unavailable",
        text: "Assessment dependencies could not be resolved. Review the delivery record directly.",
      },
      replayEligibility: {
        decision: "assessment_unavailable",
        ruleId: "replay-missing-reference",
        explanation: validationError,
        blockers: [
          {
            reason: "missing_reference",
            ruleId: "replay-missing-reference",
            explanation: validationError,
          },
        ],
        recommendedNow: false,
      },
      operatorPermission,
      evaluatedRuleIds: ["classify-assessment_unavailable", "replay-missing-reference", operatorPermission.ruleId],
    }
  }

  const classification = classify(input)
  const headline = buildHeadline(classification, input)
  const explanation = buildExplanation(classification, input)
  const evidenceFindings = buildEvidenceFindings(input)
  const recommendedAction = buildRecommendedAction(classification, input)
  const replayEligibility = buildReplayEligibility(classification, input)
  const operatorPermission = evaluateOperatorPermission(input.operatorRole)

  const evaluatedRuleIds = [
    `classify-${classification}`,
    ...evidenceFindings.map((f) => f.ruleId),
    recommendedAction.ruleId,
    replayEligibility.ruleId,
    operatorPermission.ruleId,
  ]

  return {
    classification,
    headline,
    explanation,
    evidenceFindings,
    recommendedAction,
    replayEligibility,
    operatorPermission,
    evaluatedRuleIds,
  }
}
