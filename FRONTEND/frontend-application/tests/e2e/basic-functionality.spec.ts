import { test, expect } from '@playwright/test';

test.describe('Frontend Simplification Verification', () => {
  test('should load the home page and redirect to auth', async ({ page }) => {
    await page.goto('/');
    
    // Should redirect to auth page for non-authenticated users
    await expect(page).toHaveURL(/.*\/auth.*/);
    
    // Should have the auth page title
    await expect(page).toHaveTitle(/Financial Dashboard/);
  });

  test('should load auth page without errors', async ({ page }) => {
    await page.goto('/auth');
    
    // Page should load successfully
    await expect(page).toHaveTitle(/Financial Dashboard/);
    
    // Should have sign in form elements
    await expect(page.getByPlaceholder('Email')).toBeVisible();
    await expect(page.getByPlaceholder('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should have working navigation structure', async ({ page }) => {
    await page.goto('/auth');
    
    // Check that the page renders without console errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.waitForLoadState('networkidle');
    
    // Filter out expected deprecation warnings and focus on actual errors
    const actualErrors = consoleErrors.filter(error => 
      !error.includes('DEP0060') && 
      !error.includes('util._extend') &&
      !error.includes('Fast Refresh')
    );
    
    expect(actualErrors.length).toBe(0);
  });

  test('should have working API health check', async ({ page }) => {
    // Test that the backend API is accessible
    const response = await page.request.get('/api/health');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.status).toBe('OK');
  });

  test('should have basic styling working', async ({ page }) => {
    await page.goto('/auth');
    
    // Check that Tailwind CSS is working by verifying computed styles
    const body = page.locator('body');
    await expect(body).toHaveClass(/.*min-h-screen.*/);
    
    // Check that the auth form has proper styling
    const authContainer = page.locator('.min-h-screen');
    await expect(authContainer).toBeVisible();
  });
});