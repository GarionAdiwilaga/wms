# Gudang Piala Kaltim WMS

Custom Warehouse Management System (WMS) for Gudang Piala Kaltim.

## Project Overview
This system replaces spreadsheet-based inventory tracking with a centralized web application. It tracks warehouse components used to build trophies, plaques, medals, and merchandise.

## Technology Stack
- **Backend:** FastAPI, SQLAlchemy, Alembic, PostgreSQL
- **Frontend:** React (Vite SPA), TypeScript, Shadcn UI, Tailwind CSS
- **Deployment:** Docker Compose

## Development Progress

### Phase 1: Foundation, Master Data & Audit (Complete)
- [x] Setup Docker Compose (PostgreSQL, Backend, Frontend)
- [x] Initialize FastAPI backend structure & core config
- [x] Initialize Vite + React + TS frontend, configure Shadcn UI & Tailwind
- [x] Define SQLAlchemy Models: `branches`, `users`, `categories`, `suppliers`, `uom`, `audit_logs`
- [x] Generate and apply initial Alembic migration
- [x] Implement core security (Password hashing, JWT generation)
- [x] Implement core dependencies (Session injection, role verification)
- [x] Implement audit service to record entity changes immutably
- [x] Write seed script for default super admin, branches, and UOMs
- [x] Define Pydantic schemas & Implement Services for Auth, Users, Master Data CRUD
- [x] Implement API Routers (`/auth`, `/users`, `/branches`, `/categories`, `/suppliers`, `/uom`)
- [x] Setup Axios client with JWT interceptors & global error handling
- [x] Implement App Layout (Sidebar, Header, Branch Selector)
- [x] Implement Authentication Pages (Login, Change Password)
- [x] Implement Master Data CRUD Hooks & API calls (React Query)
- [x] Implement Master Data UI (DataTables, Forms)

### Phase 2A: Catalog (In Progress)
- [ ] Define SQLAlchemy Model: `items` & Alembic migration
- [ ] Define Pydantic schemas for Items
- [ ] Implement `item_service.py` including image upload handling
- [ ] Implement API Router (`/items`)
- [ ] Implement Items API calls and React Query hooks
- [ ] Implement Item Catalog UI & Item Form UI (including Image Upload component)
- [ ] Implement QR Code viewing and printing UI

### Phase 2B: Inventory Core (Pending)
- [ ] Define Models: `inventory_transactions`, `branch_stocks`
- [ ] Implement `inventory_service.py` (Ledger Engine with deterministic locking)
- [ ] Implement cache rebuild script/logic
- [ ] Implement Branch Stocks View UI

### Phase 3: Primary Warehouse Operations (Pending)
- [ ] Implement Stock In APIs and UI
- [ ] Implement Outbound Cart APIs and UI

### Phase 4: Multi-Branch & Reconciliation (Pending)
- [ ] Implement Branch Transfers APIs and UI
- [ ] Implement Stock Opname APIs and UI

### Phase 5: Dashboards & Reporting (Pending)
- [ ] Implement Dashboard APIs and UI
- [ ] Implement PDF Generation Service and Reports UI

---
*For detailed architecture, see `ARCHITECTURE.md`.*
*For business requirements, see `PROJECT.md`.*
