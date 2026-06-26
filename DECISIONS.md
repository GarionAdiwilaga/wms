# Architectural Decisions

## 2026-06-18

### Authentication
**Decision:** Username/password + JWT access token. No refresh tokens. Password reset by Super Admin only. Users can change own password.
**Business Rule:** Internal application with limited users.
**Reason:** Simpler implementation and maintenance.

### Entity Scope
**Decision:** Items, Categories, Suppliers are all global (shared across branches).
**Business Rule:** Shared inventory catalog across all branches.
**Reason:** Simpler administration and reporting.

### Transfer Variance
**Decision:** Transfer variances are explicit, permanent, and not auto-corrected. Mismatch triggers automatic audit entry.
**Business Rule:** Variance represents damaged, missing, or otherwise unreceived inventory.
**Reason:** Prevents hidden inventory problems and leaves a trail for manual investigation.

### Item Identity (Supplier as Brand)
**Decision:** Supplier functions as both supplier and product brand in V1. Items from different suppliers are different products.
**Business Rule:** The supplier is part of the product identity in this business.
**Reason:** Reflects real-world inventory organization used by the warehouse staff.

## 2026-06-21

### Mobile-First & Touch-First Design
**Decision:** The application is strictly mobile-first. The primary platform is Android Phone, secondary is Android Tablet. Desktop is primarily for administration and reporting.
**Business Rule:** Warehouse workflows (Catalog, Stock In, Outbound, Transfer, Opname) must be optimized for touch and mobile screens.
**Reason:** Warehouse staff primarily use phones and tablets on the floor. 

### QR Scanning vs Search
**Decision:** QR scanning is a secondary convenience feature integrated directly into the universal item search component, not a standalone workflow. 
**Business Rule:** The application uses a single "Search → Select Item → Action" workflow, where search input is either manual typing or QR scan result.
**Reason:** Avoids maintaining separate workflows and keeps UX consistent across devices. Item discovery should prioritize fast search by code, name, supplier, and category.

### Reusable ItemSearch Component
**Decision:** Build a single, highly reusable `ItemSearch` component in Phase 2A that will be reused in all future phases (Item Catalog, Stock In Cart, Outbound Cart, Transfer Cart, Stock Opname).
**Business Rule:** The UI and interaction for looking up an item must be identical across all warehouse operations.
**Reason:** Ensures a consistent mobile experience and drastically reduces duplicate code later. The component will handle the search and QR scanning, and simply emit an `onSelect(item)` event to the parent workflow.

### Item Code Immutability
**Decision:** `item_code` is strictly immutable after creation. Users cannot edit category, supplier, or manual_code for an existing item.
**Business Rule:** If an item's identity changes, it must be deactivated and a new item created.
**Reason:** Ensures previously printed QR codes remain valid and prevents ledger confusion.

### Item Code Generation Strategy
**Decision:** Backend generates and enforces the `item_code`. Frontend submits `category_id`, `supplier_id`, and `manual_code`.
**Business Rule:** Uniqueness is enforced *only* on the globally constructed `item_code` (e.g. `MRM-ONX-001`), NOT on the `manual_code` alone. Thus, `MRM-ONX-001` and `AKR-ONX-001` can safely coexist.
**Reason:** Prevents race conditions, ensures data integrity, and allows identical manual codes across different categories or suppliers.

### QR Code Contents
**Decision:** QR codes purely encode the string `item_code` (e.g., "MRM-ONX-001"), generated on the frontend.
**Business Rule:** QR codes are just a shortcut to typing the code.
**Reason:** Saves backend processing. The system uses the `/api/v1/items/lookup` endpoint to resolve scanned codes.

### UOM Strategy
**Decision:** Keep `uom_id` in the data model for future flexibility, but inventory quantities are stored exclusively as `PCS`.
**Business Rule:** UOM defaults to PCS and should be minimized/hidden in normal workflows.
**Reason:** Matches current warehouse operations while allowing future expansion (e.g., consumables).

### Image Storage
**Decision:** Item images are stored on the local filesystem with a persistent Docker volume, served statically by FastAPI.
**Business Rule:** Image upload has high business value and should be prioritized.
**Reason:** Simple, effective, and no need for cloud storage (S3) for this internal application.

## 2026-06-22

### Relative API Path & Same-Origin Proxy Routing
**Decision:** All API requests in the frontend must use relative paths (e.g., `/api/v1`) rather than absolute URLs (e.g., `VITE_API_URL=http://localhost:8000/api/v1`).
- **In Development**: Vite's dev server handles proxying `/api/v1` and `/uploads` directly to the `backend` container (`http://backend:8000`).
- **In Production**: A reverse proxy (e.g., Caddy or Nginx) routes incoming requests from a single external domain, directing `/api/v1/*` and `/uploads/*` to the backend container, and everything else to the frontend container.
**Business Rule:** The application must work on mobile browsers on the local network (under VPS/Local IP) and on production public URLs (e.g., Cloudflare Tunnel) without requiring frontend rebuilds or CORS configuration.
**Reason:** Ensures the code is completely server-independent, avoids CORS issues in the browser, and eliminates the need to rebuild frontend images when hostnames or IP addresses change.

### Inventory Quantities (Integer / PCS)
**Decision:** Inventory quantities are stored and calculated exclusively as integers representing PCS (pieces).
**Business Rule:** All stock arithmetic must use integer PCS.
**Reason:** Simplifies logic and avoids floating-point inaccuracies. UOM exists for future flexibility but does not affect current ledger math.

### Reference Types & System Adjustments
**Decision:** The `reference_type` column for ledger transactions includes both `manual` and `system`.
**Business Rule:** `manual` is for user-initiated corrections, while `system` is for system-generated repair or migration operations.
**Reason:** Distinguishes between human actions and automated system fixes in the audit trail.

### Stock In & Outbound Architecture (Thin Services)
**Decision:** `StockInService` and `OutboundService` must be thin orchestration layers.
**Business Rule:** They only validate documents/stock and delegate all ledger mutations to `InventoryService.execute_stock_changes()`.
**Reason:** Centralizes stock logic and prevents duplicate or conflicting ledger updates.

### Cart UI & Duplicate Prevention
**Decision:** Both Stock In and Outbound use a POS-style Cart workflow (Search → Add → Qty), not traditional forms. Duplicate items in the cart are strictly prevented.
**Business Rule:** Selecting an existing item in a cart must increment its quantity, not create a new line. Both carts must use persisted state.
**Reason:** Matches real-world warehouse workflows, reduces errors, and survives mobile app switching.

## 2026-06-23

### Transfer State Machine
**Decision:** Transfer states are strictly limited to `draft`, `in_transit`, `received`, `cancelled`. There are no approval or pending states.
**Business Rule:** Origin stock is deducted upon `in_transit`. Destination stock is added upon `received`.
**Reason:** Avoids unnecessary workflow complexity.

### Transfer Floating Stock
**Decision:** No virtual transit warehouse is used. Items deducted from the origin during `in_transit` vanish from global available stock until received.
**Reason:** Simpler and appropriate for the business scale.

### Transfer Receipt Immutability
**Decision:** Receiving a transfer (`in_transit` -> `received`) is a one-time, permanent lock. No reopening, re-receiving, or editing is permitted.
**Reason:** Enforces strict audit trails and prevents tampering with received quantities.

### Transfer Data Additions (Variance & Notes)
**Decision:** `transfers` will have `received_notes`. `transfer_lines` will have an optional `variance_reason` text field.
**Business Rule:** `variance_reason` is only used when `received_quantity < shipped_quantity`.
**Reason:** Essential for loss investigations and audit trails (e.g., "Damaged during transport").

### Phase 4.1 Stock Opname Flow (2026-06-23)
**Decision:** `draft` -> `completed`. Ledger changes (`IN`/`OUT` via `reference_type='opname'`) happen only on `completed` using `variance = physical - system`.
**Business Rule:** Reconciliations must not alter stock balances until fully finalized.
**Reason:** Allows slow stock counting without prematurely locking inventory.

### Phase 5.0 Reporting-First Strategy (2026-06-23)
**Decision:** `ReportService` is the single source of truth for all reporting and analytics calculations. Any future dashboard implementation must consume `ReportService` aggregations rather than implementing separate business logic.
**Business Rule:** The UI must display the exact same numbers as the CSV/XLSX exports. Exports must always export exactly the same filtered dataset currently displayed on screen. Exports must never silently export the full dataset.
**Reason:** Prevents future discrepancies between reports and dashboards. Reports first. Dashboards second.

### Phase 5.0 Report Priorities (2026-06-23)
**Decision:** Priority 1 (Daily Operations): Stock Report, Low Stock Report, Item History. Priority 2 (Management): Inventory Movement, Transfer Variance, Audit Log.
**Reason:** This priority order guides future UI emphasis and optimization to ensure operational staff get what they need immediately.

### Phase 6.0 Future Roadmap (Deferred) (2026-06-23)
**Decision:** Historical stock snapshots (e.g. "What was stock on Jan 10?") and Dead Stock Analysis (items with no movement >90 days) are explicitly deferred to a future Phase 6 roadmap.
**Reason:** Replaying the ledger inside the Phase 5 reports is too expensive for a real-time system as data grows. Dead Stock requires movement aggregation that is not required for daily operations. Building these requires new scheduled engines which are out of scope for Phase 5.

### Stock Opname Reference Type
**Decision:** Ledger transactions generated by Stock Opname will use a new `reference_type = 'opname'`.
**Business Rule:** Do not repurpose `adjustment`. Use `opname` to distinctly identify reconciliation events in the audit log. adjustments.

## 2026-06-24

### Input Constraints & Sanitization
**Decision:** Usernames are strictly constrained to lowercase letters, numbers, dot, underscore, and hyphen (`^[a-z0-9._-]+$`). 
**Business Rule:** Frontend `UsersPage` and `LoginPage` will actively auto-format user input to lowercase and strip spaces dynamically, rather than just waiting for validation failure.
**Reason:** Prevents user error and login confusion regarding case sensitivity.

### Global Pagination Architecture
**Decision:** The application uses a single uniform `<PaginationControl />` component for all tables, supporting variable page sizes (10, 20, 50, 100), manual page jumping, and explicit data count (e.g., "Menampilkan 1 - 10 dari 40 barang").
**Business Rule:** Replaces fragmented pagination logic. The component uses an internal React `useEffect` with `window.scrollTo` to guarantee users are scrolled to the top of the content area whenever they flip pages.
**Reason:** Greatly enhances UX on mobile and desktop data exploration.

### Route-Level Scroll Management
**Decision:** Implemented a `<ScrollToTop />` wrapper directly inside the `<BrowserRouter>` in `App.tsx`.
**Business Rule:** The browser automatically scrolls to the top of the viewport (`window.scrollTo({ top: 0, behavior: 'smooth' })`) upon any route path change.
**Reason:** Solves the common SPA issue where deep-scrolled pages leave the user stranded at the bottom when navigating to a new module.

---

## 2026-06-25

### Phase 6 — Frequent Items Carousel
**Decision:** Implement a read-only `GET /api/v1/items/frequent` endpoint that aggregates the *current user's* most frequently handled items for a specific branch over the last 30 days.
**Business Rule:**
- Filters: `created_by = current_user`, `branch_id = active_branch`, `reference_type IN ('stock_in', 'outbound', 'transfer')`, `created_at >= NOW() - 30 days`.
- Excludes: `initial_load`, `opname`, `manual`, `system` (administrative/adjustment transactions).
- Rank: `COUNT(*) DESC` (primary) then `SUM(quantity) DESC` (tie-breaker).
- Super Admin with no branch selected → carousel hidden (empty response, no global aggregation).
- No migration. No new tables. No scheduled jobs. No backend cache. React Query `staleTime` = 5 minutes.
**Reason:** Personalised by user rather than branch-wide popularity to reflect the operator's actual repetitive workflow. Avoids misleading Super Admin recommendations. The `carousel_type` field in the response envelope is a forward-compatibility hook allowing a future "recent items" carousel to reuse the same API shape with a distinct `carousel_type` value without an architecture change.
