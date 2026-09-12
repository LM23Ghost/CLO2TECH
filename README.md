# Cloud2Tech

Cloud2Tech delivers affordable, cloud-first IT services for SMEs, schools, and municipalities in South Africa.

## Modules

- `modules/sme-hub` - SME Cloud Hub for subscriptions, support, and onboarding.
- `modules/school-platform` - School Digital Inclusion Platform for devices, education tenants, and training.
- `modules/municipal-dashboard` - Municipal Service Dashboard for citizen reports, workflows, and transparency.

## Quick start

```powershell
npm install
npm run dev:sme
```

Each module runs an Express API on port `4001`, `4002`, or `4003`, and a Vite React client on the next port. Use the module-specific `README.md` files for the exact commands.

Copy `.env.example` to `.env` before connecting Azure, AWS, PostgreSQL, Microsoft Graph, Mapbox, or payment providers. The initial APIs are intentionally in-memory and expose health checks plus contract-shaped example endpoints.

## Project conventions

- Backend code lives in each module's `server/` directory.
- Frontend code lives in each module's `frontend/` directory.
- Feature ownership is grouped in the named feature folders under each module.
- API contracts are documented in [`docs/architecture.md`](docs/architecture.md).
