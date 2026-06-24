# Deployment Guide

This guide details the deployment process for Gudang Piala Kaltim WMS into a production environment using Docker Compose and a reverse proxy (e.g., Caddy or Nginx).

## Prerequisites
- A Linux server (Ubuntu 22.04+ recommended)
- Docker and Docker Compose installed
- A registered domain name pointing to the server's IP address
- SSL Certificates (managed by Caddy automatically, or Certbot for Nginx)

## 1. Initial Server Setup
1. SSH into your server.
2. Clone the repository or copy the `docker-compose.yml`, `backend/`, and `frontend/` folders.
3. Secure the server (configure UFW firewall to allow ports 80, 443, and 22).

## 2. Environment Configuration
Create a `.env` file in the root directory (where `docker-compose.yml` resides) based on the production secrets:

```env
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_db_password
POSTGRES_DB=gudang_piala_kaltim

# Backend
DATABASE_URL=postgresql://postgres:your_secure_db_password@db:5432/gudang_piala_kaltim
JWT_SECRET_KEY=your_secure_random_jwt_secret_key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Reverse Proxy / Frontend
DOMAIN_NAME=wms.yourdomain.com
```

## 3. Docker Compose Hardening
Ensure the production `docker-compose.yml` includes the following hardening rules:
- **Restart Policies**: Set `restart: unless-stopped` on all services.
- **Port Bindings**: Only expose the Reverse Proxy (ports 80 and 443) to the host. The `backend`, `frontend`, and `db` services should only be accessible within the internal Docker network.
- **Healthchecks**: Enable healthchecks for the `db` and `backend` services.

## 4. Reverse Proxy Setup (Caddy Example)
Create a `Caddyfile` to reverse proxy traffic and automatically manage HTTPS:

```caddyfile
wms.yourdomain.com {
    # Proxy API requests to backend
    handle /api/* {
        reverse_proxy backend:8000
    }

    # Proxy uploads
    handle /uploads/* {
        reverse_proxy backend:8000
    }

    # Proxy frontend
    handle /* {
        reverse_proxy frontend:5173
    }
}
```

## 5. Deployment Execution
Run the following command to build the images and start the services in detached mode:

```bash
docker compose up -d --build
```

Verify that the services are healthy:
```bash
docker compose ps
```

Apply database migrations:
```bash
docker compose exec backend alembic upgrade head
```

## 6. Create Initial Super Admin
Generate the first Super Admin account (if starting from a fresh database):
```bash
docker compose exec backend python scripts/create_admin.py
```
