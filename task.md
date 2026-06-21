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
- `[ ]` Localize Master Data UI (translate headers, labels, buttons, and placeholders to Indonesian) (Small)

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

### 2B.1 Backend Core
- `[ ]` Define SQLAlchemy Models: `inventory_transactions`, `branch_stocks` (Medium)
- `[ ]` Generate and apply Alembic migration (Small)
- `[ ]` Implement `inventory_service.py` (The Ledger Engine) (Large)
  - `[ ]` Implement deterministic locking (sorting item_ids ascending)
  - `[ ]` Implement negative stock prevention
  - `[ ]` Implement atomic cache updates
- `[ ]` Implement cache rebuild script/logic (Small)
- `[ ]` Write Critical Unit & Integration tests for concurrent inventory updates, deadlocks, and negative stock (Large)

### 2B.2 Backend APIs & Frontend
- `[ ]` Define Pydantic schemas and API Router for `/branch-stocks` (read-only) (Small)
- `[ ]` Implement Branch Stocks API calls and React Query hooks (Small)
- `[ ]` Implement Branch Stocks View UI (DataTable) (Medium)

---

## Phase 3: Primary Warehouse Operations

### 3.1 Backend
- `[ ]` Define SQLAlchemy Models: `stock_in_sessions`, `stock_in_lines`, `outbound_sessions`, `outbound_lines` (Medium)
- `[ ]` Generate and apply Alembic migration (Small)
- `[ ]` Define Pydantic schemas for Stock In and Outbound (Small)
- `[ ]` Implement `stock_in_service.py` (generates `IN` transactions via `inventory_service`) (Medium)
- `[ ]` Implement `outbound_service.py` (generates `OUT` transactions via `inventory_service`, handles all-or-nothing validation) (Medium)
- `[ ]` Implement API Routers (`/stock-in`, `/outbound`) (Medium)
- `[ ]` Write Unit & Integration tests for Stock In and Outbound cart validations (Large)

### 3.2 Frontend
- `[ ]` Setup `cart-store.ts` (Zustand with localStorage persistence) (Small)
- `[ ]` Implement API calls and React Query hooks for operations (Medium)
- `[ ]` Implement Stock In UI (Batch receiving form, Session history) (Large)
- `[ ]` Implement Outbound Cart UI (Scanner input, Cart management, Checkout modal) (Large)

---

## Phase 4: Multi-Branch & Reconciliation

### 4.1 Backend
- `[ ]` Define SQLAlchemy Models: `transfers`, `transfer_lines`, `stock_opname_sessions`, `stock_opname_lines` (Medium)
- `[ ]` Generate and apply Alembic migration (Small)
- `[ ]` Define Pydantic schemas for Transfers and Stock Opname (Medium)
- `[ ]` Implement `transfer_service.py` (State machine, variance logic, cancellation rules) (Large)
- `[ ]` Implement `opname_service.py` (Variance calculation, immediate adjustment generation) (Medium)
- `[ ]` Implement API Routers (`/transfers`, `/stock-opname`) (Medium)
- `[ ]` Write Unit & Integration tests for Transfer states, variance logic, and Opname adjustments (Large)

### 4.2 Frontend
- `[ ]` Implement API calls and React Query hooks (Medium)
- `[ ]` Implement Transfers UI (Create Draft, Ship, Receive with variance input, History) (Large)
- `[ ]` Implement Stock Opname UI (Physical count input form, History) (Large)

---

## Phase 5: Dashboards & Reporting

### 5.1 Backend
- `[ ]` Implement `dashboard_service.py` and API Router (`/dashboard`) (Medium)
- `[ ]` Implement PDF Generation Service (ReportLab/WeasyPrint) (Large)
- `[ ]` Implement `report_service.py` to aggregate data for 7 standard reports (Large)
- `[ ]` Implement API Router (`/reports`) (Medium)
- `[ ]` Write Unit & Integration tests for Dashboard metrics and PDF generation (Medium)

### 5.2 Frontend
- `[ ]` Implement Dashboard UI (Summary Cards, Charts/Lists) (Medium)
- `[ ]` Implement Reports UI (Filter form, PDF download actions) (Medium)
