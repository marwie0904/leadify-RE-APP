#!/usr/bin/env node

/**
 * Test script to verify greeting performance improvements
 * 
 * Tests that simple greetings like "hello" are handled instantly
 * without any API calls or expensive operations.
 */

const axios = require('axios');

const API_URL = 'http://localhost:3001';
const TEST_CONVERSATION_ID = 'test-greeting-' + Date.now();

// Test credentials (from .env)
const TEST_EMAIL = 'marwie.ang.0904@gmail.com';
const TEST_PASSWORD = 'ayokonga123';

async function login() {
  try {
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    return response.data.token;
  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
    throw error;
  }
}

async function getAgent(token) {
  try {
    const response = await axios.get(`${API_URL}/api/agents`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data[0];
  } catch (error) {
    console.error('Failed to get agent:', error.response?.data || error.message);
    throw error;
  }
}

async function testGreeting(token, agentId, message) {
  const startTime = Date.now();
  
  try {
    const response = await axios.post(
      `${API_URL}/api/chat`,
      {
        message,
        agent_id: agentId,
        conversation_id: TEST_CONVERSATION_ID + '-' + Date.now(),
        source: 'web'
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const responseTime = Date.now() - startTime;
    
    return {
      message,
      responseTime,
      response: response.data.response,
      success: response.status === 200
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      message,
      responseTime,
      error: error.response?.data || error.message,
      success: false
    };
  }
}

async function runTests() {
  console.log('🚀 Starting Greeting Performance Tests\n');
  console.log('=' .repeat(60));
  
  try {
    // Login
    console.log('📱 Logging in...');
    const token = await login();
    console.log('✅ Login successful\n');
    
    // Get agent
    console.log('🤖 Getting agent...');
    const agent = await getAgent(token);
    console.log(`✅ Using agent: ${agent.name}\n`);
    
    // Test greetings
    const greetings = [
      'hello',
      'hi',
      'hey',
      'good morning',
      'thanks',
      'thank you',
      'bye',
      'goodbye',
      'ok',
      'yes',
      'no',
      'great',
      'awesome'
    ];
    
    console.log('🧪 Testing Greetings:\n');
    console.log('=' .repeat(60));
    
    const results = [];
    
    for (const greeting of greetings) {
      const result = await testGreeting(token, agent.id, greeting);
      results.push(result);
      
      const emoji = result.responseTime < 500 ? '⚡' : 
                   result.responseTime < 1000 ? '✅' : 
                   result.responseTime < 2000 ? '⚠️' : '❌';
      
      console.log(`${emoji} "${greeting}": ${result.responseTime}ms`);
      if (result.response) {
        console.log(`   Response: "${result.response.substring(0, 80)}..."`);
      }
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      console.log();
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Summary
    console.log('=' .repeat(60));
    console.log('\n📊 Performance Summary:\n');
    
    const avgTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
    const minTime = Math.min(...results.map(r => r.responseTime));
    const maxTime = Math.max(...results.map(r => r.responseTime));
    const under500ms = results.filter(r => r.responseTime < 500).length;
    const under1s = results.filter(r => r.responseTime < 1000).length;
    
    console.log(`   Average response time: ${avgTime.toFixed(0)}ms`);
    console.log(`   Fastest response: ${minTime}ms`);
    console.log(`   Slowest response: ${maxTime}ms`);
    console.log(`   Responses under 500ms: ${under500ms}/${results.length} (${(under500ms/results.length*100).toFixed(0)}%)`);
    console.log(`   Responses under 1s: ${under1s}/${results.length} (${(under1s/results.length*100).toFixed(0)}%)`);
    
    // Performance assessment
    console.log('\n🎯 Performance Assessment:');
    if (avgTime < 500) {
      console.log('   ⚡ EXCELLENT - Greetings are handled instantly!');
    } else if (avgTime < 1000) {
      console.log('   ✅ GOOD - Greetings are handled quickly');
    } else if (avgTime < 2000) {
      console.log('   ⚠️ NEEDS IMPROVEMENT - Greetings are still slow');
    } else {
      console.log('   ❌ POOR - Greetings are taking too long');
    }
    
    console.log('\n✨ Test complete!\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Check if server is running
axios.get(`${API_URL}/api/health`)
  .then(() => {
    console.log('✅ Server is running\n');
    runTests();
  })
  .catch(() => {
    console.error('❌ Server is not running. Please start it with: node server.js');
    process.exit(1);
  });