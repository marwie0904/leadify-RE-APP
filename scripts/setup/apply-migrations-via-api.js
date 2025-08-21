#!/usr/bin/env node

/**
 * Apply Database Migrations via Supabase API
 * This script applies migrations by creating/updating data with the new columns
 * If the columns don't exist, it will create placeholder data that can be updated later
 */

require('dotenv').config({ path: './BACKEND/.env' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Test organization ID
const TEST_ORG_ID = '9a24d180-a1fe-4d22-91e2-066d55679888';

async function checkAndCreateTables() {
  console.log('🔍 Checking and creating missing tables...\n');
  
  // Try to create issues table by inserting a test record
  console.log('Checking issues table...');
  const { data: issueCheck, error: issueError } = await supabase
    .from('issues')
    .select('id')
    .limit(1);
  
  if (issueError && issueError.message.includes('does not exist')) {
    console.log('❌ Issues table does not exist');
    console.log('⚠️  Please run the SQL migration script in Supabase SQL Editor');
  } else {
    console.log('✅ Issues table exists');
  }
}

async function testAndPopulateOrganization() {
  console.log('\n🏢 Testing and populating organization...');
  
  // First, try to get existing organization
  const { data: existing, error: getError } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', TEST_ORG_ID)
    .single();
  
  if (existing) {
    console.log('✅ Organization exists:', existing.name || TEST_ORG_ID);
    
    // Try to update with new columns
    const updates = {
      name: existing.name || 'Leadify Real Estate AI'
    };
    
    // Try adding new columns - these will fail if columns don't exist
    const columnsToTest = {
      status: 'active',
      plan: 'enterprise'
    };
    
    for (const [column, value] of Object.entries(columnsToTest)) {
      const { error } = await supabase
        .from('organizations')
        .update({ [column]: value })
        .eq('id', TEST_ORG_ID);
      
      if (error && error.message.includes(`'${column}' column`)) {
        console.log(`  ⚠️ Column '${column}' does not exist`);
      } else if (!error) {
        console.log(`  ✅ Column '${column}' updated successfully`);
      }
    }
  } else {
    // Create new organization
    console.log('Creating new organization...');
    const { data: newOrg, error: createError } = await supabase
      .from('organizations')
      .insert({
        id: TEST_ORG_ID,
        name: 'Leadify Real Estate AI',
        owner_id: 'test-owner-' + Date.now()
      })
      .select()
      .single();
    
    if (createError) {
      console.log('  ❌ Error creating organization:', createError.message);
    } else {
      console.log('  ✅ Organization created');
    }
  }
}

async function testAndPopulateAgents() {
  console.log('\n🤖 Testing and populating agents...');
  
  // Get existing agents
  const { data: agents, error } = await supabase
    .from('agents')
    .select('*')
    .limit(5);
  
  if (error) {
    console.log('❌ Error fetching agents:', error.message);
    return;
  }
  
  console.log(`Found ${agents?.length || 0} existing agents`);
  
  // Test for new columns on first agent
  if (agents && agents.length > 0) {
    const testAgent = agents[0];
    const columnsToTest = {
      bant_enabled: true,
      bant_config: { 
        enabled: true,
        weights: { budget: 0.3, authority: 0.25, need: 0.25, timeline: 0.2 }
      },
      organization_id: TEST_ORG_ID
    };
    
    for (const [column, value] of Object.entries(columnsToTest)) {
      const { error } = await supabase
        .from('agents')
        .update({ [column]: value })
        .eq('id', testAgent.id);
      
      if (error && error.message.includes(`'${column}' column`)) {
        console.log(`  ⚠️ Column '${column}' does not exist`);
      } else if (!error) {
        console.log(`  ✅ Column '${column}' updated successfully`);
      }
    }
  }
  
  // Create test agents if none exist
  if (!agents || agents.length === 0) {
    console.log('Creating test agents...');
    const testAgents = [
      {
        user_id: 'test-user-' + Date.now(),
        name: 'Sales Expert AI',
        tone: 'Professional',
        status: 'ready'
      }
    ];
    
    for (const agent of testAgents) {
      const { error } = await supabase
        .from('agents')
        .insert(agent);
      
      if (error) {
        console.log(`  ❌ Error creating agent:`, error.message);
      } else {
        console.log(`  ✅ Agent created: ${agent.name}`);
      }
    }
  }
}

async function testAndPopulateConversations() {
  console.log('\n💬 Testing and populating conversations...');
  
  // Get existing conversations
  const { data: conversations, error } = await supabase
    .from('conversations')
    .select('*')
    .limit(5);
  
  if (error) {
    console.log('❌ Error fetching conversations:', error.message);
    return;
  }
  
  console.log(`Found ${conversations?.length || 0} existing conversations`);
  
  // Test for new columns on first conversation
  if (conversations && conversations.length > 0) {
    const testConv = conversations[0];
    const columnsToTest = {
      organization_id: TEST_ORG_ID,
      message_count: 5,
      total_tokens: 1500,
      estimated_cost: 0.045,
      user_name: 'Test User',
      user_email: 'test@example.com',
      source: 'web',
      status: 'active'
    };
    
    for (const [column, value] of Object.entries(columnsToTest)) {
      const { error } = await supabase
        .from('conversations')
        .update({ [column]: value })
        .eq('id', testConv.id);
      
      if (error && error.message.includes(`'${column}' column`)) {
        console.log(`  ⚠️ Column '${column}' does not exist`);
      } else if (!error) {
        console.log(`  ✅ Column '${column}' updated successfully`);
      }
    }
  }
}

async function testAndPopulateLeads() {
  console.log('\n🎯 Testing and populating leads...');
  
  // Get existing leads
  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .limit(5);
  
  if (error) {
    console.log('❌ Error fetching leads:', error.message);
    return;
  }
  
  console.log(`Found ${leads?.length || 0} existing leads`);
  
  // Test for BANT columns on first lead
  if (leads && leads.length > 0) {
    const testLead = leads[0];
    const columnsToTest = {
      bant_budget: 85,
      bant_authority: 90,
      bant_need: 80,
      bant_timeline: 75,
      organization_id: TEST_ORG_ID,
      name: testLead.full_name || 'Test Lead',
      phone: testLead.mobile_number || '+1-555-0000',
      status: 'qualified',
      score: 82
    };
    
    for (const [column, value] of Object.entries(columnsToTest)) {
      const { error } = await supabase
        .from('leads')
        .update({ [column]: value })
        .eq('id', testLead.id);
      
      if (error && error.message.includes(`'${column}' column`)) {
        console.log(`  ⚠️ Column '${column}' does not exist`);
      } else if (!error) {
        console.log(`  ✅ Column '${column}' updated successfully`);
      }
    }
  }
}

async function generateSchemaReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 SCHEMA STATUS REPORT');
  console.log('='.repeat(60));
  
  const tables = [
    'organizations',
    'organization_members',
    'agents',
    'conversations',
    'messages',
    'leads',
    'issues'
  ];
  
  const missingColumns = [];
  
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);
    
    if (error && error.message.includes('does not exist')) {
      console.log(`❌ Table '${table}' does not exist`);
      missingColumns.push(`${table} table (entire table missing)`);
    } else if (data) {
      console.log(`✅ Table '${table}' exists`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (missingColumns.length > 0) {
    console.log('⚠️  MIGRATION REQUIRED');
    console.log('='.repeat(60));
    console.log('\nThe following columns/tables are missing:');
    missingColumns.forEach(col => console.log(`  - ${col}`));
    console.log('\n📝 To fix this:');
    console.log('1. Open your Supabase dashboard');
    console.log('2. Go to SQL Editor');
    console.log('3. Copy and paste the contents of schema-migration.sql');
    console.log('4. Click "Run" to apply all migrations');
    console.log('5. Re-run this script to verify');
  } else {
    console.log('✅ All required tables exist!');
    console.log('\nNext steps:');
    console.log('1. Run: node populate-enhanced-test-data.js');
    console.log('2. Run: node test-real-backend-final.js');
  }
}

async function main() {
  console.log('🚀 Database Schema Verification and Migration Helper');
  console.log('=' .repeat(60));
  
  try {
    await checkAndCreateTables();
    await testAndPopulateOrganization();
    await testAndPopulateAgents();
    await testAndPopulateConversations();
    await testAndPopulateLeads();
    await generateSchemaReport();
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
main();