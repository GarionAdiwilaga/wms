# Gudang Piala Kaltim WMS

## Project Overview

Custom Warehouse Management System (WMS) for Gudang Piala Kaltim.

Purpose:

Replace spreadsheet-based inventory tracking with a centralized web application.

The system tracks warehouse components used to build trophies, plaques, medals, and merchandise.

---

## Technology Stack

Backend:

* FastAPI
* SQLAlchemy
* Alembic
* PostgreSQL

Frontend:

* React (Vite SPA)
* TypeScript
* Shadcn UI
* Tailwind CSS

Deployment:

* Docker Compose

Reason:

Internal application with no SEO or SSR requirements.

Vite SPA provides fast development and simpler deployment.

---

## Business Model

The company does not manufacture standardized products.

Every customer order is customized.

Inventory tracking is performed at the component level.

Examples:

* Marmer
* Akrilik
* Figur
* Stall
* Tali Medali
* Onix
* Etching Components
* Resin Components

The warehouse tracks only raw components.

Finished trophies are not tracked as inventory.

### Supplier as Brand

Supplier is part of the product identity in this business.

Items from different suppliers are considered different products, even if they are physically similar.

Example:

* ONIX 40cm Stall
* FUNTROPHY 40cm Stall

These are separate inventory items.

The supplier entity functions as both supplier and product brand in Version 1.

This is intentional and reflects the real-world inventory organization used by the business.

---

## Critical Business Rules

DO NOT IMPLEMENT:

* Bill Of Materials (BOM)
* Product Bundles
* Manufacturing Orders
* Assembly Tracking
* Production Planning

Reason:

Each order uses different combinations of components.

Inventory deduction is performed manually by warehouse staff.

---

## Authentication

Mechanism:

* Username and password authentication
* JWT access token
* No refresh token system

Password Management:

* Password resets can only be performed by Super Admin
* Users may change their own password

First User:

* Initial Super Admin created via CLI seed command

Reason:

Internal application with limited users.

Simpler implementation and maintenance.

---

## Branch Structure

Locations:

* Balikpapan (BPN)
* Samarinda (SMD)
* Bontang (BTG)

Inventory is stored separately per branch.
Each branch can receive stock directly from suppliers.
Any branch may transfer stock to any other branch.
No branch has special privileges or inventory ownership.

Stock transfers between branches must be recorded.

---

## User Roles

### Super Admin

Permissions:

* Full access
* Manage users (CRUD, password resets)
* Manage branches
* Manage items, categories, suppliers, units of measure
* View all reports (all branches)
* View all stock (all branches)
* Perform all warehouse operations

### Branch Head

Permissions:

* View own branch
* Approve stock transfers (receive transfers)
* View branch reports
* Perform stock adjustments
* Perform Stock In
* Use Outbound Cart

### Warehouse Staff

Permissions:

* Receive stock (Stock In)
* Use Outbound Cart
* Perform stock opname
* View item catalog

---

## Core Inventory Principle

inventory_transactions is the source of truth.

Every inventory movement must generate an inventory transaction.

branch_stocks is only a cache table for fast stock display.

Inventory transactions must never be deleted.

Corrections are performed using adjustment transactions.

### Negative Stock Policy

Negative stock is not allowed.

Outbound checkout must fail if stock is insufficient.

Transfer shipment must fail if sender branch stock is insufficient.

Users must perform a stock adjustment before proceeding.

Reason:

Preserves inventory accuracy.

Prevents hidden inventory problems.

---

## Entity Scope

Items: Global (shared across all branches)

Categories: Global

Suppliers: Global

Reason:

Shared inventory catalog across all branches.

Simpler administration and reporting.

---

## Item Categories

Examples:

* Marmer
* Akrilik
* Etching
* Onix
* Funtrophy
* Figur
* Stall
* Tali Medali
* Resin
* Import Components

Categories must be configurable by Super Admin.

---

## Item Code Format

Every item has a unique item code.

The item code prefix is derived from category and supplier.

The code portion is manually entered by the user.

Format:

{category_prefix}-{supplier_prefix}-{manual_code}

Example:

* MRM-ONX-001
* AKR-FT-123
* FIG-IMP-A5

Manual code entry allows adaptation of existing codes from spreadsheets.

Item code must be globally unique.

---

## QR Code Strategy

QR codes contain only the item code.

The application resolves the item code to the corresponding inventory item.

Requirements:

* Android phone camera scanning
* iPhone camera scanning
* Tablet camera scanning
* Printable QR labels
* No dedicated barcode scanner required

Primary use cases:

* Stock In
* Outbound Cart
* Stock Opname
* Item Lookup

---

## Unit of Measure

Predefined list managed by Super Admin:

* pcs
* lembar
* meter
* kg
* roll
* set
* unit
* box
* lusin
* pak

All transactions use the item's assigned unit.

---

## Core Modules

### Dashboard

Show:

* Total Items
* Low Stock Items
* Recent Transactions
* Pending Transfers
* Branch Stock Summary

---

### Item Management

Manage:

* Item Code (prefix auto-generated, code manually entered)
* Item Name
* Category
* Supplier (Brand)
* Unit
* Minimum Stock
* Image
* Active Status

Generate and print QR labels.

---

### Supplier Management

Manage supplier and brand records.

Fields:

* Name
* Contact Person
* Phone
* Notes

---

### Stock In

Receive inventory from suppliers.

Batch receiving: multiple items per session.

Workflow:

Select Items
→ Enter Quantities
→ Save

Generate IN transactions.

---

### Outbound Cart

Primary warehouse workflow.

Process:

Search Item
→ Add To Cart
→ Set Quantity
→ Checkout

Cart Storage:

Client-side (localStorage).

Requirements:

* Fast item search
* Keyboard friendly
* Mobile friendly
* QR scan support
* Tablet optimized

Checkout requires:

* Reference Number (mandatory)
* Notes (optional)

Reference Number examples:

* Invoice Number
* Project Number
* Customer Order Number

All checkout items share the same reference number.

Checkout is all-or-nothing.

If any item has insufficient stock, the entire checkout fails.

---

### Branch Transfers

Process:

Create Transfer (Draft)
→ Ship (In Transit)
→ Receive (Received)

A transfer contains multiple line items.

Stock Deduction Timing:

Stock is deducted immediately when transfer status becomes In Transit.

Receiving branch receives stock when transfer is marked Received.

Generate:

* TRANSFER_OUT at In Transit (sent_qty)
* TRANSFER_IN at Received (received_qty)

Transfer status:

* Draft
* In Transit
* Received
* Cancelled

### Transfer Variance

Partial and excess receiving is allowed.

Received quantities may differ from sent quantities.

Variance = sent_qty - received_qty (per line item).

Variance is explicit, permanent, and not auto-corrected.

Variance represents damaged, missing, or otherwise unreceived inventory.

Mismatch triggers automatic audit entry with reason.

Transfer reports must show:

* Sent Qty
* Received Qty
* Variance Qty

Cancellation Rules:

* Cancel from Draft: no stock impact
* Cancel from In Transit: reversal adjustment to restore sender stock
* Cannot cancel from Received (terminal state)

---

### Stock Opname

Scope: Per category within a branch.

User selects branch and category, then enters actual stock count for all items in that category.

System calculates variance automatically.

Adjustments are applied immediately. No approval workflow.

Generate:

* ADJUSTMENT_PLUS
* ADJUSTMENT_MINUS

Stock opname must preserve full audit history.

---

### Reports

Format: PDF only. Must be concise, beautiful, and modern.

Report Types:

* Current Stock Report
* Inventory Movement Report
* Low Stock Report
* Stock Adjustment Report
* Transfer Report (with Sent/Received/Variance)
* Outbound Usage Report
* Supplier Activity Report

---

### Audit Logs

Track:

* User
* Action
* Timestamp
* Old Value
* New Value

Audit logs cannot be edited or deleted.

---

## Database Principles

Inventory transactions are immutable.

Never delete stock history.

Every inventory movement must be traceable.

All inventory-changing operations must use database transactions.

branch_stocks is a performance cache only.

The inventory ledger is always the source of truth.

Ledger table columns are append-only (new columns permitted, alterations and drops forbidden).

---

## UI and Localization

Language:

Bahasa Indonesia, except for technical and workplace terms commonly used in English (Dashboard, Login, Stock, Export, etc.).

Locale Formatting:

* Date: 18 Juni 2026
* Number: 1.000,50
* Time: 24-hour format

Notifications:

None in Version 1. Dashboard is the primary awareness mechanism.

---

## Performance Requirements

Target Users:

* 5-20 concurrent users

Expected Inventory Size:

* Thousands of inventory items

Target Response Time:

* Under 1 second for normal operations

Optimized for:

* Internal company use
* Warehouse tablets
* Warehouse smartphones
* Desktop office use

---

## Future Features

Not included in Version 1:

* Purchase Orders
* Supplier Portal
* Mobile App (native)
* Accounting Integration
* Multi-company Support
* Manufacturing Module
* Product Assembly Tracking
* BOM Support
* Notification System (email, push)
* Report Export to Excel/CSV
* Refresh Token Authentication
* Stock Opname Approval Workflow
