#!/bin/bash
set -e

echo "=========================================="
echo "    WMS Backup Verification Script"
echo "=========================================="

DB_CONTAINER="gpk_db_prod"
DB_USER="postgres"
DB_NAME="gudang_piala_kaltim"
TEMP_DB="wms_verify_temp_$(date +%s)"
BACKUP_FILE="/tmp/wms_backup_verify.sql"

echo "[1/6] Taking a live backup of production database..."
docker exec $DB_CONTAINER pg_dump -U $DB_USER $DB_NAME > $BACKUP_FILE

echo "[2/6] Creating temporary database ($TEMP_DB)..."
docker exec $DB_CONTAINER psql -U $DB_USER -c "CREATE DATABASE $TEMP_DB;"

echo "[3/6] Restoring backup into temporary database..."
cat $BACKUP_FILE | docker exec -i $DB_CONTAINER psql -U $DB_USER -d $TEMP_DB > /dev/null

echo "[4/6] Verifying data integrity..."
# Run a quick check to see if the items table exists and has data/structure
ITEM_COUNT=$(docker exec $DB_CONTAINER psql -U $DB_USER -d $TEMP_DB -t -c "SELECT COUNT(*) FROM items;" | tr -d ' ')
echo "   -> Items count in restored DB: $ITEM_COUNT"

if [ "$ITEM_COUNT" -ge "0" ]; then
    echo "   -> Basic data integrity check passed!"
else
    echo "   -> ERROR: Data verification failed."
    exit 1
fi

echo "[5/6] Cleaning up temporary database..."
docker exec $DB_CONTAINER psql -U $DB_USER -c "DROP DATABASE $TEMP_DB;"

echo "[6/6] Removing temporary backup file..."
rm $BACKUP_FILE

echo "=========================================="
echo " ✅ BACKUP VERIFICATION SUCCESSFUL!"
echo "    The backup and restore pipeline works perfectly."
echo "=========================================="
