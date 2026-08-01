import type {
  DeliveryFilters,
  DeliveryStateFilter,
  DeliveryTimeRange,
  EventType,
  ObservedFailureCategory,
} from "@/types"

export const VALID_TIME_RANGES: DeliveryTimeRange[] = ["6h", "24h", "7d"]
export const VALID_STATES: DeliveryStateFilter[] = [
  "all",
  "delivered",
  "retrying",
  "exhausted",
  "unknown",
]

export const EVENT_TYPES: EventType[] = [
  "order.created",
  "order.cancelled",
  "order.refunded",
  "invoice.created",
  "invoice.paid",
  "subscription.updated",
  "customer.updated",
]

export const FAILURE_CATEGORIES: ObservedFailureCategory[] = [
  "http_400",
  "http_401",
  "http_404",
  "http_409",
  "http_429",
  "http_500",
  "http_503",
  "timeout",
  "connection_terminated",
]

export function parseDeliveryFilters(params: URLSearchParams): DeliveryFilters {
  const timeParam = params.get("range")
  const timeRange = VALID_TIME_RANGES.includes(timeParam as DeliveryTimeRange)
    ? (timeParam as DeliveryTimeRange)
    : "24h"

  const stateParam = params.get("state")
  const state = VALID_STATES.includes(stateParam as DeliveryStateFilter)
    ? (stateParam as DeliveryStateFilter)
    : "all"

  const endpointId = params.get("endpoint") || null

  const eventTypeParam = params.get("event")
  const eventType = EVENT_TYPES.includes(eventTypeParam as EventType)
    ? (eventTypeParam as EventType)
    : null

  const failureCategoryParam = params.get("category")
  const failureCategory = FAILURE_CATEGORIES.includes(
    failureCategoryParam as ObservedFailureCategory
  )
    ? (failureCategoryParam as ObservedFailureCategory)
    : null

  const search = params.get("q") || ""

  return { search, timeRange, endpointId, eventType, state, failureCategory }
}

export function serializeDeliveryFilters(filters: DeliveryFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.search) params.set("q", filters.search)
  if (filters.timeRange !== "24h") params.set("range", filters.timeRange)
  if (filters.state !== "all") params.set("state", filters.state)
  if (filters.endpointId) params.set("endpoint", filters.endpointId)
  if (filters.eventType) params.set("event", filters.eventType)
  if (filters.failureCategory) params.set("category", filters.failureCategory)
  return params
}

export function buildExplorerQueryString(filters: DeliveryFilters): string {
  const params = serializeDeliveryFilters(filters)
  const qs = params.toString()
  return qs ? `?${qs}` : ""
}

export function hasActiveFilters(filters: DeliveryFilters): boolean {
  return (
    filters.search !== "" ||
    filters.timeRange !== "24h" ||
    filters.state !== "all" ||
    filters.endpointId !== null ||
    filters.eventType !== null ||
    filters.failureCategory !== null
  )
}

export function validateEndpointParam(
  endpointId: string | null,
  validEndpointIds: string[]
): string | null {
  if (!endpointId) return null
  return validEndpointIds.includes(endpointId) ? endpointId : null
}

export function sanitizeExplorerParams(
  params: URLSearchParams,
  validEndpointIds: string[] = []
): URLSearchParams {
  const parsed = parseDeliveryFilters(params)
  const validatedEndpointId = validateEndpointParam(parsed.endpointId, validEndpointIds)
  const filters: DeliveryFilters = { ...parsed, endpointId: validatedEndpointId }
  return serializeDeliveryFilters(filters)
}
