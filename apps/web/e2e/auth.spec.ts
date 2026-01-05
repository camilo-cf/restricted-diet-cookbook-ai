import { test, expect } from '@playwright/test';
import { v4 as uuidv4 } from 'uuid';

test.describe('Authentication Flow', () => {
  const email = `e2e_${uuidv4().slice(0, 8)}@example.com`;
  const password = 'Password123!';

  test('User can register and see profile', async ({ page }) => {
    // 1. Go to register
    await page.goto('/auth/register');
    await page.fill('input[name="username"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');

    // 2. Should redirect to login or dashboard
    await expect(page).toHaveURL(/\/(auth\/login|wizard)/, { timeout: 10000 });

    // 3. Login
    if (page.url().includes('login')) {
      await page.fill('input[name="username"]', email);
      await page.fill('input[name="password"]', password);
      await page.click('button[type="submit"]');
    }

    // 4. Verify Profile
    await page.goto('/profile');
    await expect(page.getByText(email)).toBeVisible();
  });

  test('Guest is redirected from protected route', async ({ page }) => {
    await page.goto('/profile');
    // Assuming middleware redirects to login
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
