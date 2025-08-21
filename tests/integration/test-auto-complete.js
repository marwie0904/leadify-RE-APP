#!/usr/bin/env node

const { chromium } = require('playwright');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
require('dotenv').config();

// Configuration
const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:3001';
const FRONTEND_DIR = 'FRONTEND/financial-dashboard-2';

// Test account - using the one from .env that should work
const TEST_ACCOUNT = {
  email: process.env.TEST_EMAIL || 'marwie.ang.0904@gmail.com',
  password: process.env.TEST_PASSWORD || 'ayokonga123'
};

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Check if a server is running
async function checkServer(url, name) {
  try {
    const response = await fetch(url);
    if (response.ok) {
      log(`✅ ${name} is running`, 'green');
      return true;
    }
  } catch (error) {
    log(`❌ ${name} is not running`, 'red');
    return false;
  }
  return false;
}

// Start frontend server
async function startFrontend() {
  log('\n🚀 Starting frontend server...', 'cyan');
  
  return new Promise((resolve, reject) => {
    const frontendProcess = spawn('npm', ['run', 'dev'], {
      cwd: FRONTEND_DIR,
      stdio: 'pipe',
      shell: true
    });

    let started = false;
    const timeout = setTimeout(() => {
      if (!started) {
        frontendProcess.kill();
        reject(new Error('Frontend failed to start in 30 seconds'));
      }
    }, 30000);

    frontendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Ready') || output.includes('started server') || output.includes('Local:')) {
        if (!started) {
          started = true;
          clearTimeout(timeout);
          log('✅ Frontend started successfully', 'green');
          setTimeout(() => resolve(frontendProcess), 3000); // Give it 3 more seconds to stabilize
        }
      }
    });

    frontendProcess.stderr.on('data', (data) => {
      if (data.toString().includes('EADDRINUSE')) {
        clearTimeout(timeout);
        log('ℹ️  Port 3000 already in use, assuming frontend is running', 'yellow');
        resolve(null);
      }
    });

    frontendProcess.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

// Kill existing frontend processes
async function killExistingFrontend() {
  log('\n🧹 Cleaning up existing frontend processes...', 'yellow');
  try {
    // Kill Next.js processes
    await execAsync("pkill -f 'next dev' 2>/dev/null || true");
    await execAsync("pkill -f 'next-server' 2>/dev/null || true");
    await execAsync("lsof -ti:3000 | xargs kill -9 2>/dev/null || true");
    await new Promise(resolve => setTimeout(resolve, 2000));
    log('✅ Cleaned up existing processes', 'green');
  } catch (error) {
    // Ignore errors - processes might not exist
  }
}

// Comprehensive auth page test
async function testAuthPage(page) {
  log('\n🔍 Testing Auth Page Structure...', 'cyan');
  
  // Navigate to auth page
  await page.goto(`${BASE_URL}/auth`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000); // Extra wait for client-side rendering
  
  const url = page.url();
  log(`  Current URL: ${url}`, 'blue');
  
  // Check if already logged in (redirected)
  if (!url.includes('/auth')) {
    log('  ✅ Already authenticated, redirected away from auth', 'green');
    return { success: true, reason: 'already-authenticated' };
  }
  
  // Take screenshot for debugging
  await page.screenshot({ path: 'auto-test-01-auth-page.png' });
  
  // Try multiple selectors for email/password inputs
  const emailSelectors = [
    'input[type="email"]',
    'input[name="email"]',
    'input[placeholder*="email" i]',
    'input[placeholder*="Email" i]',
    'input[id*="email" i]',
    '#email'
  ];
  
  const passwordSelectors = [
    'input[type="password"]',
    'input[name="password"]',
    'input[placeholder*="password" i]',
    'input[placeholder*="Password" i]',
    'input[id*="password" i]',
    '#password'
  ];
  
  let emailInput = null;
  let passwordInput = null;
  
  // Find email input
  for (const selector of emailSelectors) {
    const element = await page.locator(selector).first();
    if (await element.isVisible().catch(() => false)) {
      emailInput = element;
      log(`  ✅ Found email input with selector: ${selector}`, 'green');
      break;
    }
  }
  
  // Find password input
  for (const selector of passwordSelectors) {
    const element = await page.locator(selector).first();
    if (await element.isVisible().catch(() => false)) {
      passwordInput = element;
      log(`  ✅ Found password input with selector: ${selector}`, 'green');
      break;
    }
  }
  
  // Check for tabs (Sign In vs Sign Up)
  const tabSelectors = [
    'button:has-text("Sign in")',
    'button:has-text("Sign In")',
    'button:has-text("Login")',
    '[role="tab"]:has-text("Sign")',
    '[data-state="active"]:has-text("Sign")'
  ];
  
  for (const selector of tabSelectors) {
    const tab = await page.locator(selector).first();
    if (await tab.isVisible().catch(() => false)) {
      await tab.click();
      log(`  ✅ Clicked tab: ${selector}`, 'green');
      await page.waitForTimeout(1000);
      
      // Re-check for inputs after clicking tab
      if (!emailInput) {
        for (const sel of emailSelectors) {
          const element = await page.locator(sel).first();
          if (await element.isVisible().catch(() => false)) {
            emailInput = element;
            log(`  ✅ Found email input after tab click`, 'green');
            break;
          }
        }
      }
      
      if (!passwordInput) {
        for (const sel of passwordSelectors) {
          const element = await page.locator(sel).first();
          if (await element.isVisible().catch(() => false)) {
            passwordInput = element;
            log(`  ✅ Found password input after tab click`, 'green');
            break;
          }
        }
      }
      
      break;
    }
  }
  
  // Check what's visible on the page
  const pageContent = await page.content();
  const hasAuthContent = pageContent.includes('Sign') || pageContent.includes('Login') || pageContent.includes('Email');
  log(`  Page has auth-related content: ${hasAuthContent}`, hasAuthContent ? 'green' : 'red');
  
  if (emailInput && passwordInput) {
    return { 
      success: true, 
      emailInput, 
      passwordInput,
      reason: 'found-inputs'
    };
  }
  
  // Try to find any form elements
  const formElements = await page.locator('form').count();
  log(`  Found ${formElements} form elements`, formElements > 0 ? 'green' : 'yellow');
  
  // Check for loading states
  const loadingElements = await page.locator('[class*="loading"], [class*="spinner"], [class*="skeleton"]').count();
  if (loadingElements > 0) {
    log(`  ⏳ Page appears to be loading (${loadingElements} loading elements)`, 'yellow');
    await page.waitForTimeout(5000);
    return testAuthPage(page); // Recursive retry
  }
  
  return { 
    success: false, 
    reason: 'inputs-not-found',
    formCount: formElements
  };
}

// Perform login
async function performLogin(page, emailInput, passwordInput) {
  log('\n🔐 Performing Login...', 'cyan');
  
  // Fill credentials
  await emailInput.fill(TEST_ACCOUNT.email);
  await passwordInput.fill(TEST_ACCOUNT.password);
  log(`  ✅ Filled credentials for ${TEST_ACCOUNT.email}`, 'green');
  
  // Find and click submit button
  const submitSelectors = [
    'button:has-text("Sign in")',
    'button:has-text("Sign In")',
    'button:has-text("Login")',
    'button:has-text("Log in")',
    'button:has-text("Submit")',
    'button[type="submit"]',
    'input[type="submit"]'
  ];
  
  let submitted = false;
  for (const selector of submitSelectors) {
    const button = await page.locator(selector).first();
    if (await button.isVisible().catch(() => false)) {
      await button.click();
      log(`  ✅ Clicked submit button: ${selector}`, 'green');
      submitted = true;
      break;
    }
  }
  
  if (!submitted) {
    // Try pressing Enter
    await passwordInput.press('Enter');
    log(`  ✅ Pressed Enter to submit`, 'green');
  }
  
  // Wait for navigation
  await page.waitForTimeout(5000);
  
  const newUrl = page.url();
  log(`  📍 After login URL: ${newUrl}`, 'blue');
  
  if (!newUrl.includes('/auth')) {
    log('  ✅ Successfully logged in!', 'green');
    await page.screenshot({ path: 'auto-test-02-after-login.png' });
    return true;
  }
  
  // Check for error messages
  const errorSelectors = [
    'text=/error|invalid|incorrect|failed/i',
    '[class*="error"]',
    '[class*="alert"]',
    '[role="alert"]'
  ];
  
  for (const selector of errorSelectors) {
    const error = await page.locator(selector).first();
    if (await error.isVisible().catch(() => false)) {
      const errorText = await error.textContent();
      log(`  ❌ Login error: ${errorText}`, 'red');
      return false;
    }
  }
  
  return false;
}

// Test navigation and features
async function testFeatures(page) {
  log('\n🧭 Testing Navigation and Features...', 'cyan');
  
  // Check navigation links
  const navLinks = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'AI Agents', href: '/agents' },
    { name: 'Conversations', href: '/conversations' },
    { name: 'Leads', href: '/leads' },
    { name: 'Organization', href: '/organization' }
  ];
  
  let foundCount = 0;
  for (const link of navLinks) {
    const element = await page.locator(`a[href="${link.href}"]`).first();
    const isVisible = await element.isVisible().catch(() => false);
    log(`  ${isVisible ? '✅' : '❌'} ${link.name} link`, isVisible ? 'green' : 'red');
    if (isVisible) foundCount++;
  }
  
  if (foundCount < 3) {
    log('  ⚠️  Navigation not fully visible', 'yellow');
    return false;
  }
  
  // Navigate to Agents page
  log('\n🤖 Testing Agents Page...', 'cyan');
  const agentsLink = await page.locator('a[href="/agents"]').first();
  
  if (await agentsLink.isVisible()) {
    await agentsLink.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    log('  ✅ Navigated to Agents page', 'green');
    await page.screenshot({ path: 'auto-test-03-agents.png' });
    
    // Look for agent elements
    const agentElements = await page.locator('text=/ResidentialBot|CommercialAssist|LuxuryAdvisor|RentalHelper|Agent|Bot/i').count();
    log(`  📊 Found ${agentElements} agent-related elements`, agentElements > 0 ? 'green' : 'yellow');
    
    // Look for chat preview button
    const chatButton = await page.locator('button:has-text("Chat"), button:has-text("Preview"), button:has-text("Test")').first();
    if (await chatButton.isVisible()) {
      log('  ✅ Found chat preview button', 'green');
      return true;
    }
  }
  
  return foundCount >= 3;
}

// Main test runner
async function runAutoTest() {
  log('\n' + '='.repeat(60), 'bright');
  log('🎭 AUTOMATED COMPLETE TEST SUITE', 'bright');
  log('='.repeat(60), 'bright');
  
  let frontendProcess = null;
  let browser = null;
  
  try {
    // Step 1: Check servers
    log('\n📡 Checking Servers...', 'cyan');
    const backendRunning = await checkServer(`${API_URL}/api/health`, 'Backend (3001)');
    let frontendRunning = await checkServer(BASE_URL, 'Frontend (3000)');
    
    if (!backendRunning) {
      log('\n❌ Backend must be running first!', 'red');
      log('Run: cd BACKEND && npm run server', 'yellow');
      process.exit(1);
    }
    
    // Step 2: Ensure frontend is running
    if (!frontendRunning) {
      await killExistingFrontend();
      frontendProcess = await startFrontend();
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for full startup
      frontendRunning = await checkServer(BASE_URL, 'Frontend (3000)');
      
      if (!frontendRunning) {
        throw new Error('Failed to start frontend');
      }
    }
    
    // Step 3: Launch browser and test
    log('\n🌐 Launching Browser...', 'cyan');
    browser = await chromium.launch({ 
      headless: false,
      slowMo: 300
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Step 4: Test auth page
    const authResult = await testAuthPage(page);
    
    if (!authResult.success) {
      log('\n❌ Auth page structure issue', 'red');
      log(`  Reason: ${authResult.reason}`, 'yellow');
      log('  Check screenshots: auto-test-*.png', 'yellow');
      
      // Try alternate approach
      log('\n🔄 Trying alternate login approach...', 'cyan');
      
      // Try going to dashboard directly
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForTimeout(3000);
      
      const dashUrl = page.url();
      if (dashUrl.includes('/auth')) {
        log('  Redirected to auth, need to login', 'yellow');
      } else if (dashUrl.includes('/dashboard')) {
        log('  ✅ Already authenticated!', 'green');
        await testFeatures(page);
      }
    } else if (authResult.reason === 'already-authenticated') {
      // Already logged in, test features
      await testFeatures(page);
    } else {
      // Found inputs, perform login
      const loginSuccess = await performLogin(page, authResult.emailInput, authResult.passwordInput);
      
      if (loginSuccess) {
        await testFeatures(page);
      } else {
        log('\n❌ Login failed', 'red');
        log('  Check credentials and try again', 'yellow');
      }
    }
    
    await context.close();
    
    log('\n' + '='.repeat(60), 'bright');
    log('✅ TEST COMPLETED', 'bright');
    log('Check screenshots: auto-test-*.png', 'cyan');
    log('='.repeat(60), 'bright');
    
  } catch (error) {
    log(`\n❌ Test error: ${error.message}`, 'red');
    if (error.stack) {
      log(error.stack, 'yellow');
    }
  } finally {
    if (browser) {
      await browser.close();
    }
    
    // Note: We don't kill the frontend process as user might want to keep it running
    if (frontendProcess) {
      log('\n📝 Note: Frontend server is still running', 'yellow');
      log('To stop it, press Ctrl+C or run: pkill -f "next dev"', 'yellow');
    }
  }
}

// Execute
if (require.main === module) {
  runAutoTest()
    .then(() => {
      log('\n✨ Done!', 'green');
      process.exit(0);
    })
    .catch((error) => {
      log(`\n❌ Fatal error: ${error.message}`, 'red');
      process.exit(1);
    });
}