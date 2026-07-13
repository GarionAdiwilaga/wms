# Backup & Recovery Guide

## 1. Automated Backups (Cron Job)
It is highly recommended to run daily backups using a cron job. The script should generate a timestamped SQL dump and safely store it outside the container.

**Backup Command:**
```bash
docker exec gpk_db_prod pg_dump -U postgres gudang_piala_kaltim > /path/to/backups/wms_backup_$(date +%F).sql
```

## 2. Backup Verification Rehearsal (Required)
Taking backups is useless if they cannot be restored. We mandate periodic backup validation. 
A dedicated verification script is provided which will:
1. Take a live backup.
2. Restore it into a temporary database (`wms_verify_temp`).
3. Run an integrity check.
4. Clean up and delete the temporary database.

**To verify the backup pipeline:**
```bash
./backend/scripts/verify_backup.sh
```
Ensure the script returns `✅ BACKUP VERIFICATION SUCCESSFUL!`.

## 3. Disaster Recovery (Restore Procedure)
If the primary database crashes or data gets corrupted, follow this procedure to restore from the latest SQL backup:

1. **Stop the backend** to prevent new connections during the restore process:
   ```bash
   docker compose -f docker-compose.prod.yml stop backend
   ```

2. **Drop the current database and create a fresh one**:
   ```bash
   docker exec -i gpk_db_prod psql -U postgres -c "DROP DATABASE gudang_piala_kaltim;"
   docker exec -i gpk_db_prod psql -U postgres -c "CREATE DATABASE gudang_piala_kaltim;"
   ```

3. **Restore the SQL dump into the fresh database**:
   ```bash
   cat /path/to/backups/wms_backup_YYYY-MM-DD.sql | docker exec -i gpk_db_prod psql -U postgres -d gudang_piala_kaltim
   ```

4. **Restart the services**:
   ```bash
   docker compose -f docker-compose.prod.yml start backend
   ```

Your system is now restored to the state of the backup.
