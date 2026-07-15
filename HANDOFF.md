# Handoff Context

**Date:** 2026-07-15

**Role:** Full Stack / DevOps Engineer / Architect

**Completed:**
- **QR Image Export Fix (COMPLETE)**:
  - Replaced native browser print function with in-memory HTML5 Canvas 2D rendering.
  - Generates a high-quality `QR_ItemInfo.jpeg` image file at `500x500px` resolution, presenting a rounded border, centered QR code SVG image,monospace code, and wrapped description details.
  - Built with 100% backward-compatibility for database and VPS without modifying production master data or operational backend code.
- **Phase 8 — Pilot Deployment & Training (COMPLETE)**:
  - Documentation: Created modular documentation folders at `wms/docs/` (`user/` and `server/` with `README.md` indices).
  - Screenshots: Spun up local containers, ran Alembic migrations, seeded database via `seed_full_qa_dataset.py`, and used browser automation subagent to take 10 real UI screenshots. Saved directly in `wms/docs/assets/`.
  - Content details: Documented VPS architecture, automatic setup via `setup_vps.sh`, manual setup, Docker log rotation, Cloudflare Tunnel configuration for `wms.rionlab.space`, DB backup/cron jobs, backup verification rehearsal via `verify_backup.sh`, update procedures, and troubleshooting.
- **Phase 7 — Production Readiness (COMPLETE)**:
  - Infrastructure: Adjusted for Cloudflare Tunnel as the sole ingress. Replaced Caddy documentation with native Nginx SPA proxy (`frontend/nginx.conf`).
  - Infrastructure: Added log rotation limits to Docker Compose.
  - Security: Kept `/docs` available in production but protected it using `HTTPBasic` auth requiring the `super_admin` account.
  - Scripts: Created `prepare_go_live.py` (TRUNCATE transactions RESTART IDENTITY CASCADE) and `verify_backup.sh` (PG dump and restore validation).
  - Documentation: Rewrote `DEPLOYMENT.md`, `BACKUP_RECOVERY.md`, and `OPERATIONS.md`.
  - Infrastructure: Created `setup_vps.sh` for automated production environment deployment.
  - Infrastructure: Added persistent Named Volume for image uploads in production docker-compose config.
  - Versioning: Created Git tag `v1.0.0-rc1`.

**Architecture decisions (all locked in DECISIONS.md):**
- **Ingress Strategy**: Cloudflare Zero Trust Tunnel is used. No public ports are forwarded on the VPS. Nginx listens on port 80 internally.
- **Swagger Production**: Remains accessible but requires Super Admin credentials via Basic Auth.
- **Data Reset**: The Go-Live reset purely truncates transactions and cache tables (`branch_stocks`), resetting sequences, but perfectly preserves Master Data.

**Current:**
- All features and operational manuals are fully documented and integrated.
- Real high-resolution UI screenshots are stored in `wms/docs/assets/`.
- Local development containers have been cleaned up and stopped.

**Next:**
- Support the user in setting up the Ubuntu VPS and configuring the Cloudflare Tunnel for `wms.rionlab.space`.
- Conduct Go-Live data reset when UAT is finished.

**Notes for Next Agent:**
- The codebase remains frozen at `v1.0.0-rc1`.
- The screenshots are saved locally in the repo: `wms/docs/assets/`.
- Swagger basic authentication requires an active `super_admin` credential (default dev credentials: `admin / admin123`).

