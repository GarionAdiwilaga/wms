# Implementation Plan — Gudang Piala Kaltim WMS

This document outlines the phased implementation strategy for the WMS. The plan is optimized for **incremental development** and rigorous testing, ensuring that each phase delivers a working, testable slice of the application, building up to the complex warehouse workflows.

## Implementation Strategy

For every feature within a phase, development will follow a strict bottom-up sequence to ensure code quality and reduce generation errors:
1. Database Models
2. Alembic Migration
3. Pydantic Schemas
4. Repository / Data Access Layer
5. Service Layer (Business Logic)
6. API Endpoints
7. Frontend Client / Stores / Hooks
8. Frontend UI Components & Pages

---

## Phase 1: Foundation, Master Data & Audit
**Goal**: Establish the project skeleton, authentication, fundamental master data entities, and the core audit logging system to track all changes from day one.

**Deliverables**:
- Docker Compose setup (PostgreSQL, Backend, Frontend).
- FastAPI backend shell with Alembic migrations.
- Vite + React + TypeScript frontend shell with React Router and Shadcn UI layout.
- JWT Authentication system (including `token_version` invalidation).
- `audit_logs` table and logging service/middleware.
- CRUD APIs and UI for Master Data: `branches`, `categories`, `suppliers`, `uom`, and `users` (with audit logging).
- Seed Data script (Default Super Admin, Default Branches, Default UOMs like pcs, lembar, etc).
- **Testing**: Unit & Integration tests for Auth, Master Data CRUD, and Audit Logging.

**Dependencies**: None.
**Estimated Complexity**: Medium

---

## Phase 2A: Catalog
**Goal**: Establish the inventory catalog system independently before introducing ledger complexity.

**Deliverables**:
- `items` CRUD APIs and UI.
- Image Upload support.
- QR Code Generation.
- Read-only Branch Stock View UI (placeholder API or empty data).
- **Testing**: Unit & Integration tests for Item CRUD, Image Upload, and QR generation.

**Dependencies**: Phase 1.
**Estimated Complexity**: Medium

---

## Phase 2B: Inventory Core
**Goal**: Implement and validate the core inventory engine separately to reduce implementation risk and make debugging easier.

**Deliverables**:
- `inventory_transactions` and `branch_stocks` database tables and models.
- `inventory_service.py` core module implementing the Cache Update Pattern with **deterministic locking** (sorting `item_id`s ascending) to prevent deadlocks.
- Read-only APIs for Branch Stocks.
- Cache rebuild logic/script.
- **Testing**: Critical unit & integration tests covering:
  - Stock calculations
  - Negative stock prevention
  - Concurrent inventory updates
  - Deterministic locking under load

**Dependencies**: Phase 2A.
**Estimated Complexity**: High

---

## Phase 3: Primary Warehouse Operations
**Goal**: Deliver the daily operational workflows: receiving new stock and checking out stock for customer orders.

**Deliverables**:
- **Stock In**: Session and Line Item tables, APIs, and UI for batch receiving. Generates `IN` transactions.
- **Outbound Cart**: Session and Line Item tables, APIs, and UI (backed by Zustand/localStorage). Generates `OUT` transactions.
- Integration with the core ledger service to validate stock before outbound checkout.
- **Testing**: Unit & Integration tests for:
  - Stock In
  - Outbound Checkout
  - Cart validation

**Dependencies**: Phase 2B.
**Estimated Complexity**: Medium

---

## Phase 4: Multi-Branch & Reconciliation
**Goal**: Implement the complex workflows for moving inventory between locations and reconciling physical stock.

**Deliverables**:
- **Branch Transfers**: Full state machine (Draft → In Transit → Received/Cancelled), UI for creating and receiving transfers, and variance logic (`sent_quantity` vs `received_quantity`). Generates `TRANSFER_OUT` and `TRANSFER_IN` transactions.
- **Stock Opname**: APIs and UI for branch/category scoped physical counts. Generates `ADJUSTMENT_PLUS` and `ADJUSTMENT_MINUS` transactions.
- **Testing**: Unit & Integration tests for:
  - Transfer workflow state transitions
  - Transfer variance handling
  - Transfer cancellation rules
  - Stock Opname adjustments

**Dependencies**: Phase 3.
**Estimated Complexity**: High

---

## Phase 5: Dashboards & Reporting
**Goal**: Provide business visibility and PDF reporting capabilities based on the accumulated ledger data.

**Deliverables**:
- Branch-scoped Dashboard UI and APIs (Total Items, Low Stock alerts, Recent Transactions, Pending Transfers).
- PDF Generation Service.
- UI and Endpoints for 7 standard reports: Current Stock, Movements, Low Stock, Adjustments, Transfers, Outbound Usage, and Supplier Activity.
- **Testing**: Unit & Integration tests for Dashboard metrics and PDF generation data accuracy.

**Dependencies**: Phase 4.
**Estimated Complexity**: Medium
