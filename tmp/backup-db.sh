#!/bin/bash

# ============================================
# SCRIPT DE BACKUP DE BANCO DE DADOS
# ============================================

BACKUP_DIR="/root/backups"
LOG_FILE="/root/backups/backup-db.log"
DATE=$(date +%F_%H-%M-%S)
DB_MAIN="db_appchamado"
DB_LICENSES="db_mts_licenses"
CONTROL_ENV_FILE="/ControleVeiculos/apps/api/.env"
CONTROL_DB_FALLBACK="controle_veiculos_db"
MIN_SIZE=1000
LOCK_FILE="/tmp/backup-db.lock"
MAX_BACKUPS=7
MYSQL_CMD=(mysql --defaults-file=/root/.mysql-backup.cnf --host=127.0.0.1)
MYSQLDUMP_CMD=(mysqldump --defaults-file=/root/.mysql-backup.cnf --host=127.0.0.1 --single-transaction --no-tablespaces --routines --triggers)

log_message() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

extract_db_name_from_url() {
  local database_url="$1"
  echo "$database_url" | sed -E 's#^[^/]+//[^/]+/([^?]+).*$#\1#'
}

detect_control_db() {
  if [ -f "$CONTROL_ENV_FILE" ]; then
    local database_url
    database_url=$(grep '^DATABASE_URL=' "$CONTROL_ENV_FILE" | head -n1 | cut -d '=' -f2-)
    if [ -n "$database_url" ]; then
      extract_db_name_from_url "$database_url"
      return
    fi
  fi

  echo "$CONTROL_DB_FALLBACK"
}

database_exists() {
  local db_name="$1"
  [ -n "$db_name" ] || return 1
  "${MYSQL_CMD[@]}" -Nse "SHOW DATABASES LIKE '$db_name';" 2>> "$LOG_FILE" | grep -qx "$db_name"
}

backup_db() {
  local db_name="$1"
  local backup_file="$BACKUP_DIR/${db_name}_backup_$DATE.sql"
  local file_size

  log_message "Fazendo backup: $db_name"
  timeout 300 "${MYSQLDUMP_CMD[@]}" "$db_name" > "$backup_file" 2>> "$LOG_FILE"

  if [ $? -eq 0 ]; then
    file_size=$(stat -c%s "$backup_file")
    if [ "$file_size" -lt "$MIN_SIZE" ]; then
      log_message "ALERTA: Backup pequeno ($file_size bytes) - $db_name"
    fi
    log_message "OK: $backup_file ($(du -h "$backup_file" | cut -f1))"
    return 0
  fi

  log_message "ERRO: Falha no backup de $db_name"
  rm -f "$backup_file"
  return 1
}

rotate_backups() {
  local db_name="$1"
  local count

  count=$(find "$BACKUP_DIR" -maxdepth 1 -type f -name "${db_name}_backup_*.sql" | wc -l)
  if [ "$count" -gt "$MAX_BACKUPS" ]; then
    local to_remove=$((count - MAX_BACKUPS))
    log_message "Rotação $db_name: removendo $to_remove backups antigos"
    find "$BACKUP_DIR" -maxdepth 1 -type f -name "${db_name}_backup_*.sql" -printf '%T@ %p\n' | sort -nr | tail -n "$to_remove" | cut -d' ' -f2- | xargs -r rm -f
  fi
}

if [ -e "$LOCK_FILE" ]; then
  log_message "Erro: Script já em execução. Abortando."
  exit 1
fi

touch "$LOCK_FILE"
cleanup() { rm -f "$LOCK_FILE"; }
trap cleanup EXIT

mkdir -p "$BACKUP_DIR"

if ! systemctl is-active --quiet mysql; then
  log_message "Erro: MySQL não está ativo. Abortando."
  exit 1
fi

CONTROL_DB=$(detect_control_db)
DATABASES_TO_BACKUP=("$DB_MAIN" "$DB_LICENSES")

if [ -n "$CONTROL_DB" ] && [ "$CONTROL_DB" != "$DB_MAIN" ] && [ "$CONTROL_DB" != "$DB_LICENSES" ]; then
  DATABASES_TO_BACKUP+=("$CONTROL_DB")
fi

log_message "========== INICIANDO BACKUP =========="
log_message "Banco do Controle de Acesso detectado: $CONTROL_DB"

for DB in "${DATABASES_TO_BACKUP[@]}"; do
  if database_exists "$DB"; then
    backup_db "$DB"
    rotate_backups "$DB"
  else
    log_message "ALERTA: Banco não encontrado, ignorando: $DB"
  fi
done

log_message "Identificando bancos de tenants..."
mapfile -t TENANT_DBS < <("${MYSQL_CMD[@]}" -Nse "SHOW DATABASES;" 2>> "$LOG_FILE" | grep '^tenant_[0-9]*_db$' || true)

if [ ${#TENANT_DBS[@]} -eq 0 ]; then
  log_message "Nenhum tenant encontrado."
else
  for DB in "${TENANT_DBS[@]}"; do
    backup_db "$DB"
    rotate_backups "$DB"
  done
fi

log_message "Verificando integridade dos bancos..."
mysqlcheck --defaults-file=/root/.mysql-backup.cnf --host=127.0.0.1 --all-databases --check 2>> "$LOG_FILE"
if [ $? -eq 0 ]; then
  log_message "Integridade: OK"
else
  log_message "ALERTA: Problemas na verificação de integridade"
fi

find "$BACKUP_DIR" -maxdepth 1 -type f -name '*.sql' -mtime +14 -delete

TOTAL_SIZE=$(find "$BACKUP_DIR" -maxdepth 1 -type f -name '*.sql' -print0 | du -ch --files0-from=- 2>/dev/null | tail -1 | cut -f1)
DISK_USE=$(df -h / | tail -1 | awk '{print $5}')
TOTAL_FILES=$(find "$BACKUP_DIR" -maxdepth 1 -type f -name '*.sql' | wc -l)
log_message "Total backups: $TOTAL_FILES arquivos"
log_message "Espaço ocupado pelos dumps SQL: ${TOTAL_SIZE:-0}"
log_message "Uso do disco: $DISK_USE"
log_message "========== BACKUP FINALIZADO =========="
