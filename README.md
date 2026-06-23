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
- [x] Initialized infrastructure, backend APIs, and frontend SPA.
- [x] Implemented Master Data CRUD (Branches, Users, Categories, Suppliers, UOM).
- [x] Built Audit Logging service and basic RBAC.

### Phase 2: Catalog & Inventory Core (Complete)
- [x] Built Item Catalog with Image Uploads and Barcode scanning support.
- [x] Built `InventoryService` Ledger Engine with deterministic row-level locking.
- [x] Enforced immutable `inventory_transactions` and continuous cache strategy.

### Phase 3: Primary Warehouse Operations (Complete)
- [x] Implemented Initial Stock Loads.
- [x] Implemented Stock In and Outbound cart APIs.
- [x] Built resilient frontend POS-style workflows using Zustand persistent carts and spring physics.
- [x] Handled concurrency and `InsufficientStockError` rollbacks.

### Phase 4: Multi-Branch & Reconciliation (Complete)
- [x] Implemented strict Transfer state machines (`draft`, `in_transit`, `received`, `cancelled`).
- [x] Implemented irrevocable Transfer Receives with Variance reason tracking for transit losses.
- [x] Implemented Stock Opname snapshots with automatic ledger adjustment calculation.
- [x] Enforced strict UI accessibility (A11y) rules.

### Phase 5: Reports & Analytics (Complete)
- [x] Implement backend `ReportService` aggregations.
- [x] Operational Reports (Stock, Low Stock, Item History, Movements).
- [x] Management Reports (Transfer Variance, Audit Logs).
- [x] CSV / XLSX Export capability.
- [x] Shared Frontend Report Framework (`ReportFilterBar`, `ReportTable`).

---
*For detailed architecture, see `ARCHITECTURE.md`.*
*For business requirements, see `PROJECT.md`.*
