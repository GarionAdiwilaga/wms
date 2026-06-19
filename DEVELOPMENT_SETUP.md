# Development Setup Guide

This guide details the step-by-step process for configuring your strictly **Docker-first** development environment on an **Ubuntu/Debian Linux VPS**.

## 1. Required Software

You do **NOT** need to install Python or Node.js natively on the server. The entire application runs inside Docker.

Connect to your VPS via SSH and install the following:

1. **Docker Engine & Docker Compose (v2)**
   * Install natively following the official Docker documentation for Ubuntu/Debian.
2. **Git**
   * Pre-installed on most Linux distributions.

## 2. Remote Development Workspace

It is highly recommended to use **VS Code Remote - SSH** to develop directly on the server:

1. Install VS Code on your Windows machine.
2. Install the **Remote - SSH** extension from Microsoft.
3. Connect to your VPS.
4. Open the code folder. VS Code will seamlessly forward all local ports (e.g., `localhost:8000`, `localhost:5173`) from the server to your Windows browser automatically.

## 3. Git Initialization

Once connected to your VPS terminal, clone the repository:

```bash
git clone <repository-url>
cd "Stock Database Gudang Piala Kaltim"
```

## 4. Environment Configuration

The project uses a **single source of truth** for environment variables located at the project root.

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` in your editor and set:
   * `INITIAL_ADMIN_PASSWORD=your_secure_password`
   * Keep the `DATABASE_URL` as it is pre-configured for the internal Docker network (`postgresql://postgres:postgres@db:5432/...`).

## 5. Validation Checkpoint

**Development should not continue until these steps pass successfully.**

1. **Start the Infrastructure**:
   From the project root, build and start all containers in detached mode:
   ```bash
   docker compose up -d --build
   ```

2. **Verify Containers**:
   Check that the `db`, `backend`, and `frontend` containers are running without errors:
   ```bash
   docker compose ps
   ```

3. **Run Database Migrations**:
   Execute Alembic inside the running backend container to build the schema:
   ```bash
   docker compose exec backend alembic upgrade head
   ```

4. **Run Seed Script**:
   Populate the master data and Super Admin account:
   ```bash
   docker compose exec backend python scripts/seed_runner.py
   ```

If all of the above commands execute without errors, your database and API are fully initialized!

## 6. Development Workflow

### Dependency Management
* **Backend**: `backend/pyproject.toml` is the absolute source of truth. When adding Python packages, update this file and rebuild the container (`docker compose up -d --build backend`).
* **Frontend**: `frontend/package.json` manages frontend dependencies.

### Application Endpoints
If using VS Code Remote - SSH, your application is automatically mapped to your local Windows browser:
* **Frontend UI**: [http://localhost:5173](http://localhost:5173)
* **Backend API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

## 7. Common Troubleshooting Steps

### Containers crash due to Out-Of-Memory (OOM)
* **Cause**: Your VPS has 1GB of RAM or less, and running the Database + API + React dev server requires slightly more memory.
* **Fix**: Create a Swap file on your VPS to instantly increase virtual memory without upgrading your server:
  ```bash
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  ```
