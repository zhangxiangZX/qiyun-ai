# Production data reset

Use this procedure once, immediately before the first commercial launch, to remove all development and test data from PostgreSQL, Redis, MinIO, Qdrant, and the local document volume.

## Safety requirements

- Run `powershell -ExecutionPolicy Bypass -File scripts/production-preflight.ps1` first.
- Confirm `.env.production` contains `API_RUNTIME_DRIVER=postgres` and `API_SEED_PREVIEW=false`.
- Stop customer traffic before execution.
- Do not run this procedure after real customer data has been created.

## Dry run

```bash
sh scripts/reset-production-data.sh
```

## Execute on the cloud server

```bash
export CONFIRM_RESET=RESET_QIYUN_PRODUCTION_DATA
sh scripts/reset-production-data.sh --execute
```

The script creates `backups/prelaunch-YYYYMMDD-HHMMSS/postgres.sql`, removes all Compose data volumes, runs every migration, and rebuilds the application. The platform administrator is recreated by the API from `.env.production`; preview tenant data remains disabled.
