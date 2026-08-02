import type { Environment, ReplayExecutionResult } from "@/types"

export interface SimulatedExecutionScenario {
  deliveryId: string
  environment: Environment
  execute(startedAt: string): ReplayExecutionResult
}

const scenarios: SimulatedExecutionScenario[] = [
  {
    deliveryId: "dlv_b7e2d911",
    environment: "production",
    execute(startedAt: string): ReplayExecutionResult {
      const latencyMs = 412
      const completedAt = new Date(
        new Date(startedAt).getTime() + latencyMs
      ).toISOString()
      return {
        outcome: "accepted",
        httpStatus: 200,
        sanitizedResponseSummary: "Receiver accepted the replay with HTTP 200.",
        latencyMs,
        startedAt,
        completedAt,
        responseAbsent: false,
      }
    },
  },
  {
    deliveryId: "dlv_g6e1c750",
    environment: "sandbox",
    execute(startedAt: string): ReplayExecutionResult {
      const latencyMs = 287
      const completedAt = new Date(
        new Date(startedAt).getTime() + latencyMs
      ).toISOString()
      return {
        outcome: "confirmed_rejection",
        httpStatus: 401,
        sanitizedResponseSummary:
          "Receiver returned HTTP 401 with signature-verification-related response evidence.",
        latencyMs,
        startedAt,
        completedAt,
        responseAbsent: false,
      }
    },
  },
]

export function findExecutionScenario(
  deliveryId: string,
  environment: Environment
): SimulatedExecutionScenario | null {
  return (
    scenarios.find(
      (s) => s.deliveryId === deliveryId && s.environment === environment
    ) ?? null
  )
}
