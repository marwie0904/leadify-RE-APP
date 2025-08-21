import { test, expect } from '@playwright/test';

test.describe('Backend API Connectivity Test', () => {
  test('Check backend health and basic endpoints', async ({ page }) => {
    console.log('Testing backend API connectivity...');
    
    // Check if backend is running
    try {
      const healthResponse = await page.request.get('http://localhost:3001/api/health');
      console.log('Health endpoint status:', healthResponse.status());
      
      if (healthResponse.ok()) {
        const healthData = await healthResponse.json();
        console.log('Health data:', healthData);
      }
    } catch (error) {
      console.log('Health endpoint error:', error);
    }
    
    // Test login endpoint directly
    try {
      const loginResponse = await page.request.post('http://localhost:3001/api/auth/login', {
        data: {
          email: 'marwie0904@gmail.com',
          password: 'ayokonga123'
        }
      });
      
      console.log('Login endpoint status:', loginResponse.status());
      
      if (loginResponse.ok()) {
        const loginData = await loginResponse.json();
        console.log('Login response:', loginData);
      } else {
        const errorText = await loginResponse.text();
        console.log('Login error:', errorText);
      }
    } catch (error) {
      console.log('Login endpoint error:', error);
    }
  });
  
  test('Check if Supabase is working via browser', async ({ page }) => {
    console.log('Testing Supabase authentication in browser...');
    
    // Go to a page and check if Supabase client initializes
    await page.goto('/auth');
    
    // Add script to test Supabase directly
    const supabaseTest = await page.evaluate(async () => {
      try {
        // Check if Supabase environment variables are available
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        return {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey,
          url: supabaseUrl,
          keyPrefix: supabaseKey ? supabaseKey.substring(0, 10) + '...' : null
        };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    console.log('Supabase environment check:', supabaseTest);
    
    // Try to check authentication state
    const authTest = await page.evaluate(async () => {
      try {
        // This should work if Supabase is properly initialized
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
          return { error: 'Missing environment variables' };
        }
        
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data: { session } } = await supabase.auth.getSession();
        
        return {
          hasSession: !!session,
          sessionUserId: session?.user?.id || null
        };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    console.log('Supabase auth test:', authTest);
  });
});