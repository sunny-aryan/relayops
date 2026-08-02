import type {
  AssessmentClassification,
  ReplayAcknowledgement,
  ReplayAcknowledgementType,
} from "@/types"

export function deriveAcknowledgement(
  classification: AssessmentClassification,
  acknowledgedAt: string
): ReplayAcknowledgement {
  const type = deriveAcknowledgementType(classification)
  return {
    type,
    ruleId: `ack-${type}`,
    text: canonicalAcknowledgementText(type),
    acknowledgedAt,
  }
}

export function deriveAcknowledgementType(
  classification: AssessmentClassification
): ReplayAcknowledgementType {
  switch (classification) {
    case "exhausted_http_503":
      return "http_503_recovery"
    case "exhausted_http_401":
      return "http_401_recovery"
    default:
      return "generic_replay"
  }
}

export function canonicalAcknowledgementText(
  type: ReplayAcknowledgementType
): string {
  switch (type) {
    case "http_503_recovery":
      return "I have confirmed the receiver has recovered and understand the duplicate-side-effect risk."
    case "http_401_recovery":
      return "I have verified the receiver authentication and signature-verification configuration and understand the duplicate-side-effect risk."
    case "generic_replay":
      return "I understand the stored payload will be sent again and that replay may create duplicate downstream side effects."
  }
}

export function canonicalAcknowledgementRuleId(
  type: ReplayAcknowledgementType
): string {
  return `ack-${type}`
}

export const canonicalAcknowledgementTypes: readonly ReplayAcknowledgementType[] = [
  "http_503_recovery",
  "http_401_recovery",
  "generic_replay",
]
