# Current Status

## Phase
- **Phase 6 (Dashboards & Advanced Analytics)**: 🟡 IN PROGRESS

## Last Completed
- **Phase 6.1 — Operational Dashboard**:
  - Backend: `GET /api/v1/dashboard/summary` — read-only aggregation (KPIs + notifications + recent activity).
  - Notifications: low stock count, transfers awaiting receipt, overdue opname sessions (>7 days draft).
  - Frontend: `useDashboardSummary` hook (staleTime=2min, refetchOnWindowFocus=true).
  - Frontend: `DashboardPage` with KPI cards, notification center, recent activity feed, quick actions.
  - Frontend: `TxTypeBadge` reusable component (7 tx types, badge + dot variants).
  - AppShell: Dashboard nav at top, Analytics nav added to reports section.
  - Default route changed from `/master-data/items` → `/dashboard`.
- **Phase 6.3 — UX Enhancements**:
  - `EmptyState` component action prop support
  - `ConfirmDialog` component (Radix Dialog wrapper) used in operations pages
  - `QuantityStepper` component used in operations pages (with press-and-hold interval scaling)
  - `ImageLightbox` component (Framer Motion AnimatePresence) used in item catalogue and transactional carts
  - `useKeyboardShortcut` React Hook for `ItemSearch` results navigation
  - `CartSummaryDialog` added for pre-submit action confirmation in Stock In, Outbound, Transfer
  - Opname UX: "Per Item" mode, Empty Submit Cancellation prompt, and "Batalkan Opname" feature (with new `/cancel` endpoint)
  - **Stock Opname Correctness & Category-Scoped Workflow (COMPLETE)**:
    - Enforced strict category-scoped opname workflow in both backend and frontend.
    - Prevented starting an opname session for categories that contain no active items (both backend & frontend validation).
    - Initial `physical_quantity` defaults to the snapshotted `system_quantity` at creation.
    - Users can still edit and save an explicit count of `0` in drafts.
    - Opname completions generate `ADJUSTMENT_PLUS` / `ADJUSTMENT_MINUS` ledger transactions.
    - Detail page renders a prominent category badge at the top right of the header.
    - Search-scroll-focus behavior scrolls to and flashes golden highlights on items in the list.
    - Wrong category warning dynamically displays the item's target category name.

## Current Branch
- `main`

## Current Focus
- Phase 6.2: PDF Generation

## Next Task
- Phase 6.2: PDF Generation (PdfService, Jinja2 templates, backend PDF generation, frontend download integration).
- After 6.2: Phase 6.4 Advanced Analytics.

## Blockers
None
