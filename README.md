# RelayOps

RelayOps is the customer-facing webhook operations portal provided by Helio, a fictional subscription-commerce platform. It lets an integration team — like the example customer Northstar Mobility — monitor webhook endpoint health, investigate delivery failures, and (in later milestones) safely recover missed events such as `invoice.paid` notifications that drive subscription entitlements.

## Current scope — Commit 3 (endpoint inventory and detail)

Building on the Commit 1 and 2 foundations, this commit adds the endpoint operational experience:

- Environment-aware endpoint inventory at `/endpoints` with search, status filter, and health filter
- Operational endpoint detail at `/endpoints/:id` with 6h / 24h / 7d time-range controls
- Per-endpoint delivery-health trend and failure-cluster evidence (observed patterns, not root cause)
- Read-only endpoint configuration (subscribed events, signing, retry policy, creation and update timestamps)
- Disabled endpoints shown as Not evaluated, excluded from active delivery metrics
- Wrong-environment or unknown endpoint IDs show an environment-aware not-found state

Previous commits:

**Commit 2:** Environment-aware webhook health overview at `/overview` — operational metrics, delivery-health trend, endpoint health prioritization, observed failure clusters, fixture-backed telemetry with platform-incident context.

**Commit 1:** Application shell — sidebar, top bar, routes, domain model, repository layer, shared components.

Delivery investigation, diagnosis, replay execution, authentication, and backend integration remain out of scope.

## Technology

- React + TypeScript
- Vite
- Tailwind CSS
- shadcn/ui components
- Recharts
- Lucide icons
- React Router

## Install

```bash
npm install
```

## Run locally

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Data

All data is currently fixture-backed (`src/data`). Overview aggregates come from `src/data/overview.ts`; per-endpoint telemetry comes from `src/data/endpoints.ts`; representative delivery records are in `src/data/fixtures.ts`. Repository functions return Promises so a real backend can replace them without restructuring the UI.
