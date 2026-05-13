set -eu

if [ "${RUN_MIGRATIONS_ON_START:-false}" = "true" ]; then
  node packages/db/scripts/migrate-runtime.mjs
fi

exec "$@"
