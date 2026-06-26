# Gudang Piala Kaltim WMS - Task List

## Phase 1: Foundation, Master Data & Audit

### 1.1 Project Initialization
- `[x]` Setup Docker Compose (PostgreSQL, Backend, Frontend) (Small)
- `[x]` Initialize FastAPI backend structure & core config (Small)
- `[x]` Initialize Vite + React + TS frontend, configure Shadcn UI & Tailwind (Small)

### 1.2 Database & Core
- `[x]` Define SQLAlchemy Models: `branches`, `users`, `categories`, `suppliers`, `uom`, `audit_logs` (Medium)
- `[x]` Generate and apply initial Alembic migration (Small)
- `[x]` Implement `core/security.py` (Password hashing, JWT generation, token_version verification) (Small)
- `[x]` Implement `core/dependencies.py` (Database session injection, current user extraction, role verification) (Small)
- `[x]` Implement `audit_service.py` to record entity changes immutably (Medium)
- `[x]` Write seed script (`seed.py`) for default super admin, branches, and UOMs (Small)

### 1.3 Backend APIs (Bottom-up)
- `[x]` Define Pydantic schemas for Auth, Users, and Master Data (Branches, Categories, Suppliers, UOM) (Medium)
- `[x]` Implement Services for Auth, Users, and Master Data CRUD (integrating Audit Logging) (Medium)
- `[x]` Implement API Routers (`/auth`, `/users`, `/branches`, `/categories`, `/suppliers`, `/uom`) (Medium)
- `[x]` Write Unit & Integration tests for Auth, Master Data CRUD, and Audit Logging (Large)

### 1.4 Frontend Core & Master Data
- `[x]` Setup Axios client with JWT interceptors & global error handling (Small)
- `[x]` Setup `auth-store.ts` (Zustand) (Small)
- `[x]` Implement App Layout (Sidebar, Header, Branch Selector) (Medium)
- `[x]` Implement Authentication Pages (Login, Change Password) (Medium)
- `[x]` Implement Master Data CRUD Hooks & API calls (React Query) (Medium)
- `[x]` Implement Master Data UI (DataTables, Forms for Users, Branches, Categories, Suppliers, UOM) (Large)
- `[x]` Localize Master Data UI (translate headers, labels, buttons, and placeholders to Indonesian) (Small)

---

## Phase 2A: Catalog

### 2A.1 Backend
- `[x]` Define SQLAlchemy Model: `items` (including new optional `description` field) (Small)
- `[x]` Generate and apply Alembic migration for items (Small)
- `[x]` Define Pydantic schemas for Items (`category_id`, `supplier_id`, `manual_code` for creation) (Small)
- `[x]` Implement `item_service.py` including `item_code` generation/validation, image upload handling, and immutability enforcement (Medium)
- `[x]` Implement API Routers (`/items`, `/items/lookup`) (Small)
- `[x]` Write Unit & Integration tests for Item CRUD, immutability rules, code generation, and Image Upload (Medium)

### 2A.2 Frontend
- `[x]` Implement Items API calls and React Query hooks (Small)
- `[x]` Build highly reusable `ItemSearch` component (Universal Search input + integrated QR scanner) designed to be reused across Item Catalog, Stock In, Outbound Cart, Transfer Cart, and Stock Opname (Medium)
- `[x]` Implement Item Catalog UI (Mobile-first DataTable/List with filters, prioritizing search) (Medium)
- `[x]` Implement Item Form UI (including Image Upload, and hiding/defaulting UOM to PCS) (Medium)
- `[x]` Implement QR Code generation (Frontend-only, encodes `item_code` string) (Small)

---

## Phase 2B: Inventory Core

### 2B.0 Configuration & Proxy Setup
- `[x]` Configure Vite dev server proxy in `frontend/vite.config.ts` to route `/api/v1` and `/uploads` to the backend container (Medium)
- `[x]` Remove `VITE_API_URL` environment variable from `docker-compose.yml` (and template) to enable relative API routing on mobile browsers (Small)

### 2B.1 Backend Core
- `[x]` Define SQLAlchemy Models: `inventory_transactions`, `branch_stocks` (Medium)
- `[x]` Generate and apply Alembic migration (Small)
- `[x]` Implement `inventory_service.py` (The Ledger Engine) with single `execute_stock_changes()` entry point (Large)
  - `[x]` Implement deterministic locking (sorting item_ids ascending)
  - `[x]` Implement negative stock prevention
  - `[x]` Implement lock timeout (`SET LOCAL lock_timeout = '5s'`)
  - `[x]` Implement domain exceptions (e.g., `InsufficientStockError`)
  - `[x]` Implement atomic cache updates
- `[x]` Implement cache rebuild script/logic (Small)
- `[x]` Write Critical Unit & Integration tests for concurrent inventory updates, deadlocks, and negative stock (Large)

### 2B.2 Backend APIs & Frontend
- `[x]` Define Pydantic schemas and API Router for `/branch-stocks` and `/inventory` (Small)
- `[x]` Create `/inventory/initial-load` POST endpoint (Super Admin only) (Small)
- `[x]` Implement Branch Stocks API calls and React Query hooks (Small)
- `[x]` Implement Branch Stocks View UI (DataTable with low-stock toggle) (Medium)

---

## Phase 3: Primary Warehouse Operations

### 3.1 Backend
- `[x]` Define SQLAlchemy Models: `stock_in_sessions`, `stock_in_lines`, `outbound_sessions`, `outbound_lines` including `status`, `reference_no`, `created_by`, `received_by`/`fulfilled_by` (Medium)
- `[x]` Generate and apply Alembic migration (Small)
- `[x]` Define Pydantic schemas for Stock In and Outbound (Small)
- `[x]` Implement `stock_in_service.py` (Thin orchestration layer: validates document, calls `execute_stock_changes` with `IN`) (Medium)
- `[x]` Implement `outbound_service.py` (Thin orchestration layer: validates document, calls `execute_stock_changes` with `OUT`) (Medium)
- `[x]` Implement API Routers (`/stock-in`, `/outbound`) (Medium)
- `[x]` Write Unit & Integration tests for Stock In and Outbound cart validations (Large)

### 3.2 Frontend Refinements (UI/UX & Theme)
- `[x]` Fix Menu Inconsistency: Ensure `Branch Stocks` appears in the mobile menu matching the desktop master data menu (Small)
- `[x]` Fix Mobile Drawer Direction: Since the burger button is on the top right, the drawer menu must slide in from the right side, not left (Small)
- `[x]` Apply Selected Global Theme Overhaul across the app (Medium)

### 3.3 Frontend Warehouse Operations
- `[x]` Setup `cart-store.ts` (Outbound) and `stock-in-cart-store.ts` (Zustand with persistence middleware) (Small)
- `[x]` Implement API calls and React Query hooks for operations (Medium)
- `[x]` Implement Stock In UI (POS-style Cart workflow, ItemSearch integration, prevent duplicate rows) (Large)
- `[x]` Implement Outbound Cart UI (POS-style Cart workflow, ItemSearch integration, prevent duplicate rows) (Large)

---

## Phase 4: Multi-Branch & Reconciliation

### 4.1 Backend
- `[x]` Define SQLAlchemy Models: `transfers`, `transfer_lines`, `stock_opname_sessions`, `stock_opname_lines` (Medium)
- `[x]` Generate and apply Alembic migration (Small)
- `[x]` Define Pydantic schemas for Transfers and Stock Opname (Medium)
- `[x]` Implement `transfer_service.py` (State machine, variance logic, cancellation rules) (Large)
- `[x]` Implement `opname_service.py` (Variance calculation, immediate adjustment generation) (Medium)
- `[x]` Implement API Routers (`/transfers`, `/stock-opname`) (Medium)
- `[x]` Write Unit & Integration tests for Transfer states, variance logic, and Opname adjustments (Large)

### 4.2 Frontend
- `[x]` Implement API calls and React Query hooks (Medium)
- `[x]` Implement Transfers UI (Create Draft, Ship, Receive with variance input, History) (Large)
- `[x]` Implement Stock Opname UI (Physical count input form, History) (Large)

### 4.3 Quick Polish Sprint & Core Freeze
- `[x]` Frontend: Fix all A11y warnings (ids, names, labels) without functional/style changes (Small)
- `[x]` Backend: Resolve FastAPI `httpx` test client and Passlib `crypt` deprecation warnings (Small)

---

## Phase 5: Reports & Analytics

### 5.1 Operational Reports
- `[x]` Backend: Implement `ReportService` and `/reports/stock`, `/low-stock`, `/item-history`, `/movements`
- `[x]` Backend: Implement native CSV/XLSX streaming endpoints that strictly respect query parameters
- `[x]` Frontend: Build `ReportFilterBar` (with Date Presets: Today, 7D, 30D, Month)
- `[x]` Frontend: Persist active filters in `localStorage`
- `[x]` Frontend: Link "Export" buttons to download the EXACT filtered view currently on screen
- `[x]` Frontend: Item History accessible via `Reports` menu AND directly from `Item Detail` screen
- `[x]` Frontend: Build pages for Stock, Low Stock (with red badges), Item History, and Movements

### 5.2 Management & Audit Reports
- `[x]` Backend: Implement `/reports/transfer-variance` and `/audit-logs`
- `[x]` Frontend: Build Transfer Variance Report Page with Summary Metrics (Total Transfers, With Variance, Lost Units)
- `[x]` Frontend: Build Audit Log Report Page with human-friendly entity labels and expandable JSON rows
- `[x]` Frontend: Navigation & RBAC Integration (Super Admin / Branch Head rules)
- `[x]` Frontend: Mobile Responsive Layouts (Card collapse for tables)

### 5.3 Quick Polish Sprint & Core Freeze
- `[x]` Frontend: Fix all A11y warnings (ids, names, labels) without functional/style changes (Small)
- `[x]` Backend: Resolve FastAPI `httpx` test client and Passlib `crypt` deprecation warnings (Small)

### 5.4 QA Feedback Hotfixes
- `[x]` Backend: Fix RBAC to allow `warehouse_staff` to create, ship, receive, and cancel Transfers (`Mutasi Barang`).
- `[x]` Backend: Enhance Item Search to query against Category name and Supplier name via outer joins.

### 5.5 UI/UX Enhancements & Refinements
- `[x]` Frontend: Auto-lowercase and spacing sanitizer for username inputs (Login & UsersPage).
- `[x]` Frontend: Global `ScrollToTop` router event to reset scroll position on module navigation.
- `[x]` Frontend: Advanced `PaginationControl` component replacing all previous list pagination mechanisms.
- `[x]` Frontend: Integrate Pagination component across 10 distinct tables (Items, Branch Stocks, Transfers, Opnames, and all Reports) with manual page jump and scalable entry limits (10/20/50/100).

### 5.6 Pre-Pilot Hardening
- `[x]` Backend: API Consistency (change `items` to `data` in all report endpoints).
- `[x]` Frontend: Report Data Consumption Update (consume `data` instead of `items`).
- `[x]` Frontend: Accessibility Cleanup (id, name, htmlFor).
- `[x]` Backend: Production Logging (structured logging, exception middleware).
- `[x]` Frontend: Production Error Boundary.
- `[x]` Documentation: Create BACKUP_RECOVERY.md, DEPLOYMENT.md, OPERATIONS.md.
- `[x]` Infrastructure: Production Configuration Review (docker-compose, env).

---

## Phase 6: Dashboards, PDF & Advanced Analytics

### 6.0 Frequent Items Carousel (Phase 6 First Delivery)
- `[x]` Backend: Add `FrequentItemEntry` and `FrequentItemsResponse` Pydantic schemas to `backend/app/schemas/item.py`
- `[x]` Backend: Implement `GET /api/v1/items/frequent` read-only endpoint in `backend/app/api/v1/endpoints/item.py`
  - Auth: any active user
  - Filter: `created_by=current_user`, `branch_id`, `reference_type IN ('stock_in','outbound','transfer')`, `created_at >= NOW()-30d`
  - Rank: `COUNT(*) DESC`, `SUM(quantity) DESC`
  - Super Admin no branch → returns `data: []` (carousel hidden)
  - No migration, no new tables, no backend cache
- `[x]` Frontend: Add `FrequentItemEntry`, `FrequentItemsResponse` interfaces and `useFrequentItems` hook to `frontend/src/hooks/useItems.ts`
  - `enabled: !!branchId`, `staleTime: 5 minutes`
- `[x]` Frontend: Add `branchId?` optional prop + horizontal carousel UI to `ItemSearch` component
  - Carousel renders only when `branchId` truthy AND query empty
  - AnimatePresence fade + stagger chip entrance
  - Skeleton shimmer while loading, empty-state copy when no history
  - Chip tap fires `handleSelect(item)` identical to dropdown pick
  - Backward-compatible: all existing `<ItemSearch>` usages unchanged
- `[x]` Frontend: Wire `branchId` into `<ItemSearch>` in `StockInPage.tsx`
- `[x]` Frontend: Wire `branchId` into `<ItemSearch>` in `OutboundPage.tsx`
- `[x]` Frontend: Wire `branchId` into `<ItemSearch>` in `TransferCreatePage.tsx` (source branch)
- `[x]` Frontend: Wire `branchId` into `<ItemSearch>` in `StockOpnameDetailPage.tsx` (session branch)

### 6.1 Dashboards
- `[ ]` Define Dashboard Metrics (must consume `ReportService`)
- `[ ]` Backend: Implement `/api/v1/dashboards` endpoint
- `[ ]` Frontend: Build Dashboard UI (Summary Cards, Charts)

### 6.2 Advanced Reporting
- `[ ]` Backend: Implement Scheduled Snapshot Engine (`daily_stock_snapshots`)
- `[ ]` Backend: Implement Dead Stock Analysis Report (>90 days no movement)
- `[ ]` Backend: Implement PDF Generation Service (WeasyPrint/ReportLab)
- `[ ]` Frontend: Integrate PDF Export buttons and new report pages
