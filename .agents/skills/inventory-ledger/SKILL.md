---
name: inventory-ledger
description: rules
risk: unknown
source: chatgpt
date_added: '2026-06-18'
---
# Inventory Ledger Rules

Purpose:
Implement inventory using a transaction ledger model.

Core Principle:

inventory_transactions is the source of truth.

Never store authoritative stock quantities inside items.

branch_stocks is a cache/projection table used for fast reads.

Stock Formula:

Current Stock =
SUM(IN)
+ SUM(TRANSFER_IN)
+ SUM(ADJUSTMENT_PLUS)
- SUM(OUT)
- SUM(TRANSFER_OUT)
- SUM(ADJUSTMENT_MINUS)

Transaction Types:

- IN
- OUT
- TRANSFER_IN
- TRANSFER_OUT
- ADJUSTMENT_PLUS
- ADJUSTMENT_MINUS

Requirements:

- Every stock movement must generate an inventory transaction.
- Inventory transactions are immutable.
- Never delete inventory transactions.
- Corrections must be performed through adjustment transactions.
- All stock-changing operations must run inside database transactions.
- Stock cannot become negative unless explicitly allowed by configuration.

Design Priority:

Auditability > Convenience
