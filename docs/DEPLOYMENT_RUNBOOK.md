# Tunimoto Production Deployment Runbook

This document is the practical go-live guide for deploying Tunimoto on:

- frontend: Vercel
- backend: Render
- database: Azure SQL
- private documents: Azure Blob Storage
- DNS / proxy / WAF: Cloudflare
- transactional email: Resend

It is written for the current repository state as of 2026-04-02.

## 1. Readiness Verdict

You are close to deployment-ready.

Current status:

- frontend production build passes
- backend production build passes
- production env templates exist
- backend has production startup validation
- health endpoint exists at `/health`
- private dossier documents are Blob-ready
- invoice PDF settings are Blob-ready
- secure client portal token is implemented

You are not ready to blindly push everything with `git add .`.

There are still practical go-live checks to complete:

- fill all real production environment variables in Vercel and Render
- verify the Resend sending domain
- create and verify the Cloudflare / Vercel / Render DNS records
- run EF migrations against Azure SQL
- set Azure Blob connection string and create containers
- set the avatars Blob container and decide whether you still need any local avatar fallback

Important remaining caveats:

- avatars can now use Azure Blob too
- a Render persistent disk is only needed if you intentionally keep local avatar fallback or already have legacy local avatar files
- Turnstile hostname validation is not implemented yet
- this is acceptable for a first launch, but it is not the final hardening step

## 2. Before `git add .`

Do not run `git add .` blindly.

Your worktree already contains many unrelated changes and tracked deletions. Before any push:

1. Run:

```powershell
git status --short
```

2. Review for unwanted staged content such as:

- deleted local docs you did not intend to remove
- tracked storage files
- build outputs
- local archives like `backend.zip`
- OCR virtualenv content

3. Stage intentionally, for example:

```powershell
git add README.md PRODUCTION_HANDOFF.md docs/DEPLOYMENT_RUNBOOK.md
git add frontend/.env.production.example backend/.env.production.example
git add backend/src frontend/src
```

4. Re-check:

```powershell
git diff --cached --stat
git diff --cached
```

5. Only commit once the staged diff matches what you actually want to deploy.

## 3. Production Domain Shape

Use these production domains consistently:

- frontend canonical: `https://www.tunimoto.tn`
- apex redirect source: `https://tunimoto.tn`
- backend API: `https://api.tunimoto.tn`
- sender email example: `no-reply@send.tunimoto.tn`

Do not use raw platform domains in production:

- do not use `*.vercel.app` in frontend env
- do not use `*.onrender.com` in frontend env, emails, or public links

## 4. What Is Already Configured In Code

Frontend:

- Vite build works for production
- SPA rewrites are configured in `frontend/vercel.json`
- frontend fails production build if `VITE_API_BASE_URL` is missing
- frontend sends cookies with `withCredentials: true`

Backend:

- production validation rejects missing critical config outside development
- health endpoint exists at `/health`
- JWT auth cookie is `HttpOnly`
- secure cookie is enabled outside development
- `SameSite=Strict`
- CORS is explicit and credentialed
- Azure Blob is selected automatically when `AZURE_BLOB__CONNECTION_STRING` is set
- local file storage is used as fallback when Blob is not configured

Storage:

- private dossier documents can use Azure Blob
- invoice PDF settings can use Azure Blob
- avatars can use Azure Blob while keeping the same `/Storage/Avatars/...` URL pattern

## 5. Required Production Environment Variables

Source of truth:

- frontend: `frontend/.env.production.example`
- backend: `backend/.env.production.example`

Minimum frontend values for Vercel:

```env
VITE_API_BASE_URL=https://api.tunimoto.tn/api
VITE_CLOUDFLARE_TURNSTILE_SITE_KEY=
```

Minimum backend values for Render:

```env
ASPNETCORE_ENVIRONMENT=Production

DATABASE__DEFAULT_CONNECTION=

JWT_SETTINGS__SECRET_KEY=
JWT_SETTINGS__ISSUER=MototunAPI
JWT_SETTINGS__AUDIENCE=MototunClient
JWT_SETTINGS__EXPIRATION_IN_DAYS=7

AUTH_SETTINGS__PASSWORD_RESET_URL=https://www.tunimoto.tn/reset-password
AUTH_SETTINGS__PASSWORD_RESET_TOKEN_EXPIRY_MINUTES=30

CORS__ALLOWED_ORIGINS__0=https://www.tunimoto.tn
CORS__ALLOWED_ORIGINS__1=https://tunimoto.tn

AZURE_BLOB__CONNECTION_STRING=
AZURE_BLOB__DOCUMENTS_CONTAINER=client-portal-docs
AZURE_BLOB__AVATARS_CONTAINER=avatars
AZURE_BLOB__INVOICE_SETTINGS_CONTAINER=invoice-pdf-settings

RESEND__BASE_URL=https://api.resend.com
RESEND__API_KEY=
RESEND__SENDER_EMAIL=no-reply@send.tunimoto.tn
RESEND__SENDER_NAME=Tunimoto
RESEND__ALLOW_DEVELOPMENT_FALLBACK=false

CLOUDFLARE__TURNSTILE__ENABLED=true
CLOUDFLARE__TURNSTILE__SECRET_KEY=
CLOUDFLARE__TURNSTILE__VERIFY_ENDPOINT=https://challenges.cloudflare.com/turnstile/v0/siteverify

ADMIN_BOOTSTRAP__ENABLED=false
```

Optional features:

- OCR: only if the OCR service is actually running
- reminders: enable only when you are ready for them in production

## 6. Service Setup Checklist

### 6.1 Azure SQL

You already created Azure SQL, so before deployment:

1. Confirm the final connection string.
2. Confirm Azure SQL firewall rules allow Render outbound access.
3. Keep `Encrypt=True`.
4. Keep `TrustServerCertificate=False`.
5. Run migrations only after the backend env vars are set.

Migration command:

```powershell
dotnet ef database update --project backend/src/mototun.Infrastructure --startup-project backend/src/mototun.API
```

### 6.2 Azure Blob Storage

Create these containers:

- `client-portal-docs`
- `avatars`
- `invoice-pdf-settings`

Then put the Blob connection string in Render:

- `AZURE_BLOB__CONNECTION_STRING`

Keep private dossier documents private:

- do not expose container URLs publicly
- downloads should continue through the API only

### 6.3 Resend

Recommended sending subdomain:

- `send.tunimoto.tn`

Recommended sender:

- `no-reply@send.tunimoto.tn`

What to do:

1. Add the domain in Resend.
2. Copy the exact DNS records Resend gives you.
3. Add those records in Cloudflare DNS.
4. Wait until the domain status becomes `verified`.
5. Create a Resend API key.
6. Put these in Render:

- `RESEND__API_KEY`
- `RESEND__SENDER_EMAIL`
- `RESEND__SENDER_NAME`

### 6.4 Cloudflare Turnstile

If you want Turnstile enabled at launch:

1. Create a Turnstile site.
2. Add the frontend hostnames.
3. Put the site key in Vercel:

- `VITE_CLOUDFLARE_TURNSTILE_SITE_KEY`

4. Put the secret key in Render:

- `CLOUDFLARE__TURNSTILE__SECRET_KEY`

If you want the simplest first launch, you can disable Turnstile by setting:

```env
CLOUDFLARE__TURNSTILE__ENABLED=false
```

That reduces bot protection, but it avoids launch friction if Turnstile is not ready.

### 6.5 Vercel

Project settings:

- framework preset: `Vite`
- root directory: `frontend`
- build command: `npm run build`
- output directory: `dist`

Add these domains to the project:

- `www.tunimoto.tn`
- `tunimoto.tn`

Recommended:

- make `www.tunimoto.tn` the canonical production domain
- redirect `tunimoto.tn` to `www.tunimoto.tn`

Set frontend env vars in Vercel:

- `VITE_API_BASE_URL=https://api.tunimoto.tn/api`
- `VITE_CLOUDFLARE_TURNSTILE_SITE_KEY=...`

### 6.6 Render

Service settings:

- service type: `Web Service`
- runtime: `Docker`
- root directory: `backend`
- Dockerfile path: `Dockerfile`
- health check path: `/health`

Do not override the Docker start command unless necessary.

Add the custom domain:

- `api.tunimoto.tn`

Important:

- if `AZURE_BLOB__AVATARS_CONTAINER` is configured and Blob is active, new avatars are stored in Azure Blob
- mount a persistent disk at `/app/Storage` only if you want local fallback or you still have legacy local avatar files to keep serving

## 7. DNS Plan

Best practical setup:

- keep OVH as registrar
- move nameservers to Cloudflare if you want Cloudflare to manage DNS and proxy the API

Recommended records:

- `www.tunimoto.tn` -> Vercel
- `tunimoto.tn` -> Vercel and redirect to `www`
- `api.tunimoto.tn` -> Render
- `send.tunimoto.tn` -> Resend verification records

Safe sequence:

1. Add domains in Vercel and Render first.
2. Let each platform show you the exact DNS records it expects.
3. Create those DNS records in Cloudflare.
4. For `api.tunimoto.tn`, start as DNS-only until Render verifies the custom domain and TLS is active.
5. After Render custom domain is healthy, switch `api.tunimoto.tn` to proxied if you want Cloudflare in front of the API.

Cloudflare SSL recommendation:

- use `Full (strict)` when the origin certificate is valid

If you proxy the API too early or use the wrong SSL mode, you can create TLS errors or redirect loops.

## 8. Recommended Deployment Order

This is the safest order with minimum surprises:

1. Clean your git diff and commit only intended files.
2. Create the Vercel project from `frontend`.
3. Create the Render web service from `backend`.
4. Add custom domains in Vercel and Render.
5. Create Azure Blob containers.
6. Add Resend domain and verify it.
7. Fill all Render env vars.
8. Fill Vercel env vars.
9. Configure Cloudflare DNS records.
10. Run EF migrations against Azure SQL.
11. Deploy backend first.
12. Open `https://api.tunimoto.tn/health`.
13. Confirm health returns success.
14. Deploy frontend.
15. Open `https://www.tunimoto.tn`.
16. Test login, password reset, portal access, uploads, and dossier flows.
17. Only after that, announce go-live.

## 9. Exact Commands You Will Use

### Local validation before push

```powershell
dotnet build backend/src/mototun.API/mototun.API.csproj -c Release
cd frontend
npm run build
```

### Azure SQL migrations

From repo root:

```powershell
dotnet ef database update --project backend/src/mototun.Infrastructure --startup-project backend/src/mototun.API
```

### Optional targeted production validation check

```powershell
dotnet test backend/tests/mototun.API.IntegrationTests/mototun.API.IntegrationTests.csproj -c Release --filter ProductionConfigurationValidatorTests
```

## 10. Smoke Test Checklist After Deploy

Backend:

- `GET /health` returns `200`
- payload shows `status: ok`
- payload shows `database: ok`

Auth:

- login works from `https://www.tunimoto.tn`
- logout clears the session
- forgot-password email arrives from Resend
- reset-password link points to `https://www.tunimoto.tn/reset-password`

Business flow:

- revendeur can create a dossier
- client portal access works with the new secure token
- client can upload missing docs
- fournisseur can access and download authorized documents
- dossier emails still work

Storage:

- new dossier documents land in Blob
- invoice PDF settings persist correctly
- avatar upload still works and is served from the same `/Storage/Avatars/...` URL path

Browser / domain:

- no CORS errors in browser devtools
- no mixed-content errors
- no API calls going to `onrender.com`
- no public links using `vercel.app`

## 11. Known Risks You Should Accept Explicitly

These are not blockers, but you should know them:

1. If you still rely on local avatar files, you need a Render persistent disk.
   New production avatars can now live in Azure Blob instead.

2. Turnstile hostname validation is not yet implemented.
   You still have Turnstile verification, but not the stricter hostname check.

3. The backend worktree is currently noisy.
   Do not push everything blindly.

4. Existing docs in the repo may still mention older setup notes.
   Use this file and `PRODUCTION_HANDOFF.md` as the current deployment truth.

## 12. My Recommendation

Yes, you can prepare for deployment now.

For a safe first production rollout, do this:

- deploy backend first on Render
- keep the API on `api.tunimoto.tn`
- deploy frontend on Vercel
- use Cloudflare for DNS and API proxying only
- verify Resend before testing password reset
- use Azure Blob for avatars too, and keep a Render persistent disk only if you still need local fallback

What I would not do yet:

- do not proxy everything through Cloudflare before custom domains are verified
- do not use raw `onrender.com` or `vercel.app` URLs publicly
- do not `git add .` from the current worktree

## 13. Official Provider Docs

- Vercel Vite: https://vercel.com/docs/frameworks/vite
- Vercel domains: https://vercel.com/docs/domains/working-with-domains
- Render custom domains: https://render.com/docs/custom-domains
- Render health checks: https://render.com/docs/health-checks
- Render + Cloudflare DNS: https://render.com/docs/configure-cloudflare-dns
- Cloudflare proxy status: https://developers.cloudflare.com/dns/proxy-status/
- Cloudflare SSL modes: https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/
- Cloudflare Full (strict): https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/
- Resend domains: https://resend.com/docs/dashboard/domains/introduction
