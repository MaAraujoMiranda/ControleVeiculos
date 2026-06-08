#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/ControleVeiculos}"
SOURCE_DIR="${SOURCE_DIR:-$GITHUB_WORKSPACE}"
TARGET="${TARGET:-all}"
SKIP_MIGRATIONS="${SKIP_MIGRATIONS:-false}"
SKIP_BACKUP="${SKIP_BACKUP:-false}"

if [ "$(id -u)" -eq 0 ]; then
  SUDO=""
else
  SUDO="${SUDO:-sudo}"
fi

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [controle-veiculos/$TARGET] $*"; }
die() { log "ERRO: $*"; exit 1; }

needs_api() {
  [ "$TARGET" = "api" ] || [ "$TARGET" = "all" ]
}

needs_web() {
  [ "$TARGET" = "web" ] || [ "$TARGET" = "all" ]
}

log "======================================================="
log "Deploy iniciado - alvo: $TARGET"
log "Source: $SOURCE_DIR"
log "App dir: $APP_DIR"
log "======================================================="

[ -d "$APP_DIR" ] || die "Diretorio $APP_DIR nao encontrado"

if needs_api; then
  [ -f "$APP_DIR/apps/api/.env" ] || die "apps/api/.env nao encontrado em $APP_DIR"
fi

if needs_web; then
  [ -f "$APP_DIR/apps/web/.env.local" ] || die "apps/web/.env.local nao encontrado em $APP_DIR"
fi

log "Injetando variaveis no workspace..."
if needs_api; then
  cp "$APP_DIR/apps/api/.env" "$SOURCE_DIR/apps/api/.env"
fi

if needs_web; then
  cp "$APP_DIR/apps/web/.env.local" "$SOURCE_DIR/apps/web/.env.local"
  cp "$APP_DIR/apps/web/.env.local" "$SOURCE_DIR/apps/web/.env.production.local"
fi

log "Instalando dependencias..."
cd "$SOURCE_DIR"
pnpm install --frozen-lockfile

if needs_api; then
  log "Gerando Prisma Client..."
  pnpm --filter api db:generate
fi

case "$TARGET" in
  api)
    log "Build API..."
    pnpm --filter api build
    ;;
  web)
    log "Build Web..."
    pnpm --filter web build
    ;;
  all)
    log "Build completo..."
    pnpm build
    ;;
  *)
    die "TARGET '$TARGET' desconhecido. Use: all | api | web"
    ;;
esac

if [ "$SKIP_BACKUP" != "true" ]; then
  BACKUP_TS="$(date '+%Y%m%d_%H%M%S')"
  BACKUP_DIR="$APP_DIR/backups/${TARGET}_${BACKUP_TS}"

  if [ -d "$APP_DIR/apps/api/dist" ] || [ -d "$APP_DIR/apps/web/.next" ]; then
    log "Criando backup em $BACKUP_DIR ..."
    $SUDO mkdir -p "$BACKUP_DIR"
    $SUDO cp -r "$APP_DIR/apps/api/dist" "$BACKUP_DIR/api_dist" 2>/dev/null || true
    $SUDO cp -r "$APP_DIR/apps/web/.next" "$BACKUP_DIR/web_next" 2>/dev/null || true
  fi
fi

log "Sincronizando para $APP_DIR ..."
$SUDO mkdir -p "$APP_DIR" "$APP_DIR/logs" "$APP_DIR/uploads" "$APP_DIR/backups"

RSYNC_EXCLUDES=(
  --exclude='.git'
  --exclude='.env*'
  --exclude='*.bak_*'
  --exclude='/logs/'
  --exclude='/backups/'
  --exclude='/uploads/'
  --exclude='/tmp/'
  --exclude='/apps/api/.env'
  --exclude='/apps/api/.env*'
  --exclude='/apps/api/logs/'
  --exclude='/apps/web/.env*'
  --exclude='/apps/web/logs/'
  --exclude='/INITIAL_ADMIN.txt'
)

if [ "$TARGET" = "api" ]; then
  RSYNC_EXCLUDES+=(--exclude='/apps/web/.next/')
fi

if [ "$TARGET" = "web" ]; then
  RSYNC_EXCLUDES+=(--exclude='/node_modules/')
  RSYNC_EXCLUDES+=(--exclude='/apps/api/dist/')
  RSYNC_EXCLUDES+=(--exclude='/apps/api/node_modules/')
fi

$SUDO rsync -a --delete "${RSYNC_EXCLUDES[@]}" "$SOURCE_DIR/" "$APP_DIR/"

if needs_api && [ "$SKIP_MIGRATIONS" != "true" ]; then
  log "Executando migrations Prisma..."
  cd "$APP_DIR/apps/api"
  pnpm prisma migrate deploy
fi

cd "$APP_DIR"

if needs_api; then
  log "Recarregando PM2: controle-veiculos-api"
  $SUDO pm2 reload controle-veiculos-api --update-env \
    || $SUDO pm2 start "$APP_DIR/ecosystem.config.js" --only controle-veiculos-api --env production
fi

if needs_web; then
  log "Recarregando PM2: controle-veiculos-web"
  $SUDO pm2 reload controle-veiculos-web --update-env \
    || $SUDO pm2 start "$APP_DIR/ecosystem.config.js" --only controle-veiculos-web --env production
fi

$SUDO pm2 save

log "Aguardando inicializacao (10s)..."
sleep 10

log "Status PM2:"
$SUDO pm2 status --no-color || true

log "======================================================="
log "Deploy $TARGET concluido"
log "======================================================="
