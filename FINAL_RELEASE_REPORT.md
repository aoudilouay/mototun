# Final Release Report

Date: 2026-03-31

## Summary

This cleanup pass prepared the repository for the first production deployment by removing stale documentation, untracking generated artifacts, preserving critical tests, and replacing scattered setup notes with a current top-level README and deployment handoff documents.

Legacy Gmail-oriented guidance was removed in favor of the current Resend, Render, Vercel, and SQL Server deployment model.

## What Was Cleaned

- Removed stale root-level setup, QA, and readiness report files that conflicted with the current production architecture
- Removed old Gmail and Google-auth related docs from `docs/`
- Removed the tracked `backend.zip` source archive
- Removed the tracked default Vite `frontend/README.md`
- Removed the stale backend WhatsApp/SMS/email implementation guide and PDF export
- Removed tracked generated `.NET` build artifacts from source and test projects
- Removed the tracked Python virtual environment from `backend/tools/ocr-service/.venv`
- Updated `.gitignore` to cover Python virtualenvs, Python caches, and zip archives

## What Was Removed

- Root docs:
  - `00_START_HERE_QA_REPORTS.txt`
  - `CLEANUP_REPORT.md`
  - `COMPREHENSIVE_QA_REPORT.md`
  - `DEPLOYMENT_CHECKLIST.md`
  - `ENVIRONMENT_SETUP_COMPLETE.md`
  - `ENV_QUICK_REFERENCE.txt`
  - `ENV_SETUP_GUIDE.md`
  - `FILES_CREATED.txt`
  - `FINAL_QA_TEST_REPORT.md`
  - `LOCAL_SETUP_INSTRUCTIONS.md`
  - `PRE_PRODUCTION_PHASE_REPORT_2026-03-30.md`
  - `PRODUCTION_READINESS_REPORT.md`
  - `README_ENV_SETUP.md`
  - `SETUP_COMPLETE_SUMMARY.md`
- Legacy docs in `docs/`
- `backend.zip`
- `frontend/README.md`
- Tracked `bin/`, `obj/`, `TestResults`, and OCR `.venv` content

## What Was Kept Intentionally

- All real backend and frontend source code
- All meaningful backend tests, including auth, forgot/reset password, uploads, invoices, health, and production validation
- Current deployment/config files:
  - `backend/.env.example`
  - `frontend/.env.example`
  - `backend/Dockerfile`
  - `backend/.dockerignore`
  - `frontend/vercel.json`
  - `PRODUCTION_HANDOFF.md`
- Useful operational docs:
  - `backend/docs/DataReadinessChecklist.md`
  - `backend/tools/ocr-service/README.md`
  - `backend/tools/ocr-service/requirements.txt`
- Migration history under `backend/src/mototun.Infrastructure/Migrations`

## Manual Tasks Before Deploy

- Review any migration edits and the current `ApplicationDbContextModelSnapshot.cs`
- Confirm no secret-bearing local files are staged:
  - `backend/.env.local`
  - `frontend/.env.local`
  - `backend/src/mototun.API/appsettings.Local.json`
  - `backend/src/mototun.API/appsettings.Production.json`
- Confirm no uploaded storage files are staged
- Confirm no local logs or temp files are staged
- Rotate any previously exposed Resend SMTP/API key
- Set final Render and Vercel environment variables
- Confirm Azure SQL connection is final and migrations are applied

## Required Environment Variables

### Render backend

```env
ASPNETCORE_ENVIRONMENT=Production
ConnectionStrings__DefaultConnection=
JwtSettings__SecretKey=
JwtSettings__Issuer=MototunAPI
JwtSettings__Audience=MototunClient
JwtSettings__ExpirationInDays=7
AuthSettings__PasswordResetUrl=
AuthSettings__PasswordResetTokenExpiryMinutes=30
Cors__AllowedOrigins__0=
Cors__AllowedOrigins__1=
Resend__BaseUrl=https://api.resend.com
Resend__ApiKey=
Resend__SenderEmail=
Resend__SenderName=Mototun
Resend__AllowDevelopmentFallback=false
Cloudflare__Turnstile__Enabled=true
Cloudflare__Turnstile__SecretKey=
Cloudflare__Turnstile__VerifyEndpoint=https://challenges.cloudflare.com/turnstile/v0/siteverify
AdminBootstrap__Enabled=false
```

### Vercel frontend

```env
VITE_API_BASE_URL=
VITE_BACKEND_ORIGIN=
VITE_CLOUDFLARE_TURNSTILE_SITE_KEY=
```

## Deployment Order

1. Confirm Azure SQL database is reachable and migrated
2. Set Render environment variables
3. Deploy backend to Render using `backend/Dockerfile`
4. Verify `/health`
5. Set Vercel environment variables
6. Deploy frontend from `frontend`
7. Run manual QA on production

## Critical QA Checklist

- Login works for relevant roles
- Logout clears session state
- Forgot password returns success and sends Resend email
- Reset password works from the email link
- Invalid or expired reset token is rejected
- Protected routes stay protected
- Client portal document uploads work
- Unauthorized document access is blocked
- Invoice creation and invoice PDF generation work
- Avatar upload still works
- `/health` returns healthy in production
- CORS only allows the real frontend origin

## Known Risks / Technical Debt

- `backend/src/mototun.API/Controllers/InvoicesController.cs` remains large
- `backend/src/mototun.API/Extensions/InvoicePdfBuilder.cs` remains a hotspot
- Some migration files are currently modified and should be reviewed carefully before commit
- A local running backend process may leave ignored debug output on disk until the process is stopped; this should not be committed

## Validation Commands

```powershell
dotnet test backend/mototun.sln -c Release
cd frontend
npm run lint
npm run build
```

## Recommended Commit Message

`chore: finalize repo cleanup and release prep for first production deploy`
