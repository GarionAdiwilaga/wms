# Deployment Guide (Production)

## Arsitektur Deployment

Gudang Piala Kaltim WMS menggunakan arsitektur berikut untuk lingkungan *Production*:

- **OS Target**: Ubuntu Server 24.04.1 LTS (Private VPS behind NAT)
- **Containerization**: Docker & Docker Compose
- **Web Server / Reverse Proxy**: Nginx (Berjalan di dalam container `frontend`) melayani SPA Routing dan mem-proxy API.
- **Ingress / Akses Eksternal**: **Cloudflare Zero Trust Tunnel (cloudflared)** bertindak sebagai SATU-SATUNYA gerbang masuk (sole ingress) ke server.
  - *Public Port Forwarding* **TIDAK DIBUTUHKAN** (Tidak perlu membuka port 80/443 di router/firewall VPS).
  - HTTPS/SSL diurus sepenuhnya oleh Cloudflare Edge. Server lokal hanya perlu melayani HTTP biasa di port 80 yang di-binding oleh Nginx.

Alur Trafik:
`User (HTTPS)` -> `Cloudflare Edge` -> `Cloudflare Tunnel (cloudflared)` -> `Ubuntu VPS (localhost:80)` -> `Nginx (gpk_frontend_prod)` -> `FastAPI (gpk_backend_prod)`

## 1. Initial Server Setup
1. SSH into your Ubuntu 24.04 server.
2. Clone the repository to a suitable directory (e.g. `/opt/wms`).
3. Ensure Docker and Docker Compose are installed.
4. **Important**: You do NOT need to configure UFW to allow port 80/443 to the public internet since Cloudflare Tunnel handles ingress. Only SSH (22) needs to be exposed if you connect directly.

## 2. Environment Configuration
Create a `.env` file in the root directory (where `docker-compose.prod.yml` resides) based on the production secrets:

```env
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_db_password
POSTGRES_DB=gudang_piala_kaltim

# Backend
SECRET_KEY=your_secure_random_jwt_secret_key
INITIAL_ADMIN_PASSWORD=strong_admin_password
ENVIRONMENT=production
```

## 3. Docker Compose Execution
Run the following command to build the production images and start the services in detached mode:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Verify that the services are healthy:
```bash
docker compose -f docker-compose.prod.yml ps
```

The application is now running and bound to `localhost:80` inside the VPS.

## 4. Cloudflare Tunnel Setup
1. Install `cloudflared` on the Ubuntu VPS.
2. Authenticate `cloudflared` with your Cloudflare account.
3. Create a tunnel (e.g. `wms-tunnel`).
4. Route your domain (e.g. `wms.maricore.space`) to the tunnel pointing to `http://localhost:80`.
5. Start the tunnel as a system service.

At this point, the application will be securely accessible via HTTPS on your domain.

## 5. Go-Live Preparation (Reset Transactions)
If you have used the system for UAT or Pilot testing and want to reset all transaction histories while preserving Master Data:

```bash
docker compose exec backend python scripts/prepare_go_live.py
```
*Follow the on-screen prompts to confirm the data wipe.*

## 6. Database Migrations
For future updates, apply database migrations using:
```bash
docker compose exec backend alembic upgrade head
```
