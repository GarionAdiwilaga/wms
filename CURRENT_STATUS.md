# Current Status

## Phase
- **Phase 7 (Production Readiness)**: ✅ COMPLETED
- **Phase 8 (Pilot Deployment & Training)**: ✅ COMPLETED

## Last Completed
- **QR Image Export Fix**:
  - Frontend: Replaced print utility with an in-memory canvas-based JPEG download handler in `QRViewDialog.tsx`.
  - Layout: Generates `QR_ItemInfo.jpeg` at `500x500px` displaying a rounded border, centered QR code, monospace item code, wrapped item name (up to 2 lines), and brand metadata.
  - Compliance: Ensures 100% backward-compatibility for database and VPS without modifying production master data or operational backend code.
- **Phase 8 — Pilot Deployment & Training**:
  - Documentation: Created a fully modular documentation system in `wms/docs/` containing structured User Manuals (`user/`) and Server Setup & Maintenance Guides (`server/`).
  - Verification & Media: Spawned development containers, ran alembic migrations, seeded the database with a rich QA dataset, and used browser automation to take 10 high-resolution screenshots of the real UI.
  - Integration: Mapped the screenshots directly into the documentation files to act as visual guides.
  - Security: Documented production Swagger access with HTTPBasic Authentication using `super_admin` credentials.
- **Phase 7 — Production Readiness**:
  - Backend: Added `prepare_go_live.py` to safely purge transaction tables and reset Postgres sequences prior to Go-Live, with interactive safety confirmations.
  - Backend: Added `verify_backup.sh` shell script to automatically rehearse a backup/restore cycle using a temporary database to ensure disaster recovery works.
  - Backend: Restricted Swagger (`/docs`, `/redoc`, `/openapi.json`) behind HTTPBasic authentication connected to the `super_admin` role in production.
  - Frontend/Infrastructure: Created `nginx.conf` and updated `Dockerfile.prod` to support SPA routing alongside API/Upload proxying natively without external Caddy dependence.
  - Infrastructure: Updated `docker-compose.prod.yml` to set restart policies and log-rotation (max-size 10m).
  - Infrastructure: Deployed and tested production architecture simulating Cloudflare Tunnel ingress (proxying via localhost:80).
  - Documentation: Updated `DEPLOYMENT.md`, `BACKUP_RECOVERY.md`, and `OPERATIONS.md`.
  - Infrastructure: Updated `docker-compose.prod.yml` to support a persistent named volume for user uploads.
  - Infrastructure: Added `setup_vps.sh` script to automate host dependencies, environment generation, and migration runner.
  - Release: Applied Git tag `v1.0.0-rc1` to freeze the codebase.

## Current Branch
- `main`

## Current Focus
- System handoff, production VPS setup (`wms.rionlab.space`), and Go-Live execution by the user.

## Next Task
- Support the user during production launch on the Ubuntu VPS.
- Gather feedback on pilot phase or user operations.

## Blockers
- None. System is fully documented, feature-complete, and production-ready.

