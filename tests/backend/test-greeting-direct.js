#!/usr/bin/env node

/**
 * Direct test of greeting performance using curl
 * Tests the response time without authentication complexity
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const API_URL = 'http://localhost:3001';

async function testGreeting(message) {
  const startTime = Date.now();
  
  try {
    // Create a simple test payload
    const payload = {
      message,
      agent_id: 'test-agent',
      conversation_id: 'test-conv-' + Date.now(),
      source: 'web'
    };
    
    // Use curl to make the request
    const curlCmd = `curl -s -X POST ${API_URL}/api/chat \
      -H "Content-Type: application/json" \
      -d '${JSON.stringify(payload)}' \
      -w "\\n%{time_total}"`;
    
    const { stdout, stderr } = await execPromise(curlCmd);
    const responseTime = Date.now() - startTime;
    
    // Parse response
    const lines = stdout.trim().split('\n');
    const curlTime = parseFloat(lines[lines.length - 1]) * 1000; // Convert to ms
    const response = lines.slice(0, -1).join('\n');
    
    let responseData;
    try {
      responseData = JSON.parse(response);
    } catch {
      responseData = { error: response };
    }
    
    return {
      message,
      responseTime,
      curlTime,
      response: responseData.response || responseData.error || 'No response',
      success: !!responseData.response
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      message,
      responseTime,
      error: error.message,
      success: false
    };
  }
}

async function runTests() {
  console.log('🚀 Direct Greeting Performance Test (No Auth)\n');
  console.log('=' .repeat(60));
  
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
    'awesome',
    // Also test some non-greetings to compare
    'what properties do you have',
    'I need a house in Manila',
    'how much is a condo'
  ];
  
  console.log('🧪 Testing Messages:\n');
  console.log('=' .repeat(60));
  
  const results = [];
  
  for (const greeting of greetings) {
    const result = await testGreeting(greeting);
    results.push(result);
    
    const isGreeting = greeting.length < 15 && !/properties|house|condo/.test(greeting);
    const emoji = result.responseTime < 500 ? '⚡' : 
                 result.responseTime < 1000 ? '✅' : 
                 result.responseTime < 2000 ? '⚠️' : '❌';
    
    const type = isGreeting ? '[GREETING]' : '[QUERY]   ';
    console.log(`${emoji} ${type} "${greeting}": ${result.responseTime}ms (curl: ${result.curlTime?.toFixed(1)}ms)`);
    
    if (result.response && typeof result.response === 'string') {
      console.log(`   Response: "${result.response.substring(0, 80)}..."`);
    }
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    console.log();
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  // Summary
  console.log('=' .repeat(60));
  console.log('\n📊 Performance Summary:\n');
  
  // Separate greetings from queries
  const greetingResults = results.slice(0, 13);
  const queryResults = results.slice(13);
  
  const greetingAvg = greetingResults.reduce((sum, r) => sum + r.responseTime, 0) / greetingResults.length;
  const queryAvg = queryResults.length > 0 ? 
    queryResults.reduce((sum, r) => sum + r.responseTime, 0) / queryResults.length : 0;
  
  console.log(`   Greeting Average: ${greetingAvg.toFixed(0)}ms`);
  console.log(`   Query Average: ${queryAvg.toFixed(0)}ms`);
  console.log(`   Improvement: ${((queryAvg - greetingAvg) / queryAvg * 100).toFixed(0)}% faster for greetings`);
  
  const under500ms = greetingResults.filter(r => r.responseTime < 500).length;
  const under1s = greetingResults.filter(r => r.responseTime < 1000).length;
  
  console.log(`\n   Greetings under 500ms: ${under500ms}/${greetingResults.length} (${(under500ms/greetingResults.length*100).toFixed(0)}%)`);
  console.log(`   Greetings under 1s: ${under1s}/${greetingResults.length} (${(under1s/greetingResults.length*100).toFixed(0)}%)`);
  
  // Performance assessment
  console.log('\n🎯 Performance Assessment:');
  if (greetingAvg < 500) {
    console.log('   ⚡ EXCELLENT - Greetings are handled instantly!');
    console.log('   ✅ No API calls being made for simple greetings');
  } else if (greetingAvg < 1000) {
    console.log('   ✅ GOOD - Greetings are handled quickly');
    console.log('   ℹ️  Some optimization still possible');
  } else if (greetingAvg < 2000) {
    console.log('   ⚠️ NEEDS IMPROVEMENT - Greetings are still slow');
    console.log('   ⚠️  Likely still making API calls');
  } else {
    console.log('   ❌ POOR - Greetings are taking too long');
    console.log('   ❌ Fix not working as expected');
  }
  
  console.log('\n✨ Test complete!\n');
}

// Check if server is running
exec(`curl -s ${API_URL}/api/health`, (error, stdout) => {
  if (error || !stdout) {
    console.error('❌ Server is not running. Please start it with: node server.js');
    process.exit(1);
  } else {
    console.log('✅ Server is running\n');
    runTests();
  }
});