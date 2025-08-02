#!/usr/bin/env node

const { chromium } = require('playwright');

async function testBANTAPIFix() {
  console.log('🧪 Testing BANT API Fix...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100 
  });
  
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Console Error:', msg.text());
      }
    });
    
    // Listen for network errors
    page.on('response', response => {
      if (response.url().includes('/api/agents/') && response.url().includes('/bant-config')) {
        console.log(`📡 BANT API Response: ${response.status()} ${response.statusText()} - ${response.url()}`);
      }
    });
    
    console.log('1️⃣ Navigating to login page...');
    await page.goto('http://localhost:3000/auth');
    await page.waitForLoadState('networkidle');
    
    // Login
    console.log('2️⃣ Logging in...');
    await page.fill('input[type="email"]', 'marwie0904@gmail.com');
    await page.fill('input[type="password"]', 'ayokonga123');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard', { timeout: 30000 });
    console.log('✅ Successfully logged in');
    
    // Navigate to agents page
    console.log('\n3️⃣ Navigating to agents page...');
    await page.goto('http://localhost:3000/agents');
    await page.waitForLoadState('networkidle');
    
    // Check if agents are displayed
    const agentsExist = await page.locator('[data-testid="agent-card"], .agent-card, [class*="agent"]').count();
    console.log(`📊 Found ${agentsExist} agent(s) on the page`);
    
    if (agentsExist === 0) {
      // Check for the "no organization" error
      const noOrgError = await page.locator('text=/You need to create or join an organization/i').isVisible();
      if (noOrgError) {
        console.log('❌ Still seeing "no organization" error - the organization fix may not be working');
        
        // Try to get user data from console
        await page.evaluate(() => {
          const authData = localStorage.getItem('supabase.auth.token');
          if (authData) {
            const parsed = JSON.parse(authData);
            console.log('Auth data:', parsed);
          }
        });
      } else {
        console.log('⚠️ No agents found, but no organization error either');
      }
    } else {
      console.log('✅ Agents are displayed correctly');
      
      // Click on the first agent to test BANT config
      console.log('\n4️⃣ Clicking on first agent...');
      await page.locator('[data-testid="agent-card"], .agent-card, [class*="agent"]').first().click();
      
      // Wait for potential navigation or modal
      await page.waitForTimeout(2000);
      
      // Check if we're on agent management page
      const isOnAgentPage = await page.url().includes('/agents/') || await page.locator('text=/Custom BANT Configuration/i').isVisible();
      
      if (isOnAgentPage) {
        console.log('✅ On agent management page');
        
        // Look for BANT configuration section
        const bantSection = await page.locator('text=/Custom BANT/i').isVisible();
        console.log(`📋 BANT Configuration section visible: ${bantSection}`);
        
        // Check console for any BANT-related errors
        await page.waitForTimeout(2000);
        
        // Check if the BANT config loaded without errors
        const errorMessages = await page.locator('text=/Error fetching BANT config/i').count();
        if (errorMessages > 0) {
          console.log('❌ BANT config error detected on page');
        } else {
          console.log('✅ No BANT config errors detected');
        }
      }
    }
    
    // Additional test: Check network tab for API calls
    console.log('\n5️⃣ Checking for API authentication...');
    
    // Make a test API call to verify auth headers
    const testResult = await page.evaluate(async () => {
      try {
        // Get auth token
        const authData = localStorage.getItem('supabase.auth.token');
        if (!authData) return { error: 'No auth token found' };
        
        const parsed = JSON.parse(authData);
        const token = parsed?.currentSession?.access_token;
        if (!token) return { error: 'No access token in session' };
        
        // Test profile endpoint
        const response = await fetch('/api/settings/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const data = await response.json();
        return {
          status: response.status,
          hasOrganization: data.hasOrganization,
          organizationId: data.organization_id || data.organizationId,
          data
        };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    console.log('📡 Profile API Test Result:', testResult);
    
    if (testResult.organizationId) {
      console.log('✅ Organization ID is present in profile response');
    } else {
      console.log('❌ Organization ID is missing from profile response');
    }
    
    console.log('\n✅ Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

// Run the test
testBANTAPIFix().catch(console.error);