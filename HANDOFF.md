# Handoff Context

**Date:** 2026-07-13

**Role:** Full Stack / DevOps Engineer

**Completed:**
- **Phase 7 — Production Readiness (COMPLETE)**:
  - Infrastructure: Adjusted for Cloudflare Tunnel as the sole ingress. Replaced Caddy documentation with native Nginx SPA proxy (`frontend/nginx.conf`).
  - Infrastructure: Added log rotation limits to Docker Compose.
  - Security: Kept `/docs` available in production but protected it using `HTTPBasic` auth requiring the `super_admin` account.
  - Scripts: Created `prepare_go_live.py` (TRUNCATE transactions RESTART IDENTITY CASCADE) and `verify_backup.sh` (PG dump and restore validation).
  - Documentation: Rewrote `DEPLOYMENT.md`, `BACKUP_RECOVERY.md`, and `OPERATIONS.md`.
  - Versioning: Created Git tag `v1.0.0-rc1`.

**Architecture decisions (all locked in DECISIONS.md):**
- **Ingress Strategy**: Cloudflare Zero Trust Tunnel is used. No public ports are forwarded on the VPS. Nginx listens on port 80 internally.
- **Swagger Production**: Remains accessible but requires Super Admin credentials via Basic Auth.
- **Data Reset**: The Go-Live reset purely truncates transactions and cache tables (`branch_stocks`), resetting sequences, but perfectly preserves Master Data.

**Current:**
- Phase 7 is completely COMPLETE.
- Production compose build succeeds and serves the SPA and API correctly.
- Codebase is frozen at `v1.0.0-rc1`.

**Next:**
- Await user approval and instruction regarding actual VPS deployment, pilot run, or user training.

**Notes for Next Agent:**
- The `v1.0.0-rc1` tag has been applied. 
- In development, Swagger is still open. In production (`ENVIRONMENT=production`), Swagger requires `admin / admin123` via HTTPBasic auth dialog.
