# Backup & Recovery Procedures

This document outlines the backup and recovery procedures for the Gudang Piala Kaltim WMS. The database runs on PostgreSQL 16 via Docker, and the volume stores uploaded item images.

## 1. Automated/Manual Backups

### Database Backup
To create a complete backup of the PostgreSQL database, execute the following command on the host machine:

```bash
docker compose exec -T db pg_dump -U postgres gudang_piala_kaltim > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Volume Backup (Images & Media)
Compress the local `uploads` volume where item images are stored:

```bash
tar -czvf uploads_backup_$(date +%Y%m%d).tar.gz ./uploads
```

## 2. Restore Procedure

### Database Restore
If data loss occurs, restore from the `.sql` dump:

1. Copy the `.sql` dump file to the server.
2. Drop existing database and recreate it to ensure a clean slate, or drop schema public.
   ```bash
   docker compose exec -T db psql -U postgres -c "DROP DATABASE gudang_piala_kaltim WITH (FORCE);"
   docker compose exec -T db psql -U postgres -c "CREATE DATABASE gudang_piala_kaltim;"
   ```
3. Restore the SQL dump:
   ```bash
   cat backup_YYYYMMDD_HHMMSS.sql | docker compose exec -T db psql -U postgres -d gudang_piala_kaltim
   ```

## 3. Mandatory Verification Plan (Restore Test)

To ensure backups are not corrupt, a mandatory restore test must be performed periodically (e.g., monthly).

1. **Create a Backup**: Run the database backup command above.
2. **Create Temporary Database**: 
   ```bash
   docker compose exec -T db psql -U postgres -c "CREATE DATABASE gudang_piala_kaltim_restore_test;"
   ```
3. **Restore into Temporary Database**:
   ```bash
   cat backup_*.sql | docker compose exec -T db psql -U postgres -d gudang_piala_kaltim_restore_test
   ```
4. **Verify Application Data**:
   Query a critical table (e.g., `inventory_transactions`) to ensure data is present and valid.
   ```bash
   docker compose exec -T db psql -U postgres -d gudang_piala_kaltim_restore_test -c "SELECT COUNT(*) FROM inventory_transactions;"
   ```
   *The count should match your expectations and indicate that the data has been preserved.*
5. **Cleanup**: Drop the temporary testing database.
   ```bash
   docker compose exec -T db psql -U postgres -c "DROP DATABASE gudang_piala_kaltim_restore_test WITH (FORCE);"
   ```

*Note: Never skip the verification step! A backup is only valid if it can be successfully restored.*
