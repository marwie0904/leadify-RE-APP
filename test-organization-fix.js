#!/usr/bin/env node

/**
 * Test script to verify the organization ID fix
 * 
 * This script tests that:
 * 1. The /api/settings/profile endpoint returns organization_id
 * 2. The agents page can properly fetch agents
 */

const fetch = require('node-fetch');

// Configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';
const TEST_JWT = process.env.TEST_JWT || 'your-test-jwt-token';

async function testAPI(endpoint) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${TEST_JWT}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = response.ok || response.status === 304 ? await response.json() : null;
    
    return {
      endpoint,
      status: response.status,
      ok: response.ok || response.status === 304,
      data
    };
  } catch (error) {
    return {
      endpoint,
      error: error.message
    };
  }
}

async function runTests() {
  console.log('🔍 Testing Organization ID Fix\n');
  console.log(`API URL: ${API_BASE_URL}`);
  console.log(`Using JWT: ${TEST_JWT.substring(0, 20)}...\n`);
  
  // Test 1: Profile endpoint
  console.log('1️⃣ Testing /api/settings/profile endpoint...');
  const profileResult = await testAPI('/api/settings/profile');
  
  if (profileResult.ok) {
    console.log('✅ Profile endpoint responded successfully');
    console.log('📊 Profile data:', JSON.stringify(profileResult.data, null, 2));
    
    // Check for organization fields
    if (profileResult.data) {
      const hasOrgId = !!profileResult.data.organization_id;
      const hasOrgIdCamelCase = !!profileResult.data.organizationId;
      const hasOrgFlag = profileResult.data.hasOrganization;
      
      console.log('\n🔍 Organization fields check:');
      console.log(`   - organization_id: ${hasOrgId ? '✅ Present' : '❌ Missing'} (${profileResult.data.organization_id || 'null'})`);
      console.log(`   - organizationId: ${hasOrgIdCamelCase ? '✅ Present' : '❌ Missing'} (${profileResult.data.organizationId || 'null'})`);
      console.log(`   - hasOrganization: ${hasOrgFlag !== undefined ? '✅ Present' : '❌ Missing'} (${hasOrgFlag})`);
      
      if (hasOrgFlag && (!hasOrgId || profileResult.data.organization_id === '')) {
        console.log('\n⚠️  ISSUE: hasOrganization is true but organization_id is empty!');
      } else if (hasOrgFlag && hasOrgId) {
        console.log('\n✅ FIX VERIFIED: Organization ID is properly populated!');
      }
    }
  } else {
    console.log('❌ Profile endpoint failed:', profileResult.status, profileResult.error);
  }
  
  // Test 2: Agents endpoint
  console.log('\n\n2️⃣ Testing /api/agents endpoint...');
  const agentsResult = await testAPI('/api/agents');
  
  if (agentsResult.ok) {
    console.log('✅ Agents endpoint responded successfully');
    const agents = Array.isArray(agentsResult.data) ? agentsResult.data : agentsResult.data?.agents || [];
    console.log(`📊 Found ${agents.length} agent(s)`);
    
    if (agents.length > 0) {
      console.log('\nAgent details:');
      agents.forEach((agent, index) => {
        console.log(`   ${index + 1}. ${agent.name} (ID: ${agent.id})`);
      });
    }
  } else {
    console.log('❌ Agents endpoint failed:', agentsResult.status, agentsResult.error);
  }
  
  // Test 3: Organization members endpoint
  console.log('\n\n3️⃣ Testing /api/organization/members endpoint...');
  const membersResult = await testAPI('/api/organization/members');
  
  if (membersResult.ok) {
    console.log('✅ Organization members endpoint responded successfully');
    const members = Array.isArray(membersResult.data) ? membersResult.data : membersResult.data?.members || [];
    console.log(`📊 Organization has ${members.length} member(s)`);
  } else if (membersResult.status === 403) {
    console.log('⚠️  Access denied to organization members (not an admin)');
  } else if (membersResult.status === 404) {
    console.log('❌ User not in any organization');
  } else {
    console.log('❌ Organization members endpoint failed:', membersResult.status);
  }
  
  // Summary
  console.log('\n\n📋 Summary:');
  if (profileResult.ok && profileResult.data?.organization_id && profileResult.data.organization_id !== '') {
    console.log('✅ Organization ID fix is working correctly!');
    console.log('   - Backend returns organization_id in profile');
    console.log('   - Frontend should now properly display agents');
    console.log('\n💡 Next step: Refresh your browser and check if agents are displayed');
  } else {
    console.log('❌ Organization ID issue persists');
    console.log('   - Check backend logs for errors');
    console.log('   - Verify user has organization membership in database');
  }
}

// Check for JWT token
if (!TEST_JWT || TEST_JWT === 'your-test-jwt-token') {
  console.error('❌ Please provide a valid JWT token');
  console.log('\nTo get your JWT token:');
  console.log('1. Open browser DevTools (F12)');
  console.log('2. Go to Network tab');
  console.log('3. Look for any API request');
  console.log('4. Copy the Authorization header value (without "Bearer ")');
  console.log('\nUsage:');
  console.log('TEST_JWT="your-jwt-token" node test-organization-fix.js\n');
  process.exit(1);
}

// Run tests
runTests().catch(console.error);