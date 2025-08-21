import { test, expect } from '@playwright/test';

const TEST_CREDENTIALS = {
  email: 'marwie0904@gmail.com',
  password: 'ayokonga123'
};

test.describe('Dashboard Content Debug', () => {
  test('Check dashboard HTML structure', async ({ page }) => {
    // Login first
    await page.goto('/auth');
    await page.getByPlaceholder('Email').fill(TEST_CREDENTIALS.email);
    await page.getByPlaceholder('Password').fill(TEST_CREDENTIALS.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForTimeout(5000);

    // Should be on dashboard now
    console.log('Current URL:', page.url());

    // Get the full HTML content
    const htmlContent = await page.content();
    console.log('Page HTML length:', htmlContent.length);

    // Check if main dashboard elements exist in HTML
    const bodyText = await page.locator('body').textContent();
    console.log('Body text content:', bodyText?.substring(0, 500));

    // Check if dashboard page is rendering at all
    const dashboardPageExists = await page.locator('[data-testid="dashboard-page"], .dashboard-page, main').count();
    console.log('Dashboard page containers:', dashboardPageExists);

    // Check for any divs with content
    const contentDivs = await page.locator('div').count();
    console.log('Total div elements:', contentDivs);

    // Check specifically for the layout structure
    const layoutDivs = await page.locator('div.flex-1, div.space-y-4, div.p-4').count();
    console.log('Layout divs:', layoutDivs);

    // Check for text content
    const allText = await page.locator('*').allTextContents();
    const hasText = allText.some(text => text.trim().length > 0);
    console.log('Has any text content:', hasText);

    // Check if sidebar is rendering
    const sidebarExists = await page.locator('.sidebar, nav, [role="navigation"]').count();
    console.log('Sidebar elements:', sidebarExists);

    // Take a screenshot for debugging
    await page.screenshot({ path: '/tmp/dashboard-debug.png', fullPage: true });
    console.log('Screenshot saved to /tmp/dashboard-debug.png');
  });
});