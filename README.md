# RelayOps

RelayOps is the customer-facing webhook operations portal provided by Helio, a fictional subscription-commerce platform. It lets an integration team — like the example customer Northstar Mobility — monitor webhook endpoint health, investigate delivery failures, and (in later milestones) safely recover missed events such as `invoice.paid` notifications that drive subscription entitlements.

## Current scope — Commit 1 (foundation)

This commit establishes the product foundation only:

- Application shell: sidebar navigation, top bar, workspace and environment selectors
- All top-level routes with lightweight placeholder surfaces
- Dynamic detail routes for endpoints, deliveries, and replay jobs resolved from fixtures
- Centralized domain model (`src/types`) and internally consistent fixture data (`src/data`)
- Repository layer (`src/repositories`) that can later be swapped for a real backend
- Shared foundational components: status badges, page headers, breadcrumbs, empty and not-found states

Detailed dashboards, delivery diagnosis, replay execution, charts, onboarding, authentication, and backend integration are intentionally out of scope for this commit.

## Technology

- React + TypeScript
- Vite
- Tailwind CSS
- shadcn/ui components
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

All data is currently fixture-backed (`src/data/fixtures.ts`). Repository functions return Promises so a real backend can replace them without restructuring the UI.
