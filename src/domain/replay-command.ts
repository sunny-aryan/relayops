import type {
  DeliveryAssessment,
  ReplayCommandError,
} from "@/types"

export interface ReplayCommandContext {
  acknowledgement: boolean
  assessment: DeliveryAssessment
  activeReplayJobIds: string[]
  successfulReplayExists: boolean
}

export function validateReplayCommand(ctx: ReplayCommandContext): ReplayCommandError | null {
  if (!ctx.acknowledgement) {
    return "acknowledgement_required"
  }

  if (ctx.assessment.replayEligibility.decision !== "eligible") {
    return mapEligibilityToCommandError(ctx.assessment.replayEligibility.decision)
  }

  if (ctx.assessment.operatorPermission.permission !== "permitted") {
    return "operator_not_permitted"
  }

  if (ctx.successfulReplayExists) {
    return "delivery_already_replayed_successfully"
  }

  if (ctx.activeReplayJobIds.length > 0) {
    return "delivery_in_active_replay"
  }

  return null
}

function mapEligibilityToCommandError(
  decision: DeliveryAssessment["replayEligibility"]["decision"]
): ReplayCommandError {
  switch (decision) {
    case "already_succeeded":
      return "replay_no_longer_eligible"
    case "already_replayed_successfully":
      return "delivery_already_replayed_successfully"
    case "retry_active":
      return "automatic_retry_active"
    case "confirmation_required":
      return "receiver_confirmation_required"
    case "payload_unavailable":
      return "payload_unavailable"
    case "endpoint_disabled":
      return "endpoint_disabled"
    case "in_active_replay":
      return "delivery_in_active_replay"
    case "blocked_by_incident":
      return "replay_blocked_by_incident"
    case "assessment_unavailable":
      return "assessment_unavailable"
    default:
      return "replay_no_longer_eligible"
  }
}

export function commandErrorToMessage(error: ReplayCommandError): string {
  switch (error) {
    case "delivery_not_found":
      return "This delivery could not be found in the selected environment."
    case "wrong_environment":
      return "This delivery does not exist in the selected environment."
    case "assessment_unavailable":
      return "Assessment is unavailable. Required delivery or endpoint references could not be resolved."
    case "replay_no_longer_eligible":
      return "This delivery is no longer eligible for replay."
    case "operator_not_permitted":
      return "Your current role is not permitted to request replays."
    case "acknowledgement_required":
      return "You must acknowledge the replay safety risks before proceeding."
    case "payload_unavailable":
      return "The event payload is no longer available for replay."
    case "endpoint_disabled":
      return "The destination endpoint is disabled. Replay is blocked while the endpoint remains disabled."
    case "automatic_retry_active":
      return "An automatic retry is still active. Replay is blocked while automatic retries are in progress."
    case "receiver_confirmation_required":
      return "Receiver acceptance could not be confirmed. Replay may create duplicate side effects."
    case "delivery_in_active_replay":
      return "This delivery is already included in an active replay job."
    case "replay_blocked_by_incident":
      return "An active platform incident is blocking replay execution."
    case "delivery_already_replayed_successfully":
      return "This delivery was already recovered by a successful manual replay."
    case "invalid_idempotency_key_reuse":
      return "This replay request identifier was already used for a different delivery or command."
    case "invalid_idempotency_key_format":
      return "The replay request identifier is missing, empty, or contains invalid characters."
    case "note_too_long":
      return "The operator note exceeds the maximum length of 200 characters."
    case "execution_unavailable":
      return "Simulated execution is not configured for this delivery."
  }
}
