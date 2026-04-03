# Mototun

Mototun is a production-oriented motorcycle sales and operations platform with a React + Vite frontend and a .NET 8 backend. The application covers authentication, password reset, client and invoice management, role-based dashboards, and sensitive document upload flows.

## Tech Stack

- Frontend: React 19, Vite, React Router, React Query, Axios
- Backend: ASP.NET Core 8, EF Core 8, SQL Server
- Auth: JWT-based session/auth flow with protected API endpoints
- Email: Resend API
- Deployment: Render for backend, Vercel for frontend
- Storage: Azure Blob Storage is supported for dossier documents, invoice branding assets, and avatars, with local fallback when Blob is not configured

## Architecture Summary

- `backend/src/mototun.API`: ASP.NET Core API, controllers, startup, production validation, storage and email integrations
- `backend/src/mototun.Core`: domain entities and shared business models
- `backend/src/mototun.Infrastructure`: EF Core database context, migrations, and infrastructure services
- `backend/tests`: infrastructure and integration tests covering auth, uploads, invoices, health, and production validation
- `frontend/src`: React application split into pages, components, services, context, utilities, and feature modules

Uploads are stored on disk under `Storage`, while the database keeps metadata and relationships. Only avatar assets are publicly exposed. Sensitive client portal documents remain protected behind API authorization.

## Repository Structure

```text
backend/
  src/
    mototun.API/
    mototun.Core/
    mototun.Infrastructure/
  tests/
  docs/
  tools/ocr-service/
frontend/
  src/
  public/
PRODUCTION_HANDOFF.md
FINAL_RELEASE_REPORT.md
README.md
```

## Local Development Setup

### Prerequisites

- .NET SDK 8.x
- Node.js 20+
- npm
- SQL Server or Azure SQL

### Backend configuration

Use `backend/.env.example` as the local template and `backend/.env.production.example` as the production-safe reference. Do not commit real values.

Important: the .NET backend reads standard environment variables. It does not automatically load `.env.local` unless your own shell or IDE does that for you.

Also note:
- `backend/src/mototun.API/appsettings.Local.json` is local-only
- `backend/src/mototun.API/appsettings.Production.json` is not the production source of truth
- production should run from `appsettings.json` plus environment variables only

Minimum backend variables for local work:

```env
DATABASE__DEFAULT_CONNECTION=
JWT_SETTINGS__SECRET_KEY=
AUTH_SETTINGS__PASSWORD_RESET_URL=http://localhost:5173/reset-password
CORS__ALLOWED_ORIGINS__0=http://localhost:5173
RESEND__BASE_URL=https://api.resend.com
RESEND__API_KEY=
RESEND__SENDER_EMAIL=
RESEND__SENDER_NAME=Tunimoto
CLOUDFLARE__TURNSTILE__ENABLED=false
```

### Frontend configuration

Use `frontend/.env.example` for local work and `frontend/.env.production.example` as the production-safe reference:

```env
VITE_API_BASE_URL=http://localhost:5050/api
VITE_CLOUDFLARE_TURNSTILE_SITE_KEY=
```

## Run Instructions

### Backend

From the repo root:

```powershell
$env:ASPNETCORE_ENVIRONMENT="Development"
$env:DATABASE__DEFAULT_CONNECTION="Server=tcp:YOUR_SERVER,1433;Initial Catalog=YOUR_DB;User ID=YOUR_USER;Password=YOUR_PASSWORD;Encrypt=True;TrustServerCertificate=False;"
$env:JWT_SETTINGS__SECRET_KEY="YOUR_LONG_LOCAL_SECRET_AT_LEAST_32_CHARS"
dotnet run --project backend/src/mototun.API
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

## Database Migrations

Apply migrations with:

```powershell
dotnet ef database update --project backend/src/mototun.Infrastructure --startup-project backend/src/mototun.API
```

## Test, Lint, and Build Commands

Backend tests:

```powershell
dotnet test backend/mototun.sln -c Release
```

Frontend lint:

```powershell
cd frontend
npm run lint
```

Frontend production build:

```powershell
cd frontend
npm run build
```

Frontend E2E smoke tests if configured:

```powershell
cd frontend
npm run e2e
```

## Production Environment Variables

### Backend required on Render

```env
ASPNETCORE_ENVIRONMENT=Production
DATABASE__DEFAULT_CONNECTION=
JWT_SETTINGS__SECRET_KEY=
JWT_SETTINGS__ISSUER=MototunAPI
JWT_SETTINGS__AUDIENCE=MototunClient
JWT_SETTINGS__EXPIRATION_IN_DAYS=7
AUTH_SETTINGS__PASSWORD_RESET_URL=
AUTH_SETTINGS__PASSWORD_RESET_TOKEN_EXPIRY_MINUTES=30
CORS__ALLOWED_ORIGINS__0=
RESEND__BASE_URL=https://api.resend.com
RESEND__API_KEY=
RESEND__SENDER_EMAIL=
RESEND__SENDER_NAME=Tunimoto
RESEND__ALLOW_DEVELOPMENT_FALLBACK=false
CLOUDFLARE__TURNSTILE__ENABLED=true
CLOUDFLARE__TURNSTILE__SECRET_KEY=
CLOUDFLARE__TURNSTILE__VERIFY_ENDPOINT=https://challenges.cloudflare.com/turnstile/v0/siteverify
ADMIN_BOOTSTRAP__ENABLED=false
```

Azure Blob storage:

```env
AZURE_BLOB__CONNECTION_STRING=
AZURE_BLOB__DOCUMENTS_CONTAINER=client-portal-docs
AZURE_BLOB__AVATARS_CONTAINER=avatars
AZURE_BLOB__INVOICE_SETTINGS_CONTAINER=invoice-pdf-settings
```

Optional OCR:

```env
DOCUMENT_OCR__ENABLED=false
DOCUMENT_OCR__BASE_URL=
DOCUMENT_OCR__ANALYZE_PATH=/api/ocr/analyze
DOCUMENT_OCR__API_KEY=
DOCUMENT_OCR__TIMEOUT_SECONDS=30
DOCUMENT_OCR__MIN_CONFIDENCE=0.65
```

### Frontend required on Vercel

```env
VITE_API_BASE_URL=
VITE_CLOUDFLARE_TURNSTILE_SITE_KEY=
```

## Production Deployment Summary

- Backend deploy target: Render Docker web service using `backend/Dockerfile`
- Frontend deploy target: Vercel project rooted at `frontend`
- Database: Azure SQL / SQL Server
- Email: Resend API
- DNS / proxy: Cloudflare in front of the API only (`api.tunimoto.tn`)
- Health endpoint: `/health`

Full deployment values and launch sequence are documented in `PRODUCTION_HANDOFF.md`.
For the full step-by-step runbook, use `docs/DEPLOYMENT_RUNBOOK.md`.
For GitHub push preparation and `.gitignore` verification, use `docs/GIT_PUSH_GUIDE.md`.

## Render Deployment Notes

- Service type: Web Service
- Runtime: Docker
- Root directory: `backend`
- Dockerfile path: `Dockerfile`
- Health check path: `/health`
- Add a persistent disk mounted at `/app/Storage` only if you intentionally keep local avatar fallback or legacy local files
- Set environment variables in Render, not in source files

## Vercel Deployment Notes

- Root directory: `frontend`
- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Keep `frontend/vercel.json` committed so SPA routes rewrite to `index.html`

## Resend Email Setup Summary

Use the Resend API settings:

```env
RESEND__BASE_URL=https://api.resend.com
RESEND__API_KEY=<Resend API key>
RESEND__SENDER_EMAIL=<verified sender address>
RESEND__SENDER_NAME=Tunimoto
```

The password reset flow depends on a valid `AUTH_SETTINGS__PASSWORD_RESET_URL` and a verified Resend sender.

## Security Notes

- Never commit real `.env` or local override files.
- Keep production secrets out of `appsettings.json`.
- Rotate any previously exposed Resend API keys immediately.
- Keep `ADMIN_BOOTSTRAP__ENABLED=false` in production.
- Only browser-safe values should use the `VITE_` prefix.
- Sensitive uploads must remain outside public static file exposure.

## Troubleshooting

### Database connection fails

- Verify the SQL Server connection string format
- Confirm the database firewall allows your machine or Render outbound IPs
- Re-run EF migrations against the target DB

### CORS errors in production

- Make sure `CORS__ALLOWED_ORIGINS__*` exactly match the frontend origin
- Confirm frontend is using the real production `VITE_API_BASE_URL`

### Password reset email not arriving

- Verify `RESEND__API_KEY` is the current Resend API key
- Verify the sender domain/address in Resend
- Confirm `AUTH_SETTINGS__PASSWORD_RESET_URL` points to the live frontend

### Uploads disappear after backend restart

- If Blob is not used for avatars, confirm Render has a persistent disk mounted at `/app/Storage`

### Health check returns degraded

- Inspect backend logs
- Confirm SQL connectivity
- Confirm required production variables are set
