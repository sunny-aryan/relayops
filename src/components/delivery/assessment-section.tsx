import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  FileSearch,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
} from "lucide-react"

import { Mono } from "@/components/shared/mono"
import { Panel } from "@/components/shared/panel"
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge"
import type {
  DeliveryAssessment,
  RecommendedAction,
  ReplayEligibilityDecision,
} from "@/types"

const classificationLabels: Record<string, string> = {
  delivered: "Delivered",
  delivered_after_retry: "Delivered after retry",
  retrying: "Retrying",
  exhausted_http_503: "Exhausted — HTTP 503",
  exhausted_http_401: "Exhausted — HTTP 401",
  exhausted_other: "Exhausted",
  outcome_unknown: "Outcome unknown",
  recovered_by_replay: "Recovered by replay",
  assessment_unavailable: "Assessment unavailable",
}

const eligibilityTones: Record<ReplayEligibilityDecision, StatusTone> = {
  eligible: "success",
  already_succeeded: "neutral",
  already_replayed_successfully: "neutral",
  retry_active: "warning",
  confirmation_required: "warning",
  payload_unavailable: "neutral",
  endpoint_disabled: "neutral",
  in_active_replay: "warning",
  blocked_by_incident: "danger",
  assessment_unavailable: "neutral",
}

const eligibilityLabels: Record<ReplayEligibilityDecision, string> = {
  eligible: "Eligible for replay",
  already_succeeded: "Already succeeded",
  already_replayed_successfully: "Already recovered by replay",
  retry_active: "Blocked — retry active",
  confirmation_required: "Blocked — confirmation required",
  payload_unavailable: "Blocked — payload unavailable",
  endpoint_disabled: "Blocked — endpoint disabled",
  in_active_replay: "Blocked — in active replay",
  blocked_by_incident: "Blocked by incident",
  assessment_unavailable: "Assessment unavailable",
}

const actionIcons: Record<RecommendedAction, typeof CheckCircle2> = {
  no_action: CheckCircle2,
  allow_retries: Clock,
  confirm_receiver_recovery: ShieldAlert,
  verify_auth_config: ShieldAlert,
  confirm_downstream: Eye,
  review_evidence: FileSearch,
}

export function DeliveryAssessmentSection({
  assessment,
  operatorName,
}: {
  assessment: DeliveryAssessment
  operatorName: string
}) {
  const ActionIcon = actionIcons[assessment.recommendedAction.action]

  return (
    <Panel
      title="Operational assessment"
      description="Derived from recorded delivery evidence and replay policy. No AI-generated analysis is used."
    >
      <div className="flex flex-col gap-4">
        {/* Assessment */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              tone={classificationTone(assessment.classification)}
              label={classificationLabels[assessment.classification] ?? assessment.classification}
            />
            <span className="inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 text-[0.6875rem] text-muted-foreground">
              <ShieldCheck className="size-3" />
              Deterministic rules
            </span>
          </div>
          <p className="mt-2 text-sm font-medium text-foreground">{assessment.headline}</p>
          <p className="mt-1 text-xs text-muted-foreground">{assessment.explanation}</p>
        </div>

        {/* Evidence considered */}
        <div>
          <h3 className="mb-1.5 text-xs font-semibold text-muted-foreground">Evidence considered</h3>
          <ul className="flex flex-col gap-1">
            {assessment.evidenceFindings.map((finding, i) => (
              <li key={`${finding.ruleId}-${i}`} className="flex items-start gap-2 text-xs text-foreground">
                <span className="mt-0.5 size-1 shrink-0 rounded-full bg-muted-foreground/40" />
                {finding.text}
              </li>
            ))}
          </ul>
        </div>

        {/* Recommended next step */}
        <div>
          <h3 className="mb-1.5 text-xs font-semibold text-muted-foreground">Recommended next step</h3>
          <div className="flex items-start gap-2">
            <ActionIcon className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="text-sm text-foreground">{assessment.recommendedAction.text}</p>
          </div>
        </div>

        {/* Replay safety */}
        <div className="border-t border-border pt-3">
          <h3 className="mb-1.5 text-xs font-semibold text-muted-foreground">Replay safety</h3>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge
                tone={eligibilityTones[assessment.replayEligibility.decision]}
                label={eligibilityLabels[assessment.replayEligibility.decision]}
              />
              {assessment.replayEligibility.decision === "eligible" && !assessment.replayEligibility.recommendedNow && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <AlertCircle className="size-3" />
                  Technically eligible — replay not recommended until the observed condition is addressed.
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{assessment.replayEligibility.explanation}</p>

            {assessment.replayEligibility.blockers.length > 0 && (
              <ul className="mt-1 flex flex-col gap-1" aria-label="Replay blockers">
                {assessment.replayEligibility.blockers.map((blocker, i) => (
                  <li key={`${blocker.ruleId}-${i}`} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <AlertCircle className="mt-0.5 size-3 shrink-0 text-destructive" />
                    {blocker.explanation}
                  </li>
                ))}
              </ul>
            )}

            {/* Operator permission */}
            <div className="mt-1 flex items-start gap-2">
              {assessment.operatorPermission.permission === "permitted" ? (
                <UserCheck className="mt-0.5 size-3.5 shrink-0 text-success" />
              ) : (
                <UserX className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              )}
              <span className="text-xs text-foreground">
                <span className="font-medium">{operatorName}</span> — {assessment.operatorPermission.explanation}
              </span>
            </div>
          </div>
        </div>

        {/* Evaluated rules */}
        <div className="border-t border-border pt-2">
          <p className="text-[0.6875rem] text-muted-foreground">
            Evaluated rules:{" "}
            {assessment.evaluatedRuleIds.map((id) => (
              <Mono key={id} className="bg-transparent px-0 text-[0.6875rem] text-muted-foreground">
                {id}{" "}
              </Mono>
            ))}
          </p>
        </div>
      </div>
    </Panel>
  )
}

function classificationTone(classification: string): StatusTone {
  switch (classification) {
    case "delivered":
    case "delivered_after_retry":
      return "success"
    case "retrying":
      return "warning"
    case "exhausted_http_503":
    case "exhausted_http_401":
    case "exhausted_other":
      return "danger"
    case "outcome_unknown":
      return "neutral"
    case "recovered_by_replay":
      return "success"
    default:
      return "neutral"
  }
}
