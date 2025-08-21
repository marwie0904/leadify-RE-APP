#!/usr/bin/env node

const { chromium } = require('playwright');

async function testBANTFinal() {
  console.log('🧪 Final BANT API Test...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 50 
  });
  
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Error fetching BANT config:')) {
        console.log('📊 BANT Error Details:', text);
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
    
    // Click on an agent
    const agentCard = await page.locator('[data-testid="agent-card"], .cursor-pointer').first();
    if (await agentCard.isVisible()) {
      console.log('4️⃣ Clicking on agent...');
      await agentCard.click();
      
      // Wait for agent page to load
      await page.waitForTimeout(3000);
      
      // Check if BANT configuration section is visible
      const bantSection = await page.locator('text=/Custom BANT Configuration/i');
      if (await bantSection.isVisible()) {
        console.log('✅ BANT Configuration section is visible');
        
        // Check if sliders are working
        const budgetSlider = await page.locator('[role="slider"]').first();
        if (await budgetSlider.isVisible()) {
          console.log('✅ BANT weight sliders are visible');
          
          // Try adjusting a slider
          const sliderBounds = await budgetSlider.boundingBox();
          if (sliderBounds) {
            await page.mouse.click(sliderBounds.x + sliderBounds.width * 0.6, sliderBounds.y + sliderBounds.height / 2);
            await page.waitForTimeout(500);
            console.log('✅ Successfully interacted with slider');
          }
        }
        
        // Check for any error messages
        const errorAlert = await page.locator('[role="alert"]').filter({ hasText: 'Error' });
        if (await errorAlert.isVisible()) {
          const errorText = await errorAlert.textContent();
          console.log('❌ Error alert visible:', errorText);
        } else {
          console.log('✅ No error alerts visible');
        }
        
      } else {
        console.log('❌ BANT Configuration section not found');
      }
    } else {
      console.log('❌ No agent cards found');
    }
    
    // Check console for detailed error info
    console.log('\n5️⃣ Checking for console errors...');
    await page.waitForTimeout(2000);
    
    // Test direct API call
    console.log('\n6️⃣ Testing direct API call...');
    const apiTestResult = await page.evaluate(async () => {
      try {
        const authData = localStorage.getItem('supabase.auth.token');
        if (!authData) return { error: 'No auth token' };
        
        const parsed = JSON.parse(authData);
        const token = parsed?.currentSession?.access_token;
        
        const response = await fetch('/api/agents/67b50e8a-4160-41a9-a1b4-1ddc1b14b547/bant-config', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const data = await response.json();
        return {
          status: response.status,
          data,
          isExpected404: response.status === 404 && data?.error?.code === 'NOT_FOUND'
        };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    console.log('📡 Direct API Test Result:', apiTestResult);
    
    if (apiTestResult.isExpected404) {
      console.log('✅ API is working correctly - 404 is expected when no BANT config exists');
    } else if (apiTestResult.status === 200) {
      console.log('✅ API returned existing BANT configuration');
    } else {
      console.log('❌ Unexpected API response');
    }
    
    console.log('\n✅ Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

// Run the test
testBANTFinal().catch(console.error);