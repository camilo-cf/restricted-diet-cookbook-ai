import { test, expect } from '@playwright/test';

test('Wizard Flow: Ingredients -> Review -> Result', async ({ page }) => {
  // 1. Start at wizard
  await page.goto('/wizard');
  await expect(page).toHaveURL(/\/wizard\/ingredients/, { timeout: 30000 });

  // 2. Fill Ingredients
  await page.fill('textarea[name="ingredients"]', '2 eggs, milk, flour, spinach');
  await page.fill('input[name="restrictions"]', 'Vegetarian');
  await page.click('button[type="submit"]');

  // 3. Upload Page
  await expect(page).toHaveURL(/\/wizard\/upload/);
  await expect(page.getByText('Have a photo?')).toBeVisible();
  
  // Skip upload
  await page.click('button:has-text("Skip & Review")');

  // 4. Review Page
  await expect(page).toHaveURL(/\/wizard\/review/);
  await expect(page.getByText('2 eggs, milk, flour, spinach')).toBeVisible();
  await expect(page.getByText('Vegetarian')).toBeVisible();

  // 5. Generate
  await page.click('button:has-text("Generate Recipe")');
  
  // 6. Result Page (Wait for simulation)
  await expect(page).toHaveURL(/\/wizard\/result/, { timeout: 10000 });
  await expect(page.getByText('Mock AI Recipe')).toBeVisible();
  await expect(page.getByText('Serve hot.')).toBeVisible();
});
