# GitHub Push Guide

This guide tells you exactly what to push to GitHub, what to keep out of Git, and how to verify your `.gitignore` before the first push.

## 1. What you should push

Push the source code and the deployment/config documentation only.

### Push these root files

- `.gitignore`
- `README.md`
- `PRODUCTION_HANDOFF.md`
- `FINAL_RELEASE_REPORT.md`

### Push this root folder

- `docs/`

### Push these backend files and folders

- `backend/.dockerignore`
- `backend/.env.example`
- `backend/.env.production.example`
- `backend/Dockerfile`
- `backend/mototun.sln`
- `backend/src/`
- `backend/tests/`
- `backend/docs/`

### Push these frontend files and folders

- `frontend/.env.example`
- `frontend/.env.production.example`
- `frontend/package.json`
- `frontend/package-lock.json`
- `frontend/vercel.json`
- `frontend/vite.config.js`
- `frontend/eslint.config.js`
- `frontend/postcss.config.js`
- `frontend/tailwind.config.js`
- `frontend/jsconfig.json`
- `frontend/index.html`
- `frontend/components.json`
- `frontend/public/`
- `frontend/src/`
- `frontend/tests/`

## 2. What you should NOT push

Do not push local secrets, build outputs, runtime storage, or local tooling junk.

### Never push these files

- `backend/.env.local`
- `frontend/.env.local`
- any real `.env` file with secrets
- any local SQL connection string with real credentials
- any Resend API key
- any Cloudflare secret key
- any Azure Blob connection string with real values

### Never push these folders

- `backend/artifacts/`
- any `bin/`
- any `obj/`
- `frontend/node_modules/`
- `frontend/dist/`
- `frontend/playwright-report/`
- `frontend/test-results/`
- any `Storage/ClientPortal/`
- any `Storage/Avatars/`
- any `Storage/InvoicePdfSettings/`
- any `.venv/`
- any `tmpclaude-*`

## 3. Important `.gitignore` note

I fixed one important problem for you:

- `backend/.env.production.example`
- `frontend/.env.production.example`

These example env files were being ignored before because of the `.env.*` rule.

They are now allowed to be committed safely.

## 4. How to verify `.gitignore` before push

Run these commands from the repo root.

### See what Git wants to track

```powershell
git status --short
```

### See ignored files too

```powershell
git status --short --ignored
```

### Check if one specific file is ignored

Examples:

```powershell
git check-ignore -v backend/.env.local
git check-ignore -v frontend/.env.local
git check-ignore -v backend/.env.production.example
git check-ignore -v frontend/.env.production.example
```

Expected result:

- `.env.local` should be ignored
- `.env.production.example` should NOT be ignored

## 5. Recommended first staging command

Do not use `git add .` for the first push.

Use this instead:

```powershell
git add .gitignore README.md PRODUCTION_HANDOFF.md FINAL_RELEASE_REPORT.md
git add docs
git add backend/.dockerignore backend/.env.example backend/.env.production.example backend/Dockerfile backend/mototun.sln
git add backend/src backend/tests backend/docs
git add frontend/.env.example frontend/.env.production.example frontend/package.json frontend/package-lock.json frontend/vercel.json frontend/vite.config.js frontend/eslint.config.js frontend/postcss.config.js frontend/tailwind.config.js frontend/jsconfig.json frontend/index.html frontend/components.json
git add frontend/public frontend/src frontend/tests
```

## 6. Then verify exactly what is staged

```powershell
git diff --cached --stat
git diff --cached
```

Check that you do NOT see:

- local secrets
- build outputs
- runtime storage files
- local archives
- OCR virtualenv files

## 7. Recommended first commit

```powershell
git commit -m "Prepare Tunimoto for production deployment"
```

## 8. Add the GitHub remote

If the repo is not connected yet:

```powershell
git remote add origin https://github.com/YOUR-USER/YOUR-REPO.git
git branch -M main
git push -u origin main
```

If the remote already exists:

```powershell
git remote -v
git push -u origin main
```

## 9. Final checklist before push

- `.env.local` files are ignored
- `.env.production.example` files are not ignored
- no `node_modules`
- no `dist`
- no `bin` / `obj`
- no `Storage/ClientPortal`
- no `Storage/Avatars`
- no `Storage/InvoicePdfSettings`
- no real secrets in staged diff
- README and deployment docs are included

## 10. My recommendation for your repo

For your current project, the safest thing to push is:

- all source code in `backend/src` and `frontend/src`
- tests
- deploy files
- example env files
- docs

And the safest thing to avoid pushing is:

- any local environment file
- any generated build folder
- any uploaded file
- any temporary local tool folder
