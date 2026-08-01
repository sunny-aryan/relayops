# RelayOps

RelayOps is the customer-facing webhook operations portal provided by Helio, a fictional subscription-commerce platform. It lets an integration team — like the example customer Northstar Mobility — monitor webhook endpoint health, investigate delivery failures, and (in later milestones) safely recover missed events such as `invoice.paid` notifications that drive subscription entitlements.

## Current scope — Commit 2 (webhook health overview)

Building on the Commit 1 foundation (application shell, routes, domain model, fixtures, repository layer, shared components), this commit adds the first operational experience:

- Environment-aware webhook health overview at `/overview`
- Operational metrics: events, delivery attempts, failures, backlog, weighted success rate, p95 latency
- Delivery-health trend chart with a functional 6h / 24h / 7d time-range selector
- Endpoint health prioritization — endpoints needing attention are listed first and link to their detail routes
- Observed failure clusters presented as evidence, ranked by affected deliveries
- Fixture-backed telemetry with explicit freshness and Helio platform-incident context

Delivery investigation, diagnosis, replay execution, endpoint management, authentication, and backend integration remain out of scope for this commit.

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

All data is currently fixture-backed (`src/data`). Overview aggregates come from window-level telemetry fixtures (`src/data/overview.ts`); the delivery records in `src/data/fixtures.ts` are a representative sample, not the full population behind those aggregates. Repository functions return Promises so a real backend can replace them without restructuring the UI.
