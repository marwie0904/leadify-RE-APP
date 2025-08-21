// Comprehensive Verification Test - Validates actual data and interactions
const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

const CONFIG = {
  baseUrl: 'http://localhost:3000',
  organizationId: '9a24d180-a1fe-4d22-91e2-066d55679888',
  headless: false,
  slowMo: 100,
  screenshotDir: './test-verification',
  timeout: 30000
};

// Comprehensive tests for each page
const VERIFICATION_TESTS = {
  analytics: {
    url: '/analytics',
    verifications: [
      { name: 'Total Conversations shows data', check: async (page) => {
        const element = await page.locator('text="Total Conversations"').locator('..').locator('text=/\\d+/').first();
        const text = await element.textContent();
        return { passed: text && parseInt(text) > 0, value: text };
      }},
      { name: 'Monthly chart renders', check: async (page) => {
        const bars = await page.locator('text="Monthly Conversations"').locator('..').locator('.bg-orange-600').count();
        return { passed: bars > 0, value: `${bars} data points` };
      }},
      { name: 'Token usage by model shows all 3 models', check: async (page) => {
        const gpt5 = await page.locator('text="GPT-5"').count();
        const mini = await page.locator('text="MINI"').count();
        const nano = await page.locator('text="NANO"').count();
        return { passed: gpt5 > 0 && mini > 0 && nano > 0, value: 'GPT-5, MINI, NANO' };
      }},
      { name: 'Cost displays with dollar sign', check: async (page) => {
        const cost = await page.locator('text=/\\$\\d+\\.\\d+/').first();
        const text = await cost.textContent();
        return { passed: text && text.includes('$'), value: text };
      }}
    ]
  },
  
  conversations: {
    url: '/conversations',
    verifications: [
      { name: 'Conversations table has rows', check: async (page) => {
        const rows = await page.locator('table tbody tr').count();
        return { passed: rows > 0, value: `${rows} conversations` };
      }},
      { name: 'Message dropdown expandable', check: async (page) => {
        const dropdown = await page.locator('button:has-text("messages")').first();
        if (await dropdown.count() > 0) {
          await dropdown.click();
          await page.waitForTimeout(500);
          const expanded = await page.locator('text="Hello"').count();
          return { passed: expanded > 0, value: 'Dropdown works' };
        }
        return { passed: false, value: 'No dropdown found' };
      }},
      { name: 'Token usage displays', check: async (page) => {
        const tokens = await page.locator('text="Total Tokens Used"').locator('..').locator('text=/\\d+[KM]?/').first();
        const text = await tokens.textContent();
        return { passed: text && text.length > 0, value: text };
      }},
      { name: 'Cost calculation shows', check: async (page) => {
        const cost = await page.locator('text="Total Cost"').locator('..').locator('text=/\\$\\d+/').first();
        const text = await cost.textContent();
        return { passed: text && text.includes('$'), value: text };
      }}
    ]
  },
  
  leads: {
    url: '/leads',
    verifications: [
      { name: 'Leads table populated', check: async (page) => {
        const rows = await page.locator('table tbody tr').count();
        return { passed: rows > 0, value: `${rows} leads` };
      }},
      { name: 'BANT scores display', check: async (page) => {
        const scores = await page.locator('text=/\\d+%/').count();
        return { passed: scores > 0, value: `${scores} scores shown` };
      }},
      { name: 'BANT dropdown expandable', check: async (page) => {
        const dropdown = await page.locator('button[aria-label*="BANT"]').first();
        if (await dropdown.count() > 0) {
          await dropdown.click();
          await page.waitForTimeout(500);
          const details = await page.locator('text="Budget Score"').count();
          return { passed: details > 0, value: 'BANT details visible' };
        }
        return { passed: false, value: 'No BANT dropdown' };
      }},
      { name: 'Lead temperature chart shows', check: async (page) => {
        const hot = await page.locator('text="Hot Leads"').locator('..').locator('text=/\\d+/').first();
        const text = await hot.textContent();
        return { passed: text && parseInt(text) >= 0, value: `${text} hot leads` };
      }}
    ]
  },
  
  members: {
    url: '/members',
    verifications: [
      { name: 'Members table shows data', check: async (page) => {
        const rows = await page.locator('table tbody tr').count();
        return { passed: rows > 0, value: `${rows} members` };
      }},
      { name: 'Edit button clickable', check: async (page) => {
        const editBtn = await page.locator('button:has-text("Edit")').first();
        if (await editBtn.count() > 0) {
          await editBtn.click();
          await page.waitForTimeout(500);
          const saveBtn = await page.locator('button:has-text("Save")').count();
          return { passed: saveBtn > 0, value: 'Edit mode works' };
        }
        return { passed: false, value: 'No edit button' };
      }},
      { name: 'Role badges display', check: async (page) => {
        const badges = await page.locator('.bg-blue-100, .bg-green-100, .bg-gray-100').count();
        return { passed: badges > 0, value: `${badges} role badges` };
      }},
      { name: 'Active count shows', check: async (page) => {
        const active = await page.locator('text="Active Today"').locator('..').locator('text=/\\d+/').first();
        const text = await active.textContent();
        return { passed: text && parseInt(text) >= 0, value: `${text} active` };
      }}
    ]
  },
  
  aiDetails: {
    url: '/ai-details',
    verifications: [
      { name: 'AI agents display', check: async (page) => {
        const cards = await page.locator('.border.rounded-lg').count();
        return { passed: cards > 0, value: `${cards} agent cards` };
      }},
      { name: 'BANT configuration tab works', check: async (page) => {
        const bantTab = await page.locator('button:has-text("BANT Configuration")').first();
        if (await bantTab.count() > 0) {
          await bantTab.click();
          await page.waitForTimeout(500);
          const weights = await page.locator('text="Budget Weight"').count();
          return { passed: weights > 0, value: 'BANT config visible' };
        }
        return { passed: false, value: 'No BANT tab' };
      }},
      { name: 'Integration badges show', check: async (page) => {
        const badges = await page.locator('text="Facebook", text="Web Chat", text="API"').count();
        return { passed: badges > 0, value: `${badges} integrations` };
      }},
      { name: 'Agent stats display', check: async (page) => {
        const stats = await page.locator('text="Total AI Agents"').locator('..').locator('text=/\\d+/').first();
        const text = await stats.textContent();
        return { passed: text && parseInt(text) > 0, value: `${text} agents` };
      }}
    ]
  },
  
  issues: {
    url: '/issues',
    verifications: [
      { name: 'Issues section populated', check: async (page) => {
        const issues = await page.locator('text="Open Issues"').locator('..').locator('.border.rounded-lg').count();
        return { passed: issues > 0, value: `${issues} open issues` };
      }},
      { name: 'Feature requests section shows', check: async (page) => {
        const features = await page.locator('text="Feature Requests"').locator('..').locator('.border.rounded-lg').count();
        return { passed: features > 0, value: `${features} feature requests` };
      }},
      { name: 'Priority badges display', check: async (page) => {
        const high = await page.locator('.bg-red-100').count();
        const medium = await page.locator('.bg-yellow-100').count();
        const low = await page.locator('.bg-blue-100').count();
        return { passed: (high + medium + low) > 0, value: `H:${high} M:${medium} L:${low}` };
      }},
      { name: 'Status indicators work', check: async (page) => {
        const open = await page.locator('text="Open"').count();
        const progress = await page.locator('text="In Progress"').count();
        return { passed: (open + progress) > 0, value: `Open:${open} Progress:${progress}` };
      }}
    ]
  }
};

async function setupAuth(page) {
  await page.goto(CONFIG.baseUrl);
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('test_mode', 'true');
    localStorage.setItem('admin_token', 'test-admin-token-123');
    localStorage.setItem('admin_user', JSON.stringify({
      id: 'admin-user-id',
      email: 'admin@example.com',
      name: 'Test Admin',
      role: 'admin'
    }));
  });
  await page.waitForTimeout(1000);
}

async function runVerificationTests() {
  console.log('='.repeat(70));
  console.log('🔍 COMPREHENSIVE DATA & INTERACTION VERIFICATION');
  console.log('='.repeat(70));
  console.log(`Testing: ${CONFIG.baseUrl}`);
  console.log(`Organization: ${CONFIG.organizationId}`);
  console.log('='.repeat(70));
  console.log();
  
  await fs.mkdir(CONFIG.screenshotDir, { recursive: true });
  
  const browser = await chromium.launch({
    headless: CONFIG.headless,
    slowMo: CONFIG.slowMo
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  await setupAuth(page);
  
  const results = {};
  let totalTests = 0;
  let passedTests = 0;
  
  for (const [pageName, config] of Object.entries(VERIFICATION_TESTS)) {
    const url = `${CONFIG.baseUrl}/admin/organizations/${CONFIG.organizationId}${config.url}`;
    console.log(`📄 Testing ${pageName.toUpperCase()} page`);
    console.log(`   URL: ${url}`);
    
    results[pageName] = {
      url,
      tests: [],
      success: false
    };
    
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000); // Wait for React render
      
      // Check for errors
      const currentUrl = page.url();
      if (currentUrl.includes('login')) {
        throw new Error('Redirected to login');
      }
      
      // Run verifications
      let pagePassedCount = 0;
      for (const verification of config.verifications) {
        totalTests++;
        try {
          const result = await verification.check(page);
          results[pageName].tests.push({
            name: verification.name,
            ...result
          });
          
          if (result.passed) {
            pagePassedCount++;
            passedTests++;
            console.log(`   ✅ ${verification.name}: ${result.value}`);
          } else {
            console.log(`   ❌ ${verification.name}: ${result.value}`);
          }
        } catch (error) {
          results[pageName].tests.push({
            name: verification.name,
            passed: false,
            error: error.message
          });
          console.log(`   ❌ ${verification.name}: Error - ${error.message}`);
        }
      }
      
      // Take screenshot
      const screenshotPath = path.join(CONFIG.screenshotDir, `${pageName}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      
      results[pageName].success = pagePassedCount === config.verifications.length;
      results[pageName].successRate = (pagePassedCount / config.verifications.length * 100).toFixed(1);
      
      console.log(`   📊 Page Score: ${pagePassedCount}/${config.verifications.length} (${results[pageName].successRate}%)\n`);
      
    } catch (error) {
      console.error(`   ❌ Page Error: ${error.message}\n`);
      results[pageName].error = error.message;
    }
  }
  
  // Summary
  const successRate = (passedTests / totalTests * 100).toFixed(1);
  
  console.log('='.repeat(70));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total Tests: ${passedTests}/${totalTests} passed (${successRate}%)`);
  console.log('\nPage Breakdown:');
  
  for (const [page, result] of Object.entries(results)) {
    const icon = result.success ? '✅' : result.error ? '❌' : '⚠️';
    const rate = result.successRate || '0.0';
    console.log(`${icon} ${page.padEnd(15)} ${rate}% - ${result.tests.filter(t => t.passed).length}/${result.tests.length} checks`);
  }
  
  // Save report
  const reportPath = path.join(CONFIG.screenshotDir, 'verification-report.json');
  await fs.writeFile(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    results,
    summary: {
      totalTests,
      passedTests,
      successRate
    }
  }, null, 2));
  
  console.log(`\n📁 Report: ${reportPath}`);
  console.log(`📸 Screenshots: ${CONFIG.screenshotDir}/`);
  
  console.log('\n' + '='.repeat(70));
  if (successRate === '100.0') {
    console.log('🎉 PERFECT! All data and interactions verified!');
  } else if (parseFloat(successRate) >= 90) {
    console.log('✅ EXCELLENT! Most features working correctly.');
  } else if (parseFloat(successRate) >= 70) {
    console.log('⚠️ GOOD! Some features need attention.');
  } else {
    console.log('❌ NEEDS WORK! Several features not working.');
  }
  console.log('='.repeat(70));
  
  await browser.close();
  process.exit(parseFloat(successRate) >= 90 ? 0 : 1);
}

runVerificationTests().catch(console.error);