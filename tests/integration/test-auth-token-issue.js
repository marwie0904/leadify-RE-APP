// Debug why auth token isn't being sent correctly
const { chromium } = require('playwright');

async function debugAuthToken() {
  console.log('\n====================================');
  console.log('DEBUGGING AUTH TOKEN ISSUE');
  console.log('====================================\n');
  
  let browser;
  
  try {
    browser = await chromium.launch({ 
      headless: false,
      slowMo: 100
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Track API calls
    const apiCalls = [];
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/api/')) {
        const headers = request.headers();
        apiCalls.push({
          url: url.replace('http://localhost:3001', ''),
          method: request.method(),
          hasAuth: !!headers.authorization,
          authHeader: headers.authorization || 'MISSING'
        });
      }
    });
    
    // Step 1: Inject auth manually
    console.log('1. Injecting auth token directly...');
    await page.goto('http://localhost:3000');
    
    const token = await page.evaluate(async () => {
      // Get fresh token
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'marwryyy@gmail.com',
          password: 'ayokonga123'
        })
      });
      
      const data = await response.json();
      
      // Store in localStorage
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify({
        id: data.user.id,
        email: data.user.email,
        name: 'Admin User',
        role: 'admin',
        organizationId: '',
        hasOrganization: true
      }));
      
      return data.token;
    });
    
    console.log('   Token stored:', token.substring(0, 50) + '...');
    
    // Step 2: Navigate to AI Analytics
    console.log('\n2. Navigating to AI Analytics...');
    await page.goto('http://localhost:3000/admin/ai-analytics');
    await page.waitForTimeout(5000);
    
    // Step 3: Check how the app is sending requests
    console.log('\n3. Checking auth context getAuthHeaders...');
    const authCheck = await page.evaluate(async () => {
      // Try to access the auth context if available
      const token = localStorage.getItem('auth_token');
      const user = localStorage.getItem('auth_user');
      
      // Test a direct API call
      const testResponse = await fetch('http://localhost:3001/api/admin/ai-analytics/summary', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      return {
        tokenInStorage: !!token,
        userInStorage: !!user,
        directApiStatus: testResponse.status,
        directApiOk: testResponse.ok
      };
    });
    
    console.log('\n📌 Auth Check Results:');
    console.log('   Token in storage:', authCheck.tokenInStorage ? '✅' : '❌');
    console.log('   User in storage:', authCheck.userInStorage ? '✅' : '❌');
    console.log('   Direct API call:', authCheck.directApiOk ? `✅ (${authCheck.directApiStatus})` : `❌ (${authCheck.directApiStatus})`);
    
    // Step 4: Analyze API calls
    console.log('\n4. API Calls Analysis:');
    console.log('   Total API calls:', apiCalls.length);
    
    const authMissing = apiCalls.filter(c => !c.hasAuth && c.url.includes('/api/admin'));
    const authPresent = apiCalls.filter(c => c.hasAuth && c.url.includes('/api/admin'));
    
    console.log('   With auth header:', authPresent.length);
    console.log('   Missing auth header:', authMissing.length);
    
    if (authMissing.length > 0) {
      console.log('\n❌ API calls missing auth header:');
      authMissing.forEach(call => {
        console.log(`   ${call.method} ${call.url}`);
      });
    }
    
    if (authPresent.length > 0) {
      console.log('\n✅ API calls with auth header:');
      authPresent.forEach(call => {
        console.log(`   ${call.method} ${call.url}`);
      });
    }
    
    // Step 5: Check how the page is fetching data
    console.log('\n5. Checking page fetch implementation...');
    const fetchImpl = await page.evaluate(() => {
      // Check if there's a custom fetch wrapper
      const scripts = Array.from(document.querySelectorAll('script')).map(s => s.src || s.textContent?.substring(0, 100));
      
      // Check window for any API utilities
      const hasApiUtil = typeof window['api'] !== 'undefined';
      const hasAuthProvider = typeof window['useAuth'] !== 'undefined';
      
      return {
        scriptCount: scripts.length,
        hasApiUtil,
        hasAuthProvider
      };
    });
    
    console.log('   Scripts loaded:', fetchImpl.scriptCount);
    console.log('   Has API utility:', fetchImpl.hasApiUtil ? '✅' : '❌');
    console.log('   Has Auth Provider:', fetchImpl.hasAuthProvider ? '✅' : '❌');
    
    console.log('\n====================================');
    if (authMissing.length === 0 && authPresent.length > 0) {
      console.log('✅ Auth headers are being sent correctly');
    } else if (authMissing.length > 0) {
      console.log('❌ Auth headers are NOT being sent for some requests');
      console.log('   This suggests the frontend is not using the auth context properly');
    }
    console.log('====================================\n');
    
    // Keep browser open
    console.log('Browser will remain open for 10 seconds...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

debugAuthToken();