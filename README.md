# 🏆 Gudang Piala Kaltim WMS

A custom-built, enterprise-grade **Warehouse Management System (WMS)** specifically designed to manage inventory for trophy, plaque, medal, and merchandise manufacturing at Gudang Piala Kaltim.

This system replaces legacy spreadsheet-based inventory tracking with a highly resilient, centralized web application. It enforces strict auditability, multi-branch tracking, and accurate stock reconciliation.

---

## ✨ Key Features

- **Immutable Ledger Architecture:** All stock movements are recorded as immutable transactions. Total stock is dynamically calculated, preventing desynchronization or phantom inventory.
- **Multi-Branch Operations:** Seamlessly track stock across different physical warehouses. Execute inter-branch transfers with strict state machines (Draft ➔ In Transit ➔ Received), including variance tracking for lost or damaged goods.
- **Robust Stock Reconciliation (Opname):** Comprehensive stock opname (physical count) workflows supporting partial or full-warehouse audits with automatic ledger adjustment.
- **Advanced Analytics & Dashboards:** Real-time KPI monitoring, outbound movement velocity, interactive charts (Recharts), and low-stock alerts.
- **Hardware Integrations:** Designed for rapid POS-style interactions with barcode scanner support, keyboard shortcuts, and "press-and-hold" quantity steppers.
- **Enterprise Reporting:** Pixel-perfect PDF generation (via WeasyPrint/Jinja2) for all transactions and analytical reports, alongside raw CSV/XLSX exports.
- **Granular Security:** Role-based access control (Super Admin, Branch Head, Warehouse Staff) protecting sensitive operations and analytical data.

## 🛠 Technology Stack

The application is a decoupled monolith utilizing modern web technologies:

- **Backend:** Python 3.12, FastAPI, SQLAlchemy (ORM), Alembic (Migrations), PostgreSQL 16.
- **Frontend:** React 19 (Vite), TypeScript, Zustand (State), React Query, Shadcn UI, Tailwind CSS, Framer Motion.
- **Infrastructure:** Docker & Docker Compose, Nginx (Reverse Proxy & SPA routing).
- **Deployment Strategy:** Intended for private VPS deployment behind a **Cloudflare Zero Trust Tunnel** for secure, port-less public ingress.

## 📚 Documentation

The repository is thoroughly documented. For detailed operational instructions, architectural decisions, and development setups, please refer to the following resources:

* **[User Manuals](docs/user/README.md)**: Guides for warehouse staff on how to use the web application.
* **[Server Administration](docs/server/README.md)**: Complete guide on deploying the VPS, configuring Cloudflare Tunnels, managing Docker, and restoring backups.
* **[Architecture Document](ARCHITECTURE.md)**: Deep dive into the ledger mathematics, backend service layers, and frontend patterns.
* **[Deployment & Operations](DEPLOYMENT.md)**: Quick-reference for maintaining the production environment.

## 🚀 Quick Start (Development)

To spin up the development environment locally:

```bash
# Clone the repository
git clone git@github.com:GarionAdiwilaga/wms.git
cd wms

# Start the PostgreSQL Database and Backend API
docker compose up -d db backend

# In a separate terminal, install dependencies and start the Frontend
cd frontend
npm install
npm run dev
```

> The API will be available at `http://localhost:8000` and the UI at `http://localhost:5173`. Default super admin credentials are `admin` / `admin123`.

## 🛡 Production Deployment

Production uses a highly optimized, fully containerized stack (`docker-compose.prod.yml`). The frontend is compiled into static assets and served by Nginx, which also acts as a reverse proxy for the API.

To deploy on a fresh Ubuntu 24.04 VPS:
```bash
chmod +x setup_vps.sh
sudo ./setup_vps.sh
```
*For complete production networking and security details, see the [Server Setup Guide](docs/server/README.md).*
