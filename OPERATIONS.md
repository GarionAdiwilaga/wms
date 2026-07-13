# Operations Guide

## 1. Log Management
Docker containers generate logs continuously. In our `docker-compose.prod.yml`, we have configured Docker's json-file driver to rotate logs automatically (e.g., max-size: 10m, max-file: 3). This prevents uncontrolled log growth on the host system.

**To view real-time logs for the backend:**
```bash
docker compose -f docker-compose.prod.yml logs -f backend
```

**To view Nginx (frontend) access and error logs:**
```bash
docker compose -f docker-compose.prod.yml logs -f frontend
```

## 2. Restarting Services
When you need to restart the application (e.g., after a system reboot or to apply a new configuration):

```bash
docker compose -f docker-compose.prod.yml restart
```

To stop all services completely:
```bash
docker compose -f docker-compose.prod.yml down
```
*(This stops the containers, but data in the database volume remains safe).*

## 3. Cloudflare Tunnel Operations
Since the application runs securely behind a Cloudflare Tunnel, the `cloudflared` service is responsible for ingress.

**To check the status of the tunnel:**
```bash
sudo systemctl status cloudflared
```

**To restart the tunnel service:**
```bash
sudo systemctl restart cloudflared
```

## 4. Resetting Data for Go-Live
When transitioning from UAT (User Acceptance Testing) to real Production operations, you must clear out dummy transaction data while keeping the Master Data (Items, Branches, Users).

Run the preparation script:
```bash
docker compose exec backend python scripts/prepare_go_live.py
```
This script includes safety prompts to prevent accidental execution.
