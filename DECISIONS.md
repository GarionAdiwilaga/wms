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
