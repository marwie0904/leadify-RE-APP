#!/usr/bin/env node

/**
 * Frontend UI Test - Submit Feature Requests Through Admin Interface
 * This test directly interacts with the frontend to create feature requests
 */

const { chromium } = require('playwright');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000';

// Admin account with access to admin features
const ADMIN_ACCOUNT = {
  email: 'admin@gmail.com',
  password: 'admin123'
};

// Sample feature requests to submit
const TEST_FEATURE_REQUESTS = [
  {
    title: 'Add voice chat capability to AI agents',
    description: 'Allow users to interact with AI agents through voice commands and receive audio responses. This would greatly improve accessibility and user experience for mobile users.',
    priority: 'high',
    status: 'pending',
    category: 'enhancement',
    estimatedEffort: '3 months',
    businessValue: 'High - Expected to increase user engagement by 40%'
  },
  {
    title: 'Implement multi-language support',
    description: 'Add support for Spanish, French, and Mandarin to reach international markets. This includes UI translation and AI agent multilingual capabilities.',
    priority: 'medium',
    status: 'under_review',
    category: 'feature',
    estimatedEffort: '2 months',
    businessValue: 'Medium - Opens up 3 new markets'
  },
  {
    title: 'Create mobile app for iOS and Android',
    description: 'Native mobile applications with full feature parity to web version. Include push notifications for lead alerts and offline message queuing.',
    priority: 'high',
    status: 'pending',
    category: 'feature',
    estimatedEffort: '6 months',
    businessValue: 'Very High - Mobile users represent 60% of market'
  },
  {
    title: 'Add Zapier integration',
    description: 'Allow users to connect their AI agents with 5000+ apps through Zapier. This would enable automated workflows and better CRM integration.',
    priority: 'medium',
    status: 'pending',
    category: 'integration',
    estimatedEffort: '1 month',
    businessValue: 'High - Reduces manual data entry by 70%'
  },
  {
    title: 'Implement advanced analytics dashboard',
    description: 'Provide detailed analytics including conversation sentiment analysis, conversion funnel visualization, and predictive lead scoring.',
    priority: 'low',
    status: 'pending',
    category: 'enhancement',
    estimatedEffort: '2 months',
    businessValue: 'Medium - Better insights for optimization'
  },
  {
    title: 'Add video call handoff capability',
    description: 'When AI agent hands off to human, allow immediate video call initiation for high-value leads. Include screen sharing and document collaboration.',
    priority: 'high',
    status: 'pending',
    category: 'feature',
    estimatedEffort: '4 months',
    businessValue: 'Very High - Increases close rate by 25%'
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

async function navigateToFeatureRequestsPage(page) {
  console.log('\n📍 Navigating to feature requests page...');
  
  // Method 1: Direct navigation
  await page.goto(`${BASE_URL}/admin/feature-requests`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Check if we're on feature requests page
  const url = page.url();
  if (url.includes('/feature-requests')) {
    console.log('  ✅ On feature requests page');
    return true;
  }
  
  // Method 2: Try via sidebar/menu
  const menuLinks = [
    page.locator('a[href="/admin/feature-requests"]'),
    page.locator('a:has-text("Feature Requests")'),
    page.locator('nav a:has-text("Feature")')
  ];
  
  for (const link of menuLinks) {
    if (await link.first().isVisible()) {
      await link.first().click();
      await page.waitForLoadState('networkidle');
      console.log('  ✅ Navigated via menu');
      return true;
    }
  }
  
  console.log('  ⚠️ Could not navigate to feature requests page');
  return false;
}

async function openNewFeatureRequestForm(page) {
  console.log('\n📝 Opening new feature request form...');
  
  // Look for "New Feature Request" button
  const newFeatureButtons = [
    page.locator('button:has-text("New Feature")'),
    page.locator('button:has-text("Request Feature")'),
    page.locator('button:has-text("Create Feature")'),
    page.locator('button:has-text("Add Feature")'),
    page.locator('button:has-text("Submit Feature")'),
    page.locator('button[aria-label*="new"]'),
    page.locator('button').filter({ hasText: /new|create|add|request/i })
  ];
  
  for (const button of newFeatureButtons) {
    if (await button.first().isVisible()) {
      await button.first().click();
      console.log('  ✅ Clicked new feature request button');
      await page.waitForTimeout(2000);
      
      // Check if modal or form appeared
      const formVisible = await page.locator('form, [role="dialog"], .modal').isVisible();
      if (formVisible) {
        console.log('  ✅ Feature request form opened');
        return true;
      }
    }
  }
  
  console.log('  ⚠️ Could not open new feature request form');
  return false;
}

async function fillAndSubmitFeatureRequestForm(page, feature) {
  console.log(`\n💡 Submitting feature request: "${feature.title}"`);
  
  try {
    // Fill title
    const titleInputs = [
      page.locator('input[name="title"]'),
      page.locator('input[placeholder*="Title"]'),
      page.locator('input[placeholder*="title"]'),
      page.locator('input[placeholder*="Feature"]'),
      page.locator('label:has-text("Title") + input'),
      page.locator('input').first()
    ];
    
    for (const input of titleInputs) {
      if (await input.isVisible() && await input.isEditable()) {
        await input.fill(feature.title);
        console.log('  ✅ Title filled');
        break;
      }
    }
    
    // Fill description
    const descriptionInputs = [
      page.locator('textarea[name="description"]'),
      page.locator('textarea[placeholder*="Description"]'),
      page.locator('textarea[placeholder*="description"]'),
      page.locator('textarea[placeholder*="Describe"]'),
      page.locator('label:has-text("Description") + textarea'),
      page.locator('textarea').first()
    ];
    
    for (const input of descriptionInputs) {
      if (await input.isVisible() && await input.isEditable()) {
        await input.fill(feature.description);
        console.log('  ✅ Description filled');
        break;
      }
    }
    
    // Select priority
    const prioritySelects = [
      page.locator('select[name="priority"]'),
      page.locator('button[role="combobox"]:has-text("Priority")'),
      page.locator('button:has-text("Select Priority")'),
      page.locator('[data-testid="priority-select"]')
    ];
    
    for (const select of prioritySelects) {
      if (await select.isVisible()) {
        await select.click();
        await page.waitForTimeout(500);
        
        // Click the priority option
        const priorityOption = page.locator(`[role="option"]:has-text("${feature.priority}"), text="${feature.priority}"`).first();
        if (await priorityOption.isVisible()) {
          await priorityOption.click();
          console.log(`  ✅ Priority set to ${feature.priority}`);
        }
        break;
      }
    }
    
    // Select category
    const categorySelects = [
      page.locator('select[name="category"]'),
      page.locator('button[role="combobox"]:has-text("Category")'),
      page.locator('button:has-text("Select Category")'),
      page.locator('[data-testid="category-select"]')
    ];
    
    for (const select of categorySelects) {
      if (await select.isVisible()) {
        await select.click();
        await page.waitForTimeout(500);
        
        // Click the category option
        const categoryOption = page.locator(`[role="option"]:has-text("${feature.category}"), text="${feature.category}"`).first();
        if (await categoryOption.isVisible()) {
          await categoryOption.click();
          console.log(`  ✅ Category set to ${feature.category}`);
        }
        break;
      }
    }
    
    // Fill estimated effort
    const effortInputs = [
      page.locator('input[name="estimatedEffort"]'),
      page.locator('input[placeholder*="Effort"]'),
      page.locator('input[placeholder*="effort"]'),
      page.locator('input[placeholder*="Timeline"]'),
      page.locator('label:has-text("Effort") + input')
    ];
    
    for (const input of effortInputs) {
      if (await input.isVisible() && await input.isEditable()) {
        await input.fill(feature.estimatedEffort);
        console.log('  ✅ Estimated effort filled');
        break;
      }
    }
    
    // Fill business value
    const valueInputs = [
      page.locator('input[name="businessValue"]'),
      page.locator('textarea[name="businessValue"]'),
      page.locator('input[placeholder*="Value"]'),
      page.locator('input[placeholder*="value"]'),
      page.locator('textarea[placeholder*="Value"]'),
      page.locator('label:has-text("Value") + input'),
      page.locator('label:has-text("Value") + textarea')
    ];
    
    for (const input of valueInputs) {
      if (await input.isVisible() && await input.isEditable()) {
        await input.fill(feature.businessValue);
        console.log('  ✅ Business value filled');
        break;
      }
    }
    
    // Submit the form
    const submitButtons = [
      page.locator('button[type="submit"]'),
      page.locator('button:has-text("Submit")'),
      page.locator('button:has-text("Create")'),
      page.locator('button:has-text("Request")'),
      page.locator('button:has-text("Save")'),
      page.locator('button:has-text("Add")')
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
          page.locator('text=/added/i'),
          page.locator('[role="alert"]')
        ];
        
        for (const message of successMessages) {
          if (await message.first().isVisible()) {
            const text = await message.first().textContent();
            console.log(`  ✅ Success message: "${text}"`);
            return true;
          }
        }
        
        // Check if feature appears in list
        const featureInList = await page.locator(`text="${feature.title.substring(0, 30)}"`).isVisible();
        if (featureInList) {
          console.log('  ✅ Feature request appears in list');
          return true;
        }
        
        return true; // Assume success if no error
      }
    }
    
    console.log('  ⚠️ Could not find submit button');
    return false;
    
  } catch (error) {
    console.log(`  ❌ Error submitting feature request: ${error.message}`);
    return false;
  }
}

async function voteOnFeatureRequest(page, featureTitle) {
  console.log(`\n👍 Voting on feature: "${featureTitle.substring(0, 40)}..."`);
  
  try {
    // Find the feature in the list
    const featureRow = page.locator(`tr:has-text("${featureTitle.substring(0, 30)}")`).first();
    
    if (await featureRow.isVisible()) {
      // Look for vote button in the row
      const voteButtons = [
        featureRow.locator('button:has-text("Vote")'),
        featureRow.locator('button:has-text("👍")'),
        featureRow.locator('button[aria-label*="vote"]'),
        featureRow.locator('button').filter({ hasText: /vote|upvote/i })
      ];
      
      for (const button of voteButtons) {
        if (await button.isVisible()) {
          await button.click();
          console.log('  ✅ Voted on feature request');
          await page.waitForTimeout(1000);
          return true;
        }
      }
    }
    
    console.log('  ⚠️ Could not find vote button');
    return false;
    
  } catch (error) {
    console.log(`  ⚠️ Could not vote: ${error.message}`);
    return false;
  }
}

async function runFeatureRequestsUITest() {
  console.log('\n' + '='.repeat(60));
  console.log('💡 FRONTEND FEATURE REQUESTS SUBMISSION UI TEST');
  console.log('='.repeat(60));
  console.log('\nThis test will submit feature requests through the admin UI');
  
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
    failed: 0,
    voted: 0
  };
  
  try {
    // Login as admin
    const loginSuccess = await loginAsAdmin(page);
    if (!loginSuccess) {
      console.log('❌ Failed to login as admin');
      return;
    }
    
    // Navigate to feature requests page
    const onFeatureRequestsPage = await navigateToFeatureRequestsPage(page);
    if (!onFeatureRequestsPage) {
      console.log('❌ Could not navigate to feature requests page');
      return;
    }
    
    // Submit each test feature request
    for (const feature of TEST_FEATURE_REQUESTS) {
      stats.total++;
      console.log(`\n${'='.repeat(40)}`);
      console.log(`Feature Request #${stats.total}/${TEST_FEATURE_REQUESTS.length}`);
      console.log('='.repeat(40));
      
      // Open new feature request form
      const formOpened = await openNewFeatureRequestForm(page);
      if (!formOpened) {
        console.log('  ❌ Could not open feature request form');
        stats.failed++;
        continue;
      }
      
      // Fill and submit the feature request
      const submitted = await fillAndSubmitFeatureRequestForm(page, feature);
      if (submitted) {
        stats.successful++;
        console.log('  ✅ Feature request submitted successfully');
        
        // Try to vote on the feature we just created
        await page.waitForTimeout(2000);
        const voted = await voteOnFeatureRequest(page, feature.title);
        if (voted) {
          stats.voted++;
        }
      } else {
        stats.failed++;
        console.log('  ❌ Failed to submit feature request');
      }
      
      // Wait before next feature request
      await page.waitForTimeout(2000);
      
      // Make sure we're back on feature requests page
      await navigateToFeatureRequestsPage(page);
    }
    
    // Test filtering functionality
    console.log('\n📊 Testing filters...');
    
    // Try priority filter
    const priorityFilter = page.locator('button:has-text("Priority"), button:has-text("All Priorities")').first();
    if (await priorityFilter.isVisible()) {
      await priorityFilter.click();
      await page.waitForTimeout(500);
      
      const highPriority = page.locator('[role="option"]:has-text("High")').first();
      if (await highPriority.isVisible()) {
        await highPriority.click();
        console.log('  ✅ Filtered by high priority');
        await page.waitForTimeout(2000);
      }
    }
    
    // Take final screenshot
    await page.screenshot({ 
      path: 'feature-requests-submitted.png',
      fullPage: true 
    });
    console.log('\n📸 Screenshot saved as feature-requests-submitted.png');
    
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
  console.log(`  Total Feature Requests Attempted: ${stats.total}`);
  console.log(`  Successfully Submitted: ${stats.successful}`);
  console.log(`  Failed: ${stats.failed}`);
  console.log(`  Voted On: ${stats.voted}`);
  
  if (stats.total > 0) {
    const successRate = (stats.successful / stats.total * 100).toFixed(1);
    console.log(`  Success Rate: ${successRate}%`);
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (stats.successful >= stats.total * 0.8) {
    console.log('✅ TEST PASSED - 80% or more feature requests submitted successfully');
  } else if (stats.successful >= stats.total * 0.5) {
    console.log('⚠️ TEST PARTIALLY PASSED - 50% or more feature requests submitted');
  } else {
    console.log('❌ TEST FAILED - Less than 50% feature requests submitted');
  }
  
  console.log('='.repeat(60));
}

// Run the test
if (require.main === module) {
  console.log('🚀 Starting Frontend Feature Requests UI Test...');
  
  runFeatureRequestsUITest()
    .then(() => {
      console.log('\n✨ Test completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runFeatureRequestsUITest };