# Mobile, upload and French UX improvements

Date: 2026-04-10

## Audit summary

### 1. Upload failures around 3 MB

Root cause found:

- The backend already accepts large uploads:
  - global request size in `Program.cs` is `50_000_000`
  - dossier endpoints also use `RequestFormLimits` with the same 50 MB cap
- The frontend Axios client still kept the default API timeout for `FormData` requests in practice.
- On slower mobile networks, a document around 3 MB could hit that short timeout before the upload finished.

What was not the main issue:

- There was no primary 3 MB limit in the API code.
- Azure Blob storage logic was not the first failure point.

### 2. Mobile UI issues

Root causes found:

- Login, register, and reset-password screens were still visually close to desktop cards placed on a small screen.
- The landing page hero and mobile menu were too tall and visually dense for first use on mobile.
- Upload screens used some stiff wording and not enough reassuring guidance before sending files.

### 3. Confusing French wording

Root causes found:

- Several user-facing messages were still in English or too technical.
- Auth validation came back with backend-driven technical messages.
- Upload errors used wording like `charger`, `televerse`, or generic failures that do not help everyday users.

## Decisions made

1. Keep all API routes and payloads unchanged.
2. Fix the upload reliability problem centrally in the frontend timeout handling.
3. Keep the current upload flow, but make messages clearer and more forgiving.
4. Improve the most visible mobile screens first:
   - landing page
   - login
   - register
   - forgot password
   - client portal upload area
5. Simplify French wording where users actually see it most often:
   - auth
   - upload
   - reset password
   - portal status/help text

## Code changes

### Upload reliability

- `frontend/src/api/axios.js`
  - multipart uploads now always get the longer upload timeout
  - timeout message rewritten in simpler French

- `frontend/src/Pages/revendeur/InvoicesPage.jsx`
  - first-sale dossier uploads now reuse image optimization before sending
  - upload and validation toasts rewritten in simpler French

- `frontend/src/Pages/ClientPortalPage.jsx`
  - clearer file format and size guidance
  - more explicit upload progress wording
  - simpler success and failure states

- `frontend/src/Pages/revendeur/CarteGrisePage.jsx`
- `frontend/src/Pages/fournisseur/FournisseurCarteGrisePage.jsx`
  - upload buttons and error/success toasts simplified

### Mobile UX

- `frontend/src/Pages/LoginPage.jsx`
  - improved top spacing for mobile
  - cleaner card sizing
  - larger, easier touch targets
  - simpler trust/helper text

- `frontend/src/Pages/RegisterPage.jsx`
  - better mobile spacing
  - clearer step context with `Etape X sur 2`
  - larger input/tap areas

- `frontend/src/Pages/ForgotPasswordPage.jsx`
  - mobile-first layout alignment
  - clearer copy for reset-link request
  - consistent French wording

- `frontend/src/Pages/Landingpage.jsx`
  - lighter mobile navigation shell
  - more compact hero on mobile
  - full-width primary CTAs on small screens
  - denser but cleaner stats layout on mobile

### French simplification

- `frontend/src/context/I18nContext.jsx`
  - login/register subtitles and helper texts simplified

- `frontend/src/components/CloudflareTurnstile.jsx`
- `backend/src/mototun.API/Services/Security/CloudflareTurnstileValidationService.cs`
  - security challenge messages rewritten in simpler French

- `frontend/src/services/authService.js`
- `backend/src/mototun.API/Controllers/AuthController.cs`
- `backend/src/mototun.Infrastructure/Services/AuthService.cs`
- `backend/src/mototun.Core/DTOs/Auth/*.cs`
  - auth success, validation, and reset-password messages simplified

- `frontend/src/features/clientPortal/portalModel.js`
  - status/help messages rewritten in plainer French

- `backend/src/mototun.API/Extensions/GlobalExceptionHandler.cs`
- `backend/src/mototun.API/Controllers/ClientPortalController.cs`
- `backend/src/mototun.API/Controllers/InvoicesController.cs`
  - request-size, upload, and generic server/database messages made more human-readable

## Manual deployment and config notes

### Frontend

Set or confirm:

- `VITE_API_UPLOAD_TIMEOUT_MS=180000`

Recommended:

- keep `180000` ms minimum for production mobile traffic
- increase further only if your users often upload from weak 4G connections

### Backend / hosting

No new API contract change is required.

The API already allows 50 MB in app code, but you should still verify that no external layer is stricter:

- Azure App Service
- Azure Front Door / Application Gateway / reverse proxy if used
- WAF/body inspection layers if used

If any upstream layer has a lower request-body cap, align it to at least 50 MB.

## Rollout notes

1. Deploy frontend first if you want the upload timeout fix immediately.
2. Deploy backend as well to get the simpler auth/upload messages.
3. Test mobile pages in production after both are live.

## Testing checklist

### Upload

- [ ] Upload a 3 MB PDF from the client portal
- [ ] Upload a 3 MB photo from the client portal
- [ ] Upload a document from revendeur dossier screen
- [ ] Upload a document from fournisseur dossier screen
- [ ] Create a sale with an attached facture and confirm the upload succeeds
- [ ] Confirm timeout errors now show a clear retry message

### Mobile UX

- [ ] Landing page hero is readable without feeling cramped on small phones
- [ ] Mobile menu opens cleanly and CTAs remain easy to tap
- [ ] Login page stays usable with mobile keyboard open
- [ ] Register page remains readable on step 1 and step 2
- [ ] Forgot-password page is readable and easy to complete on mobile
- [ ] No horizontal overflow on these screens

### French clarity

- [ ] Login error messages feel simple and understandable
- [ ] Register validation messages are understandable
- [ ] Forgot-password messages are clear
- [ ] Upload messages use everyday French

## Remaining risks

- Very large PDFs can still feel slower than optimized images because PDF content is not recompressed in this pass.
- If a proxy or WAF in front of Azure has its own request-body limit, uploads can still fail even though the app code allows 50 MB.
- Some older admin/internal screens still contain technical wording outside the scope of this targeted pass.
