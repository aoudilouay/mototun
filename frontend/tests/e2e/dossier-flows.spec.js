import { expect, test } from '@playwright/test';

const env = globalThis.process?.env ?? {};
const revendeurEmail = env.E2E_REVENDEUR_EMAIL || '';
const revendeurPassword = env.E2E_REVENDEUR_PASSWORD || '';
const fournisseurEmail = env.E2E_FOURNISSEUR_EMAIL || '';
const fournisseurPassword = env.E2E_FOURNISSEUR_PASSWORD || '';

async function login(page, email, password) {
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('form button[type="submit"]').click();
}

test('revendeur flow can open carte grise page', async ({ page }) => {
  test.skip(!revendeurEmail || !revendeurPassword, 'Set E2E_REVENDEUR_EMAIL and E2E_REVENDEUR_PASSWORD.');

  await login(page, revendeurEmail, revendeurPassword);
  await page.waitForURL(/\/revendeur\/dashboard/i);

  await page.goto('/revendeur/carte-grise');
  await expect(page.getByRole('heading', { name: /Carte Grise/i })).toBeVisible();
  await expect(page.getByText(/dossier/i).first()).toBeVisible();
});

test('fournisseur flow can open dossier modal when rows exist', async ({ page }) => {
  test.skip(!fournisseurEmail || !fournisseurPassword, 'Set E2E_FOURNISSEUR_EMAIL and E2E_FOURNISSEUR_PASSWORD.');

  await login(page, fournisseurEmail, fournisseurPassword);
  await page.waitForURL(/\/fournisseur\/dashboard/i);

  await page.goto('/fournisseur/carte-grise');
  await expect(page.getByRole('heading', { name: /Carte Grise Fournisseur/i })).toBeVisible();

  const openButtons = page.getByRole('button', { name: /Ouvrir/i });
  if (await openButtons.count()) {
    await openButtons.first().click();
    await expect(page.getByText(/Timeline dossier/i)).toBeVisible();
    await expect(page.getByText(/Checklist GED/i)).toBeVisible();
  }
});
