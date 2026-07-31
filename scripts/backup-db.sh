#!/usr/bin/env bash
# DLA Access Enterprise - Backup automatizado de PostgreSQL
# Uso: DATABASE_URL="postgres://user:pass@host:5432/db" ./scripts/backup-db.sh [destino]
# En Render: programa un Cron Job con el comando: bash scripts/backup-db.sh /var/data/backups
set -euo pipefail

DEST="${1:-./backups}"
STAMP="$(date +%Y%m%d_%H%M%S)"
mkdir -p "$DEST"

DB_URL="${DATABASE_URL:-postgresql://postgres@localhost:5432/dla_access_enterprise}"
# Limpia el esquema de la URL para pg_dump (acepta postgres:// y postgresql://)
DUMP_URL="$DB_URL"

echo "[backup] Iniciando respaldo -> $DEST/dla_backup_$STAMP.dump"
pg_dump "$DUMP_URL" --format=custom --no-owner --file "$DEST/dla_backup_$STAMP.dump"

# Retencion: conservar ultimos 14 backups, eliminar mas antiguos
find "$DEST" -name 'dla_backup_*.dump' -mtime +14 -delete

echo "[backup] Completo: $DEST/dla_backup_$STAMP.dump ($(du -h "$DEST/dla_backup_$STAMP.dump" | cut -f1))"

# Restauracion (documentada):
#   pg_restore --no-owner --clean --if-exists -d DATABASE_URL dla_backup_XXXX.dump
