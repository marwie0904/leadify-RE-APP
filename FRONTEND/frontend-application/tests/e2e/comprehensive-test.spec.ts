import { test, expect } from '@playwright/test';

const TEST_CREDENTIALS = {
  email: 'marwie0904@gmail.com',
  password: 'ayokonga123'
};

test.describe('Comprehensive Application Test', () => {
  test.beforeEach(async ({ page }) => {
    // Collect console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`Console error: ${msg.text()}`);
      }
    });
    
    // Collect network errors
    page.on('response', response => {
      if (response.status() >= 400) {
        console.log(`Network error: ${response.status()} ${response.url()}`);
      }
    });
  });

  test('1. Auth Page - Load and UI Test', async ({ page }) => {
    await page.goto('/auth');
    
    // Check if page loads without errors
    await expect(page).toHaveTitle(/Financial Dashboard/);
    
    // Check auth form elements exist
    await expect(page.getByPlaceholder('Email')).toBeVisible();
    await expect(page.getByPlaceholder('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    
    console.log('✅ Auth page loads correctly');
  });

  test('2. Auth Page - Login Flow Test', async ({ page }) => {
    await page.goto('/auth');
    
    // Fill in credentials
    await page.getByPlaceholder('Email').fill(TEST_CREDENTIALS.email);
    await page.getByPlaceholder('Password').fill(TEST_CREDENTIALS.password);
    
    // Click sign in
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Wait for redirect to dashboard (or check if login was successful)
    await page.waitForTimeout(3000);
    
    // Check if we're redirected or if there are any error messages
    const currentUrl = page.url();
    console.log(`After login, current URL: ${currentUrl}`);
    
    // Look for any error messages
    const errorMessages = await page.locator('[role="alert"], .error, .text-red-500, .text-destructive').count();
    if (errorMessages > 0) {
      const errorText = await page.locator('[role="alert"], .error, .text-red-500, .text-destructive').first().textContent();
      console.log(`❌ Login error: ${errorText}`);
    } else {
      console.log('✅ Login appears successful');
    }
  });

  test('3. Dashboard Page - Direct Access Test', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check if page loads
    await page.waitForTimeout(2000);
    
    const currentUrl = page.url();
    console.log(`Dashboard access URL: ${currentUrl}`);
    
    // Check if redirected to auth (expected if not logged in)
    if (currentUrl.includes('/auth')) {
      console.log('✅ Correctly redirected to auth when not logged in');
    } else {
      // Check if dashboard content is visible
      const dashboardElements = await page.locator('h1, h2, .dashboard, [data-testid*="dashboard"]').count();
      console.log(`Dashboard elements found: ${dashboardElements}`);
    }
  });

  test('4. Full Login to Dashboard Flow', async ({ page }) => {
    // Start at auth page
    await page.goto('/auth');
    
    // Login
    await page.getByPlaceholder('Email').fill(TEST_CREDENTIALS.email);
    await page.getByPlaceholder('Password').fill(TEST_CREDENTIALS.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Wait for navigation
    await page.waitForTimeout(5000);
    
    const finalUrl = page.url();
    console.log(`Final URL after login: ${finalUrl}`);
    
    // Check if we're on dashboard
    if (finalUrl.includes('/dashboard')) {
      console.log('✅ Successfully navigated to dashboard');
      
      // Check for dashboard content
      const pageTitle = await page.title();
      console.log(`Dashboard page title: ${pageTitle}`);
      
      // Look for common dashboard elements
      const statsCards = await page.locator('[class*="stat"], [class*="card"], [class*="metric"]').count();
      const navigation = await page.locator('nav, [role="navigation"], .sidebar').count();
      
      console.log(`Stats cards found: ${statsCards}`);
      console.log(`Navigation elements found: ${navigation}`);
      
    } else {
      console.log('❌ Did not reach dashboard after login');
    }
  });

  test('5. Navigation Test', async ({ page }) => {
    // Try to access dashboard directly
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    
    // If we get redirected to auth, login first
    if (page.url().includes('/auth')) {
      await page.getByPlaceholder('Email').fill(TEST_CREDENTIALS.email);
      await page.getByPlaceholder('Password').fill(TEST_CREDENTIALS.password);
      await page.getByRole('button', { name: /sign in/i }).click();
      await page.waitForTimeout(3000);
    }
    
    // Test navigation links
    const navLinks = [
      { name: 'Dashboard', href: '/dashboard' },
      { name: 'Agents', href: '/agents' },
      { name: 'Conversations', href: '/conversations' },
      { name: 'Leads', href: '/leads' },
      { name: 'Analytics', href: '/analytics' },
      { name: 'Organization', href: '/organization' }
    ];
    
    for (const link of navLinks) {
      try {
        const linkElement = page.getByRole('link', { name: link.name });
        if (await linkElement.count() > 0) {
          await linkElement.click();
          await page.waitForTimeout(1000);
          console.log(`✅ ${link.name} navigation works`);
        } else {
          console.log(`⚠️  ${link.name} link not found`);
        }
      } catch (error) {
        console.log(`❌ ${link.name} navigation failed: ${error}`);
      }
    }
  });

  test('6. API Connectivity Test', async ({ page }) => {
    // Test backend health
    const healthResponse = await page.request.get('/api/health');
    console.log(`Backend health status: ${healthResponse.status()}`);
    
    if (healthResponse.ok()) {
      const healthData = await healthResponse.json();
      console.log(`Backend health data:`, healthData);
    }
    
    // Test other API endpoints (without auth for now)
    const apiTests = [
      { endpoint: '/api/agents', description: 'Agents API' },
      { endpoint: '/api/conversations', description: 'Conversations API' },
      { endpoint: '/api/leads', description: 'Leads API' }
    ];
    
    for (const test of apiTests) {
      try {
        const response = await page.request.get(test.endpoint);
        console.log(`${test.description}: ${response.status()}`);
      } catch (error) {
        console.log(`${test.description} failed: ${error}`);
      }
    }
  });
});