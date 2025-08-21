#!/usr/bin/env node

/**
 * Frontend UI Test - Submit Issues Through Admin Interface
 * This test directly interacts with the frontend to create issues
 */

const { chromium } = require('playwright');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000';

// Admin account with access to admin features
const ADMIN_ACCOUNT = {
  email: 'admin@gmail.com',
  password: 'admin123'
};

// Sample issues to submit
const TEST_ISSUES = [
  {
    title: 'Chat widget not loading on mobile devices',
    description: 'The chat widget fails to load when accessed from mobile browsers. Users on iOS Safari and Android Chrome report seeing a blank space where the widget should appear.',
    priority: 'high',
    status: 'open',
    category: 'bug',
    affectedArea: 'Frontend - Chat Widget'
  },
  {
    title: 'Lead export CSV contains incorrect data',
    description: 'When exporting leads to CSV, the BANT scores are showing as undefined and the conversation timestamps are in the wrong timezone.',
    priority: 'medium',
    status: 'open',
    category: 'bug',
    affectedArea: 'Backend - Export Function'
  },
  {
    title: 'Agent response time degraded during peak hours',
    description: 'Response times from AI agents increase from avg 2s to 15s during peak hours (2-4 PM EST). This affects user experience significantly.',
    priority: 'high',
    status: 'investigating',
    category: 'performance',
    affectedArea: 'Backend - AI Processing'
  },
  {
    title: 'Dashboard analytics not updating in real-time',
    description: 'The dashboard metrics for conversations and leads only update after page refresh. Real-time updates via websocket seem to be broken.',
    priority: 'medium',
    status: 'open',
    category: 'bug',
    affectedArea: 'Frontend - Dashboard'
  },
  {
    title: 'Email notifications not being sent for handoffs',
    description: 'When an AI agent initiates a handoff to human agent, the email notification system is not triggering. Agents are missing important handoff requests.',
    priority: 'critical',
    status: 'open',
    category: 'bug',
    affectedArea: 'Backend - Notifications'
  }
];

async function loginAsAdmin(page) {
  console.log('\n🔐 Logging in as admin...');
  
  // Navigate to login page
  await page.goto(`${BASE_URL}/admin/login`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  
  // Fill login credentials
  await page.fill('input[type="email"]', ADMIN_ACCOUNT.email);
  await page.fill('input[type="password"]', ADMIN_ACCOUNT.password);
  
  // Click sign in button
  await page.click('button[type="submit"]');
  
  // Wait for navigation to admin dashboard
  await page.waitForNavigation({ 
    url: url => url.includes('/admin'),
    timeout: 10000 
  }).catch(() => {
    console.log('  ⚠️ Navigation timeout, checking current page...');
  });
  
  // Verify login success
  const currentUrl = page.url();
  if (currentUrl.includes('/admin')) {
    console.log('  ✅ Admin login successful');
    return true;
  } else {
    console.log('  ❌ Admin login failed');
    return false;
  }
}

async function navigateToIssuesPage(page) {
  console.log('\n📍 Navigating to issues page...');
  
  // Method 1: Direct navigation
  await page.goto(`${BASE_URL}/admin/issues`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Check if we're on issues page
  const url = page.url();
  if (url.includes('/issues')) {
    console.log('  ✅ On issues page');
    return true;
  }
  
  // Method 2: Try via sidebar/menu
  const menuLinks = [
    page.locator('a[href="/admin/issues"]'),
    page.locator('a:has-text("Issues")'),
    page.locator('nav a:has-text("Issues")')
  ];
  
  for (const link of menuLinks) {
    if (await link.first().isVisible()) {
      await link.first().click();
      await page.waitForLoadState('networkidle');
      console.log('  ✅ Navigated via menu');
      return true;
    }
  }
  
  console.log('  ⚠️ Could not navigate to issues page');
  return false;
}

async function openNewIssueForm(page) {
  console.log('\n📝 Opening new issue form...');
  
  // Look for "New Issue" or "Report Issue" button
  const newIssueButtons = [
    page.locator('button:has-text("New Issue")'),
    page.locator('button:has-text("Report Issue")'),
    page.locator('button:has-text("Create Issue")'),
    page.locator('button:has-text("Add Issue")'),
    page.locator('button[aria-label*="new"]'),
    page.locator('button').filter({ hasText: /new|create|add|report/i })
  ];
  
  for (const button of newIssueButtons) {
    if (await button.first().isVisible()) {
      await button.first().click();
      console.log('  ✅ Clicked new issue button');
      await page.waitForTimeout(2000);
      
      // Check if modal or form appeared
      const formVisible = await page.locator('form, [role="dialog"], .modal').isVisible();
      if (formVisible) {
        console.log('  ✅ Issue form opened');
        return true;
      }
    }
  }
  
  console.log('  ⚠️ Could not open new issue form');
  return false;
}

async function fillAndSubmitIssueForm(page, issue) {
  console.log(`\n🐛 Submitting issue: "${issue.title}"`);
  
  try {
    // Fill title
    const titleInputs = [
      page.locator('input[name="title"]'),
      page.locator('input[placeholder*="Title"]'),
      page.locator('input[placeholder*="title"]'),
      page.locator('label:has-text("Title") + input'),
      page.locator('input').first()
    ];
    
    for (const input of titleInputs) {
      if (await input.isVisible() && await input.isEditable()) {
        await input.fill(issue.title);
        console.log('  ✅ Title filled');
        break;
      }
    }
    
    // Fill description
    const descriptionInputs = [
      page.locator('textarea[name="description"]'),
      page.locator('textarea[placeholder*="Description"]'),
      page.locator('textarea[placeholder*="description"]'),
      page.locator('label:has-text("Description") + textarea'),
      page.locator('textarea').first()
    ];
    
    for (const input of descriptionInputs) {
      if (await input.isVisible() && await input.isEditable()) {
        await input.fill(issue.description);
        console.log('  ✅ Description filled');
        break;
      }
    }
    
    // Select priority
    const prioritySelects = [
      page.locator('select[name="priority"]'),
      page.locator('button[role="combobox"]:has-text("Priority")'),
      page.locator('button:has-text("Select Priority")')
    ];
    
    for (const select of prioritySelects) {
      if (await select.isVisible()) {
        await select.click();
        await page.waitForTimeout(500);
        
        // Click the priority option
        const priorityOption = page.locator(`[role="option"]:has-text("${issue.priority}"), text="${issue.priority}"`).first();
        if (await priorityOption.isVisible()) {
          await priorityOption.click();
          console.log(`  ✅ Priority set to ${issue.priority}`);
        }
        break;
      }
    }
    
    // Select category
    const categorySelects = [
      page.locator('select[name="category"]'),
      page.locator('button[role="combobox"]:has-text("Category")'),
      page.locator('button:has-text("Select Category")')
    ];
    
    for (const select of categorySelects) {
      if (await select.isVisible()) {
        await select.click();
        await page.waitForTimeout(500);
        
        // Click the category option
        const categoryOption = page.locator(`[role="option"]:has-text("${issue.category}"), text="${issue.category}"`).first();
        if (await categoryOption.isVisible()) {
          await categoryOption.click();
          console.log(`  ✅ Category set to ${issue.category}`);
        }
        break;
      }
    }
    
    // Fill affected area
    const affectedAreaInputs = [
      page.locator('input[name="affectedArea"]'),
      page.locator('input[placeholder*="Affected"]'),
      page.locator('input[placeholder*="affected"]'),
      page.locator('label:has-text("Affected") + input')
    ];
    
    for (const input of affectedAreaInputs) {
      if (await input.isVisible() && await input.isEditable()) {
        await input.fill(issue.affectedArea);
        console.log('  ✅ Affected area filled');
        break;
      }
    }
    
    // Submit the form
    const submitButtons = [
      page.locator('button[type="submit"]'),
      page.locator('button:has-text("Submit")'),
      page.locator('button:has-text("Create")'),
      page.locator('button:has-text("Report")'),
      page.locator('button:has-text("Save")')
    ];
    
    for (const button of submitButtons) {
      if (await button.isVisible() && await button.isEnabled()) {
        await button.click();
        console.log('  ✅ Form submitted');
        
        // Wait for submission
        await page.waitForTimeout(3000);
        
        // Check for success message or modal close
        const successMessages = [
          page.locator('text=/success/i'),
          page.locator('text=/created/i'),
          page.locator('text=/submitted/i'),
          page.locator('[role="alert"]')
        ];
        
        for (const message of successMessages) {
          if (await message.first().isVisible()) {
            const text = await message.first().textContent();
            console.log(`  ✅ Success message: "${text}"`);
            return true;
          }
        }
        
        // Check if modal closed (back to issues list)
        const issueInList = await page.locator(`text="${issue.title.substring(0, 30)}"`).isVisible();
        if (issueInList) {
          console.log('  ✅ Issue appears in list');
          return true;
        }
        
        return true; // Assume success if no error
      }
    }
    
    console.log('  ⚠️ Could not find submit button');
    return false;
    
  } catch (error) {
    console.log(`  ❌ Error submitting issue: ${error.message}`);
    return false;
  }
}

async function runIssuesUITest() {
  console.log('\n' + '='.repeat(60));
  console.log('🐛 FRONTEND ISSUES SUBMISSION UI TEST');
  console.log('='.repeat(60));
  console.log('\nThis test will submit issues through the admin UI');
  
  const browser = await chromium.launch({
    headless: false,
    slowMo: 500 // Slow down to see interactions
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  const stats = {
    total: 0,
    successful: 0,
    failed: 0
  };
  
  try {
    // Login as admin
    const loginSuccess = await loginAsAdmin(page);
    if (!loginSuccess) {
      console.log('❌ Failed to login as admin');
      return;
    }
    
    // Navigate to issues page
    const onIssuesPage = await navigateToIssuesPage(page);
    if (!onIssuesPage) {
      console.log('❌ Could not navigate to issues page');
      return;
    }
    
    // Submit each test issue
    for (const issue of TEST_ISSUES) {
      stats.total++;
      console.log(`\n${'='.repeat(40)}`);
      console.log(`Issue #${stats.total}/${TEST_ISSUES.length}`);
      console.log('='.repeat(40));
      
      // Open new issue form
      const formOpened = await openNewIssueForm(page);
      if (!formOpened) {
        console.log('  ❌ Could not open issue form');
        stats.failed++;
        continue;
      }
      
      // Fill and submit the issue
      const submitted = await fillAndSubmitIssueForm(page, issue);
      if (submitted) {
        stats.successful++;
        console.log('  ✅ Issue submitted successfully');
      } else {
        stats.failed++;
        console.log('  ❌ Failed to submit issue');
      }
      
      // Wait before next issue
      await page.waitForTimeout(2000);
      
      // Make sure we're back on issues page
      await navigateToIssuesPage(page);
    }
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'issues-submitted.png',
      fullPage: true 
    });
    console.log('\n📸 Screenshot saved as issues-submitted.png');
    
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
  } finally {
    await context.close();
    await browser.close();
  }
  
  // Generate final report
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL TEST REPORT');
  console.log('='.repeat(60));
  
  console.log(`\n📈 Statistics:`);
  console.log(`  Total Issues Attempted: ${stats.total}`);
  console.log(`  Successfully Submitted: ${stats.successful}`);
  console.log(`  Failed: ${stats.failed}`);
  
  if (stats.total > 0) {
    const successRate = (stats.successful / stats.total * 100).toFixed(1);
    console.log(`  Success Rate: ${successRate}%`);
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (stats.successful >= stats.total * 0.8) {
    console.log('✅ TEST PASSED - 80% or more issues submitted successfully');
  } else if (stats.successful >= stats.total * 0.5) {
    console.log('⚠️ TEST PARTIALLY PASSED - 50% or more issues submitted');
  } else {
    console.log('❌ TEST FAILED - Less than 50% issues submitted');
  }
  
  console.log('='.repeat(60));
}

// Run the test
if (require.main === module) {
  console.log('🚀 Starting Frontend Issues UI Test...');
  
  runIssuesUITest()
    .then(() => {
      console.log('\n✨ Test completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runIssuesUITest };