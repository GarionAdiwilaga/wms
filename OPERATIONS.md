# Operations Playbook

This playbook contains daily maintenance, monitoring, and troubleshooting steps for the WMS.

## 1. Monitoring & Logs
Since we are focusing on pilot readiness without centralized logging stacks (like ELK), monitoring relies on `docker compose logs` and structured JSON logs.

### View Real-time Logs
To tail the logs of all services:
```bash
docker compose logs -f
```

To tail the logs of the backend only:
```bash
docker compose logs -f backend
```

### Search for Errors
Use grep to filter structured JSON logs for errors or exceptions:
```bash
docker compose logs backend | grep '"level": "ERROR"'
```

## 2. Daily Maintenance Checklist
- **Database Backup**: Verify the automated cron job has successfully generated a `pg_dump` file.
- **Disk Usage**: Check disk space on the server to ensure database and image uploads are not filling up the disk.
  ```bash
  df -h
  ```
- **Container Health**: Check that all containers are running and healthy.
  ```bash
  docker compose ps
  ```

## 3. Common Troubleshooting

### "Database Connection Refused"
- **Cause**: Database container crashed or is restarting.
- **Action**: Check DB logs `docker compose logs db`. Ensure there is enough disk space and memory on the host. Restart the container if necessary `docker compose restart db`.

### "500 Internal Server Error" on API
- **Cause**: Unhandled backend exception.
- **Action**: The exception is now caught by `ExceptionMiddleware` and logged with full stack trace.
  ```bash
  docker compose logs backend | grep 'Unhandled Exception'
  ```
  Review the `exc_info` field in the JSON log output for the stack trace.

### React Error Boundary "Terjadi Kesalahan" UI
- **Cause**: A frontend component threw an error during rendering.
- **Action**: Check the user's browser console for the specific error, or ask the user for a screenshot. The error message is printed on the screen for them. Validate the API response shape in the network tab.

## 4. Updates & Rollbacks
To update the application to a new version:
1. `git pull origin main`
2. `docker compose up -d --build`
3. `docker compose exec backend alembic upgrade head` (if schema changed)

If a rollback is required, checkout the previous Git tag and rebuild.
