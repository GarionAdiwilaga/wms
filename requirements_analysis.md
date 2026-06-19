# Requirements Analysis — Gudang Piala Kaltim WMS

## All Decisions Finalized ✅ — Ready for Implementation Planning

---

## Critical Architecture Decisions

| # | Question | Decision |
|---|----------|----------|
| **Q1** | Authentication | Username/password + JWT access token. No refresh tokens. Password reset by Super Admin only. Users can change own password. |
| **Q2** | Frontend framework | Vite SPA (React + TypeScript). FastAPI backend. No SSR/SSG. |
| **Q3** | Entity scope | Items, Categories, Suppliers are all **global** (shared across branches). |
| **Q4** | Negative stock | **Not allowed.** Outbound checkout must fail if stock insufficient. |
| **Q5** | Transfer deduction | Stock deducted at **In Transit** (sender). Stock added at **Received** (receiver). |
| **Q6** | Stock opname | Adjustments applied **immediately**. No approval workflow. Fully audited. |

---

## Module Design Decisions

| # | Question | Decision |
|---|----------|----------|
| **Q7** | Item code & supplier identity | Prefix derived from **category + supplier/brand**. Code is **manually entered**. Supplier = Brand in V1. Items from different suppliers are **different products** even if physically similar. |
| **Q8** | Stock In batching | **Yes** — multiple items per session. |
| **Q9** | Multi-line transfers | **Yes** — header + multiple line items. |
| **Q10** | Opname scope | **Per-category within a branch.** |
| **Q11** | Transfer receiving | **Partial/excess receiving allowed.** Variance = sent − received. Variance is explicit, permanent, not auto-corrected. Reports show Sent/Received/Variance. |
| **Q12** | Report format | **PDF only.** Concise, beautiful, modern. |

## UX & Polish Decisions

| # | Question | Decision |
|---|----------|----------|
| **Q13** | UI language | Bahasa Indonesia + common English technical terms. |
| **Q14** | Cart storage | Client-side (localStorage). |
| **Q15** | Notifications | None in V1. |
| **Q16** | Unit of measure | Predefined list: pcs, lembar, meter, kg, roll, set, unit, box, lusin, pak. |
| **Q17** | Locale formatting | Indonesian: `18 Juni 2026`, `1.000,50`, 24-hour time. |

---

## Key Business Model Insight: Supplier = Brand

> [!IMPORTANT]
> This is a foundational business rule that shapes the entire data model.

In this business, **supplier is product identity**, not just a procurement relationship:

- "ONIX 40cm Stall" and "FUNTROPHY 40cm Stall" are **two separate inventory items**
- They may be physically similar, but they are tracked, priced, and managed independently
- The `supplier` entity functions as both **supplier** and **product brand** in V1
- This is intentional — it reflects how the warehouse actually organizes inventory

**Data model implications:**
- An item **belongs to exactly one supplier/brand** (FK `supplier_id` on `items`)
- Supplier/brand is part of the item's identity, not just metadata
- The item code prefix encodes **both category and supplier/brand**
- Item uniqueness is defined by: category + supplier + manual code
- Searching/filtering items by supplier is a primary access pattern

---

## Transfer Variance Model

Transfer variances are **explicit, permanent, and uninvestigated by the system**:

```
Sender ships 10 units → TRANSFER_OUT(qty=10) → sender stock −10
Receiver gets 8 units → TRANSFER_IN(qty=8)   → receiver stock +8

Variance: 2 units (damaged / missing / unreceived)
```

**Rules:**
1. Variance is **not auto-corrected** — no automatic ADJUSTMENT transaction
2. Variance is **permanent** — the 2 units remain "lost" until management acts
3. Variance is **visible** — Transfer Report shows Sent Qty / Received Qty / Variance Qty
4. Mismatch triggers **automatic audit entry** with reason
5. The sender's stock stays deducted by the full sent amount
6. The receiver's stock increases by only the actual received amount
7. Management decides what to do (investigate, write off via manual adjustment, etc.)

**No new transaction type needed.** Variance = `SUM(TRANSFER_OUT) - SUM(TRANSFER_IN)` for a given transfer. It's a calculated field, not a stored one.

---

## Consolidated Business Rules

### Inventory Ledger

1. `inventory_transactions` is the **sole source of truth**
2. `branch_stocks` is a **read cache** — updated within the same DB transaction
3. Transactions are **immutable** — never edited, never deleted
4. Corrections use `ADJUSTMENT_PLUS` / `ADJUSTMENT_MINUS`
5. **Negative stock is forbidden** — all deduction operations validate first
6. Transaction types: `IN`, `OUT`, `TRANSFER_OUT`, `TRANSFER_IN`, `ADJUSTMENT_PLUS`, `ADJUSTMENT_MINUS`

### Items & Identity

1. Items are **global** (shared catalog across all branches)
2. Supplier = Brand — part of the item's identity
3. Items from different suppliers are **different products**
4. Item code = `{category_supplier_prefix}-{manual_code}`
5. Item code is **globally unique**
6. Items can be deactivated (not deleted)
7. Inactive items cannot appear in new Stock In, Outbound, or Transfer operations

### Outbound Cart

1. Client-side cart (localStorage)
2. Checkout requires: reference number (mandatory), notes (optional)
3. All cart items share the same reference number
4. Checkout is **all-or-nothing** — single DB transaction
5. If any item has insufficient stock → **entire checkout fails**
6. Generates `OUT` transactions

### Branch Transfers

1. Transfer = header + multiple line items
2. Status flow: `Draft → In Transit → Received` (or `Cancelled`)
3. `TRANSFER_OUT` at In Transit (sender deducted by **sent_qty**)
4. `TRANSFER_IN` at Received (receiver increased by **received_qty**)
5. Received qty may differ from sent qty (partial or excess)
6. Variance = sent_qty − received_qty (per line item)
7. Mismatch → automatic audit entry + reason
8. Variance is permanent — not auto-corrected
9. Transfer Report shows: Sent / Received / Variance per line
10. Cancellation from Draft → no stock impact
11. Cancellation from In Transit → reversal TRANSFER_IN to sender

### Stock Opname

1. Scoped to **one category within one branch**
2. User enters physical counts for all items in that category
3. Variance = physical count − system stock
4. Adjustments applied **immediately**
5. Generates `ADJUSTMENT_PLUS` or `ADJUSTMENT_MINUS` per item
6. Full audit trail preserved

### Users & Roles

| Role | Scope | Key Permissions |
|------|-------|-----------------|
| **Super Admin** | All branches | Full access, user CRUD, branch CRUD, item CRUD, password resets, all reports |
| **Branch Head** | Own branch | Approve transfers, branch reports, stock adjustments |
| **Warehouse Staff** | Own branch | Stock In, Outbound Cart, Stock Opname, view catalog |

### Reports (PDF — concise, beautiful, modern)

1. Current Stock Report
2. Inventory Movement Report
3. Low Stock Report
4. Stock Adjustment Report
5. Transfer Report (with Sent/Received/Variance columns)
6. Outbound Usage Report
7. Supplier Activity Report

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-18 | JWT auth, no refresh token | Internal app, limited users, simple maintenance |
| 2026-06-18 | Vite SPA + FastAPI | No SEO/SSR needed, fast development |
| 2026-06-18 | Global entities | Shared catalog, simpler admin |
| 2026-06-18 | No negative stock | Preserves accuracy, prevents hidden problems |
| 2026-06-18 | Deduct at In Transit | Items have physically left sender |
| 2026-06-18 | Opname immediate | Simpler, faster operations |
| 2026-06-18 | Supplier = Brand | Reflects real-world business identity |
| 2026-06-18 | Manual item codes | Adapts existing codes from spreadsheets |
| 2026-06-18 | Transfer variance explicit | Lost/damaged items tracked, not auto-fixed |
| 2026-06-18 | PDF reports only | Business preference, modern design |
| 2026-06-18 | Bahasa Indonesia UI | Primary user base, common English tech terms kept |
