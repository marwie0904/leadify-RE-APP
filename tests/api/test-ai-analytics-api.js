/**
 * Test AI Analytics API Endpoints
 */

const axios = require('axios');
require('dotenv').config({ path: './BACKEND/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const API_BASE_URL = 'http://localhost:3001';

async function testAIAnalyticsAPI() {
  console.log('=======================================');
  console.log('    AI ANALYTICS API TEST');
  console.log('=======================================\n');

  try {
    // 1. Login as marwryyy@gmail.com
    console.log('1. Logging in...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'marwryyy@gmail.com',
      password: 'ayokonga123'
    });

    if (authError) {
      console.error('❌ Login failed:', authError.message);
      return;
    }

    console.log('✅ Login successful\n');
    const token = authData.session.access_token;

    // 2. Test each AI Analytics endpoint
    const endpoints = [
      { url: '/api/admin/ai-analytics/summary', name: 'Summary' },
      { url: '/api/admin/ai-analytics/conversations', name: 'Conversations' },
      { url: '/api/admin/ai-analytics/operations', name: 'Operations' },
      { url: '/api/admin/ai-analytics/peak-times', name: 'Peak Times' },
      { url: '/api/admin/ai-analytics/organizations?page=1&limit=20', name: 'Organizations' },
      { url: '/api/admin/ai-analytics/daily?startDate=2025-07-01&endDate=2025-08-15', name: 'Daily Usage' },
      { url: '/api/admin/ai-analytics/month-comparison', name: 'Month Comparison' }
    ];

    console.log('2. Testing AI Analytics endpoints...\n');
    
    for (const endpoint of endpoints) {
      console.log(`Testing ${endpoint.name}...`);
      try {
        const response = await axios.get(`${API_BASE_URL}${endpoint.url}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.status === 200) {
          console.log(`✅ ${endpoint.name}: Status ${response.status}`);
          
          if (response.data.success) {
            console.log(`   Success: true`);
            if (response.data.data) {
              console.log(`   Data keys:`, Object.keys(response.data.data));
              // Show sample data for summary endpoint
              if (endpoint.name === 'Summary' && response.data.data) {
                console.log(`   Sample data:`, {
                  totalTokens: response.data.data.totalTokens,
                  totalCost: response.data.data.totalCost,
                  uniqueOrganizations: response.data.data.uniqueOrganizations
                });
              }
            }
          } else {
            console.log(`   ❌ Success: false`);
            console.log(`   Error:`, response.data.error);
          }
        } else {
          console.log(`❌ ${endpoint.name}: Status ${response.status}`);
        }
      } catch (error) {
        if (error.response) {
          console.log(`❌ ${endpoint.name}: Status ${error.response.status}`);
          console.log(`   Error:`, error.response.data);
        } else {
          console.log(`❌ ${endpoint.name}: Network error -`, error.message);
        }
      }
      console.log('');
    }

    // 3. Check ai_token_usage table directly
    console.log('3. Checking ai_token_usage table directly...');
    const { data: tokenData, error: tokenError, count } = await supabase
      .from('ai_token_usage')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (tokenError) {
      console.log('   ❌ Error fetching token usage:', tokenError.message);
    } else {
      console.log(`   ✅ Token usage records: ${count}`);
      if (tokenData && tokenData.length > 0) {
        console.log('   Recent entries:');
        tokenData.forEach(entry => {
          console.log(`   - ${entry.created_at}: ${entry.total_tokens} tokens, $${entry.cost}`);
        });
      }
    }

    console.log('\n=======================================');
    console.log('    TEST COMPLETE');
    console.log('=======================================');

  } catch (error) {
    console.error('Fatal error:', error);
  }
}

// Run the test
testAIAnalyticsAPI();