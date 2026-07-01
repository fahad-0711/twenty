#!/bin/bash
# ============================================================
# CallLive AI CRM — Database Backup Script
# Usage:
#   bash scripts/backup-db.sh            # Run full backup
#   bash scripts/backup-db.sh --dry-run  # Preview only
# ============================================================

set -euo pipefail

BACKUP_DIR="/backups/calllive-crm"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
COMPOSE_FILE="/opt/calllive-crm/packages/twenty-docker/docker-compose.yml"
RETENTION_DAYS=7

# Dry run mode
if [ "${1:-}" = "--dry-run" ]; then
  echo "DRY RUN: Would backup calllive_crm to ${BACKUP_DIR}/backup_${TIMESTAMP}.sql.gz"
  echo "DRY RUN: Would retain backups for ${RETENTION_DAYS} days"
  exit 0
fi

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Get the database container ID
DB_CONTAINER=$(docker compose -f "$COMPOSE_FILE" ps -q db 2>/dev/null)

if [ -z "$DB_CONTAINER" ]; then
  echo "ERROR: Database container not found. Is docker-compose running?"
  exit 1
fi

echo "Starting backup at $(date)..."

# Dump and compress
docker exec "$DB_CONTAINER" pg_dump \
  -U postgres \
  -d default \
  --no-owner \
  --no-privileges \
  | gzip > "${BACKUP_DIR}/backup_${TIMESTAMP}.sql.gz"

BACKUP_SIZE=$(du -h "${BACKUP_DIR}/backup_${TIMESTAMP}.sql.gz" | cut -f1)
echo "Backup saved: ${BACKUP_DIR}/backup_${TIMESTAMP}.sql.gz (${BACKUP_SIZE})"

# Clean up old backups
DELETED=$(find "$BACKUP_DIR" -name "*.sql.gz" -mtime +${RETENTION_DAYS} -delete -print | wc -l)
if [ "$DELETED" -gt 0 ]; then
  echo "Cleaned up ${DELETED} backup(s) older than ${RETENTION_DAYS} days"
fi

echo "Backup completed at $(date)"
