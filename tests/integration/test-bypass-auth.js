#!/usr/bin/env node

const { chromium } = require('playwright');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000';

async function testBypassAuth() {
  console.log('🔐 BYPASS AUTH TEST');
  console.log('=' .repeat(60));
  console.log('This test will bypass the auth loading state');
  console.log('=' .repeat(60));
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 300
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  try {
    // Method 1: Set localStorage before navigation to skip auth check
    console.log('\n📝 Method 1: Pre-setting localStorage...');
    
    // Navigate to any page first to set domain
    await page.goto(BASE_URL);
    
    // Clear existing auth and set loading to false
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      // Don't set any auth token - this should make authLoading = false and user = null
    });
    
    // Now navigate to auth page
    console.log('📍 Navigating to auth page with cleared storage...');
    await page.goto(`${BASE_URL}/auth`);
    
    // Wait a moment for React to render
    await page.waitForTimeout(2000);
    
    // Force React to update by triggering a state change
    await page.evaluate(() => {
      // Dispatch a custom event to trigger re-render
      window.dispatchEvent(new Event('storage'));
    });
    
    await page.waitForTimeout(2000);
    
    // Take screenshot
    await page.screenshot({ path: 'bypass-auth-01.png', fullPage: true });
    
    // Check if form is visible now
    const emailInput = await page.locator('input[type="email"]').first();
    const emailVisible = await emailInput.isVisible().catch(() => false);
    console.log(`  Email input visible: ${emailVisible}`);
    
    if (!emailVisible) {
      console.log('\n📝 Method 2: Direct component manipulation...');
      
      // Try to directly manipulate React component state
      const formVisible = await page.evaluate(() => {
        // Try to find React fiber and update state
        const authElements = document.querySelectorAll('[class*="auth"], [id*="auth"]');
        
        // Look for any loading indicators and hide them
        const loadingElements = document.querySelectorAll('[class*="loading"], [class*="spinner"]');
        loadingElements.forEach(el => {
          el.style.display = 'none';
        });
        
        // Check if there's a form but it's hidden
        const forms = document.querySelectorAll('form');
        return forms.length;
      });
      
      console.log(`  Found ${formVisible} forms in DOM`);
      
      // Method 3: Navigate with a clean context
      console.log('\n📝 Method 3: Clean context navigation...');
      
      // Create new page with no localStorage
      const cleanPage = await context.newPage();
      
      // Add init script to prevent auth check
      await cleanPage.addInitScript(() => {
        // Override localStorage to always return null for auth
        const originalGetItem = localStorage.getItem;
        localStorage.getItem = function(key) {
          if (key === 'auth_token' || key === 'auth_user') {
            return null;
          }
          return originalGetItem.call(this, key);
        };
      });
      
      console.log('  Navigating with clean context...');
      await cleanPage.goto(`${BASE_URL}/auth`);
      
      // Wait for potential loading states to complete
      await cleanPage.waitForFunction(() => {
        const bodyText = document.body?.innerText || '';
        return !bodyText.includes('Checking authentication') && 
               !bodyText.includes('Loading') &&
               document.readyState === 'complete';
      }, { timeout: 10000 }).catch(() => {});
      
      await cleanPage.waitForTimeout(3000);
      
      // Take screenshot
      await cleanPage.screenshot({ path: 'bypass-auth-02-clean.png', fullPage: true });
      
      // Check for form
      const cleanEmailInput = await cleanPage.locator('input[type="email"]').first();
      const cleanEmailVisible = await cleanEmailInput.isVisible().catch(() => false);
      console.log(`  Clean page - Email input visible: ${cleanEmailVisible}`);
      
      if (cleanEmailVisible) {
        console.log('  ✅ SUCCESS! Form is visible on clean page');
        
        // Try to login
        const passwordInput = await cleanPage.locator('input[type="password"]').first();
        
        if (await passwordInput.isVisible()) {
          console.log('\n🔐 Attempting login...');
          
          await cleanEmailInput.fill('admin@primeresidential.com');
          await passwordInput.fill('TestPassword123!');
          console.log('  ✅ Filled credentials');
          
          // Click sign in
          const signInButton = await cleanPage.locator('button:has-text("Sign In"), button:has-text("Sign in")').first();
          if (await signInButton.isVisible()) {
            await signInButton.click();
            console.log('  ✅ Clicked sign in');
            
            await cleanPage.waitForTimeout(5000);
            
            const newUrl = cleanPage.url();
            console.log(`  After login URL: ${newUrl}`);
            
            if (!newUrl.includes('/auth')) {
              console.log('  ✅ Login successful!');
              await cleanPage.screenshot({ path: 'bypass-auth-03-success.png' });
            }
          }
        }
      } else {
        // Method 4: Check page HTML directly
        console.log('\n📝 Method 4: Analyzing page HTML...');
        
        const pageHTML = await cleanPage.content();
        const hasEmailInput = pageHTML.includes('type="email"');
        const hasPasswordInput = pageHTML.includes('type="password"');
        const hasSignInText = pageHTML.includes('Sign In') || pageHTML.includes('Sign in');
        
        console.log(`  HTML contains email input: ${hasEmailInput}`);
        console.log(`  HTML contains password input: ${hasPasswordInput}`);
        console.log(`  HTML contains Sign In text: ${hasSignInText}`);
        
        // Check what's actually visible
        const visibleText = await cleanPage.locator('body').innerText();
        console.log('\n  Visible text on page:');
        console.log('  ' + visibleText.substring(0, 200).replace(/\n/g, ' '));
      }
      
      await cleanPage.close();
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await context.close();
    await browser.close();
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('Check screenshots: bypass-auth-*.png');
  console.log('=' .repeat(60));
}

// Execute
if (require.main === module) {
  testBypassAuth()
    .then(() => {
      console.log('\n✅ Test finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed:', error);
      process.exit(1);
    });
}