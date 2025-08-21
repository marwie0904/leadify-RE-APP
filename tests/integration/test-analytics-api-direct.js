const axios = require('axios');

async function testAnalyticsAPI() {
  console.log('Testing Analytics API directly...\n');
  
  try {
    // Get auth token from environment or test token
    const token = process.env.AUTH_TOKEN || 'test-admin-token';
    const orgId = '8266be99-fcfd-42f7-a6e2-948e070f1eef'; // Brown Homes
    
    // Test the analytics endpoint
    console.log('Testing Analytics Endpoint...');
    const response = await axios.get(
      `http://localhost:3001/api/admin/organizations/${orgId}/analytics`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    // Check specific fields
    if (response.data) {
      const data = response.data.data?.analytics || response.data.analytics || response.data;
      console.log('\n--- Data Structure ---');
      console.log('Has conversationMetrics?', !!data.conversationMetrics);
      console.log('Has leadMetrics?', !!data.leadMetrics);
      console.log('Has performanceMetrics?', !!data.performanceMetrics);
      console.log('Has tokenUsageByModel?', !!data.tokenUsageByModel);
      console.log('Has tokenUsageByTask?', !!data.tokenUsageByTask);
      console.log('Has tokenUsageTrend?', !!data.tokenUsageTrend);
      
      if (data.conversationMetrics) {
        console.log('\nConversation Metrics:', data.conversationMetrics);
      }
      if (data.leadMetrics) {
        console.log('\nLead Metrics:', data.leadMetrics);
      }
      if (data.performanceMetrics) {
        console.log('\nPerformance Metrics:', data.performanceMetrics);
      }
    }
    
  } catch (error) {
    console.error('Error testing analytics API:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
  }
}

testAnalyticsAPI();