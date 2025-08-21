const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const FRONTEND_URL = 'http://localhost:3000';
const API_BASE_URL = 'http://localhost:3001';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kbmsygyawpiqegemzetp.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtibXN5Z3lhd3BpcWVnZW16ZXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3Nzg4MjIsImV4cCI6MjA2NzM1NDgyMn0.tt-sVBYSPTMngOCAqQ6bTjGc6buyPQ9T-OmOP7NBPIE';

// Test user credentials
const TEST_USER = {
  email: 'marwie0904@gmail.com',
  password: 'ayokonga123'
};

async function runBANTUITest() {
  let browser;
  let agentId;
  
  try {
    console.log('=== BANT UI PLAYWRIGHT TEST ===\n');
    
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // 1. Authenticate and get session
    console.log('1. Authenticating user...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: TEST_USER.email,
      password: TEST_USER.password
    });
    
    if (authError) {
      throw new Error(`Authentication failed: ${authError.message}`);
    }
    
    const session = authData.session;
    console.log('✅ Authentication successful\n');
    
    // 2. Get or create an agent for testing
    console.log('2. Getting agent for testing...');
    const agentsResponse = await fetch(`${API_BASE_URL}/api/agents`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const agentsData = await agentsResponse.json();
    const agents = agentsData.agents || [];
    
    if (agents.length > 0) {
      agentId = agents[0].id;
      console.log(`✅ Using existing agent: ${agents[0].name} (ID: ${agentId})\n`);
    } else {
      console.log('❌ No agents found. Please create an agent first.');
      return;
    }
    
    // 3. Launch browser and set up authentication
    console.log('3. Launching browser with authentication...');
    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
      storageState: {
        cookies: [],
        origins: [
          {
            origin: FRONTEND_URL,
            localStorage: [
              {
                name: 'supabase.auth.token',
                value: JSON.stringify({
                  currentSession: session,
                  expiresAt: new Date(Date.now() + 3600000).getTime()
                })
              }
            ]
          }
        ]
      }
    });
    
    const page = await context.newPage();
    console.log('✅ Browser launched with authentication\n');
    
    // 4. Navigate to agents page
    console.log('4. Navigating to agents page...');
    await page.goto(`${FRONTEND_URL}/agents`);
    await page.waitForLoadState('networkidle');
    console.log('✅ Agents page loaded\n');
    
    // 5. Click on the first agent to open details
    console.log('5. Opening agent details...');
    // Wait for agents to load and click on the first one
    await page.waitForSelector('[data-testid="agent-card"], .agent-card, [class*="agent"]', { timeout: 10000 });
    await page.click('[data-testid="agent-card"]:first-child, .agent-card:first-child, [class*="agent"]:first-child');
    await page.waitForLoadState('networkidle');
    console.log('✅ Agent details opened\n');
    
    // 6. Navigate to BANT Configuration tab
    console.log('6. Navigating to BANT Configuration tab...');
    await page.waitForSelector('text=BANT Configuration, text=BANT Config, text=Custom BANT', { timeout: 10000 });
    await page.click('text=BANT Configuration, text=BANT Config, text=Custom BANT');
    await page.waitForLoadState('networkidle');
    console.log('✅ BANT Configuration tab opened\n');
    
    // 7. Test weight sliders
    console.log('7. Testing weight sliders...');
    
    // Budget weight slider
    const budgetSlider = await page.locator('[data-testid="budget-weight-slider"], [aria-label*="Budget weight"], input[type="range"]').first();
    await budgetSlider.fill('35');
    console.log('   - Set Budget weight to 35%');
    
    // Authority weight slider
    const authoritySlider = await page.locator('[data-testid="authority-weight-slider"], [aria-label*="Authority weight"], input[type="range"]').nth(1);
    await authoritySlider.fill('25');
    console.log('   - Set Authority weight to 25%');
    
    // Need weight slider
    const needSlider = await page.locator('[data-testid="need-weight-slider"], [aria-label*="Need weight"], input[type="range"]').nth(2);
    await needSlider.fill('20');
    console.log('   - Set Need weight to 20%');
    
    // Timeline weight slider
    const timelineSlider = await page.locator('[data-testid="timeline-weight-slider"], [aria-label*="Timeline weight"], input[type="range"]').nth(3);
    await timelineSlider.fill('15');
    console.log('   - Set Timeline weight to 15%');
    
    // Contact weight should auto-adjust to 5%
    console.log('   - Contact weight should auto-adjust to 5%');
    console.log('✅ Weight sliders tested\n');
    
    // 8. Test threshold inputs
    console.log('8. Testing threshold inputs...');
    
    await page.fill('[data-testid="priority-threshold"], [placeholder*="Priority"], input[name*="priority"]', '85');
    console.log('   - Set Priority threshold to 85');
    
    await page.fill('[data-testid="hot-threshold"], [placeholder*="Hot"], input[name*="hot"]', '70');
    console.log('   - Set Hot threshold to 70');
    
    await page.fill('[data-testid="warm-threshold"], [placeholder*="Warm"], input[name*="warm"]', '50');
    console.log('   - Set Warm threshold to 50');
    
    console.log('✅ Threshold inputs tested\n');
    
    // 9. Save configuration
    console.log('9. Saving BANT configuration...');
    await page.click('button:has-text("Save"), button:has-text("Apply"), button:has-text("Update")');
    
    // Wait for success message or API call to complete
    await page.waitForResponse(response => 
      response.url().includes('/bant-config') && response.status() === 200,
      { timeout: 10000 }
    ).catch(() => console.log('   - No success response detected'));
    
    console.log('✅ Configuration save attempted\n');
    
    // 10. Check for preview functionality
    console.log('10. Checking BANT preview...');
    const previewExists = await page.locator('text=Preview, text=Generated Prompt, text=BANT Scoring Prompt').count() > 0;
    if (previewExists) {
      console.log('✅ BANT preview section found\n');
    } else {
      console.log('⚠️  BANT preview section not found\n');
    }
    
    // Take a screenshot for verification
    await page.screenshot({ path: 'bant-config-test.png', fullPage: true });
    console.log('📸 Screenshot saved as bant-config-test.png\n');
    
    console.log('=== TEST COMPLETED ===');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
    
    // Take error screenshot if browser is available
    if (browser) {
      const page = await browser.newPage();
      await page.screenshot({ path: 'bant-config-error.png', fullPage: true });
      console.log('📸 Error screenshot saved as bant-config-error.png');
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
runBANTUITest();