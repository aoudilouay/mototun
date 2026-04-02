# Mototun Production Handoff

This file is the launch handoff for the current repository state after the production-readiness pass on 2026-03-30 and the Batch 1 production config preparation.

## A. Production Blockers Fixed

- Backend config is now GitHub-safe by default:
  - `backend/src/mototun.API/appsettings.json` contains placeholders or safe defaults only.
  - production secrets are expected from environment variables.
- Email is wired to the Resend API:
  - config section is `Resend`
  - the app still contains a legacy `Smtp` section fallback in code, but production should use `Resend__*` variables only
- Azure Blob-backed storage is wired for:
  - private dossier documents
  - invoice PDF settings
- Avatar uploads still remain on local storage and should use a Render persistent disk for now
- Password reset no longer depends on a production localhost fallback.
- Production startup validation now enforces:
  - database connection string
  - JWT secret/issuer/audience
  - HTTPS-only frontend CORS origins
  - HTTPS reset-password URL
  - Resend API key and sender email
  - OCR base URL if OCR is enabled
- Added `/health` endpoint for deployment and uptime checks.
- Added proxy-aware startup with forwarded headers for Render-style reverse proxy deployments.
- Added centralized exception handling for unhandled API errors.
- Tightened invoice settings uploads so logo/signature files must be valid supported image types, not just under the size limit.
- Added Vercel SPA rewrite config so client-side routes do not 404 on refresh.

## B. Remaining Manual Tasks You Must Do

1. Confirm the Azure SQL production connection string and firewall access from Render.
2. Generate a strong production JWT secret and store it only in Render env vars.
3. Create the Resend API key, verify your sending domain, and choose the sender address.
4. Create Cloudflare Turnstile production site/secret keys and set them in Vercel/Render.
5. Create the Azure Blob containers and set the Blob connection string in Render.
6. Use the production domain shape below unless business constraints change:
   - frontend: `https://www.tunimoto.tn`
   - apex redirect: `https://tunimoto.tn`
   - backend API: `https://api.tunimoto.tn`
   Then set:
   - backend CORS allowed origins
   - backend password reset URL
   - frontend `VITE_API_BASE_URL`
7. Mount a Render persistent disk at `/app/Storage` until avatars are moved off local storage.
8. Apply EF Core migrations against the production database.
9. Deploy backend first, confirm `/health` is green, then deploy the frontend.
10. Run the manual QA checklist at the end of this file before launch.

## C. Exact Environment Variables For Render

Set these on the Render backend service:

```env
ASPNETCORE_ENVIRONMENT=Production
DATABASE__DEFAULT_CONNECTION=Server=...;Database=...;User Id=...;Password=...;Encrypt=True;TrustServerCertificate=False;

JWT_SETTINGS__SECRET_KEY=<32+ char random secret>
JWT_SETTINGS__ISSUER=MototunAPI
JWT_SETTINGS__AUDIENCE=MototunClient
JWT_SETTINGS__EXPIRATION_IN_DAYS=7

AUTH_SETTINGS__PASSWORD_RESET_URL=https://your-frontend-domain/reset-password
AUTH_SETTINGS__PASSWORD_RESET_TOKEN_EXPIRY_MINUTES=30

CORS__ALLOWED_ORIGINS__0=https://your-frontend-domain
CORS__ALLOWED_ORIGINS__1=https://www.your-frontend-domain

RESEND__BASE_URL=https://api.resend.com
RESEND__API_KEY=<your Resend API key>
RESEND__SENDER_EMAIL=no-reply@your-domain.com
RESEND__SENDER_NAME=Tunimoto
RESEND__ALLOW_DEVELOPMENT_FALLBACK=false

CLOUDFLARE__TURNSTILE__ENABLED=true
CLOUDFLARE__TURNSTILE__SECRET_KEY=<your turnstile secret key>
CLOUDFLARE__TURNSTILE__VERIFY_ENDPOINT=https://challenges.cloudflare.com/turnstile/v0/siteverify

ADMIN_BOOTSTRAP__ENABLED=false

AZURE_BLOB__CONNECTION_STRING=<azure blob connection string>
AZURE_BLOB__DOCUMENTS_CONTAINER=client-portal-docs
AZURE_BLOB__INVOICE_SETTINGS_CONTAINER=invoice-pdf-settings
```

Only if you enable OCR:

```env
DOCUMENT_OCR__ENABLED=true
DOCUMENT_OCR__BASE_URL=https://your-ocr-service
DOCUMENT_OCR__ANALYZE_PATH=/api/ocr/analyze
DOCUMENT_OCR__API_KEY=<optional OCR API key>
DOCUMENT_OCR__TIMEOUT_SECONDS=30
DOCUMENT_OCR__MIN_CONFIDENCE=0.65
```

## D. Exact Environment Variables For Vercel

Set these on the Vercel frontend project:

```env
VITE_API_BASE_URL=https://api.tunimoto.tn/api
VITE_CLOUDFLARE_TURNSTILE_SITE_KEY=<your public turnstile site key>
```

Only values safe for the browser should use the `VITE_` prefix.

## E. Exact Resend Configuration To Supply

Use these values for the Resend API:

```env
RESEND__BASE_URL=https://api.resend.com
RESEND__API_KEY=<Resend API key>
RESEND__SENDER_EMAIL=<verified sender address from your Resend domain>
RESEND__SENDER_NAME=Tunimoto
```

Production notes:

- `RESEND__API_KEY` should never be committed.
- `RESEND__SENDER_EMAIL` must belong to a verified sending domain in Resend.
- Keep `RESEND__ALLOW_DEVELOPMENT_FALLBACK=false` in production.

## F. Files That Must Stay Out Of GitHub

Never commit real values in:

- `.env`
- `.env.local`
- `backend/.env.local`
- `frontend/.env.local`
- any non-example `.env.*` file with real secrets
- any `appsettings.Local.json` or `appsettings.Production.json` containing real secrets
- `Storage/ClientPortal/*`
- `Storage/Avatars/*`
- `Storage/InvoicePdfSettings/*`
- exported DB backups, logs, test dumps, or production connection strings

Safe to commit:

- `backend/.env.example`
- `backend/.env.production.example`
- `frontend/.env.example`
- `frontend/.env.production.example`
- `backend/src/mototun.API/appsettings.json`
- `backend/src/mototun.API/appsettings.Development.json` only with placeholders/safe local defaults

Non-production local files:
- `backend/src/mototun.API/appsettings.Local.json`
- `backend/src/mototun.API/appsettings.Production.json`
- `backend/.env.local`
- `frontend/.env.local`

These files must not be treated as the production source of truth.

## G. Recommended Production Hostnames

- `www.tunimoto.tn` -> Vercel frontend
- `tunimoto.tn` -> apex redirect to `www`
- `api.tunimoto.tn` -> Render backend
- Cloudflare sits in front of the API only

## H. Deployment Order

1. Prepare production domains.
2. Provision the SQL Server database.
3. Set all Render backend env vars.
4. Run EF Core migrations:
   - `dotnet ef database update --project backend/src/mototun.Infrastructure --startup-project backend/src/mototun.API`
5. Deploy backend to Render as a Docker web service using `backend/Dockerfile`.
6. Verify `GET /health` returns `200` and database status `ok`.
7. Set Vercel frontend env vars.
8. Deploy frontend to Vercel from the `frontend` directory.
9. Verify SPA deep links work directly on Vercel:
   - `/login`
   - `/forgot-password`
   - `/reset-password`
   - `/client-portal` flows if applicable
10. Run the manual QA checklist below.

## Build / Start Commands

Render backend:

- Service type: `Web Service`
- Runtime: `Docker`
- Root directory: `backend`
- Dockerfile path: `Dockerfile`
- Docker command: leave empty and use the `CMD` from `backend/Dockerfile`

Vercel frontend:

```bash
npm ci
npm run build
```

Vercel output directory: `dist`

## H. Manual Test Checklist Before Launch

- Open the frontend on Vercel and confirm all client-side routes work on hard refresh.
- Login as revendeur, fournisseur, and admin.
- Confirm logout clears the session correctly.
- Trigger forgot-password and verify the reset email arrives from Resend.
- Open the reset link and confirm password reset works end-to-end.
- Confirm backend rejects invalid or expired reset tokens.
- Upload client portal documents and confirm:
  - size/type validation works
  - documents are not publicly listed from storage paths
  - authorized downloads still work
- Upload avatar and verify only avatar assets are publicly served.
- Update invoice settings with valid logo/signature files.
- Confirm invalid invoice logo/signature uploads are rejected.
- Create invoice, generate/download PDF, and verify content.
- Verify CORS works only from the production frontend origin.
- Confirm `/health` is healthy after deployment.
- Review backend logs for startup validation warnings or Resend/Turnstile failures.

## I. Remaining Technical Debt / Risky Areas

- `backend/src/mototun.API/Controllers/InvoicesController.cs` is still very large and mixes several responsibilities.
- `backend/src/mototun.API/Extensions/InvoicePdfBuilder.cs` is still a large hotspot.
- Some historical docs in the repo still mention Gmail SMTP and older env names. Use this handoff file as the current source of truth.
- The frontend has lint and build, but no separate type-check script today.
- The backend has tests, but no dedicated lint step beyond compiler/test coverage.
