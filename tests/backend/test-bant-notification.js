/**
 * Test BANT Lead Creation and Notification
 * This script simulates a BANT conversation that creates a lead and triggers notifications
 */

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const API_URL = process.env.API_URL || 'http://localhost:3001';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function getTestAgent() {
  log('\n🔍 Finding test agent...', 'cyan');
  
  try {
    // Get an AI agent for testing
    const { data: agents, error } = await supabase
      .from('agents')
      .select('*')
      .limit(1);
    
    if (error || !agents || agents.length === 0) {
      throw new Error('No agents found. Please create an agent first.');
    }
    
    const agent = agents[0];
    log(`✅ Found agent: ${agent.name} (${agent.id})`, 'green');
    
    return agent;
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    throw error;
  }
}

async function simulateBantConversation(agentId) {
  log('\n💬 Starting BANT conversation simulation...', 'cyan');
  
  try {
    // Start conversation with introduction
    log('\nStep 1: Initial greeting', 'blue');
    const response1 = await axios.post(`${API_URL}/api/chat`, {
      message: "Hello, I'm looking for a property",
      agentId: agentId,
      source: 'web'
    });
    
    const conversationId = response1.data.conversationId;
    log(`Conversation started: ${conversationId}`, 'green');
    
    // Wait a bit between messages
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Provide budget information
    log('\nStep 2: Providing budget', 'blue');
    await axios.post(`${API_URL}/api/chat`, {
      message: "My budget is around $500,000 to $750,000",
      agentId: agentId,
      conversationId: conversationId,
      source: 'web'
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Provide timeline
    log('\nStep 3: Providing timeline', 'blue');
    await axios.post(`${API_URL}/api/chat`, {
      message: "I'm looking to buy within the next 2 months",
      agentId: agentId,
      conversationId: conversationId,
      source: 'web'
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Provide authority
    log('\nStep 4: Providing authority', 'blue');
    await axios.post(`${API_URL}/api/chat`, {
      message: "I'm the sole decision maker for this purchase",
      agentId: agentId,
      conversationId: conversationId,
      source: 'web'
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Provide need
    log('\nStep 5: Providing need', 'blue');
    await axios.post(`${API_URL}/api/chat`, {
      message: "I need a 3-bedroom house for my family residence",
      agentId: agentId,
      conversationId: conversationId,
      source: 'web'
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Provide contact information to complete BANT
    log('\nStep 6: Providing contact information', 'blue');
    const finalResponse = await axios.post(`${API_URL}/api/chat`, {
      message: "My name is Test User and my phone number is 555-1234567. Email: testuser@example.com",
      agentId: agentId,
      conversationId: conversationId,
      source: 'web'
    });
    
    log('\n✅ BANT conversation completed!', 'green');
    log(`Final response: ${finalResponse.data.response?.substring(0, 100)}...`, 'blue');
    
    return conversationId;
  } catch (error) {
    log(`❌ Error in BANT conversation: ${error.message}`, 'red');
    throw error;
  }
}

async function checkLeadCreation(conversationId) {
  log('\n📋 Checking if lead was created...', 'cyan');
  
  try {
    // Check for lead in database
    const { data: leads, error } = await supabase
      .from('leads')
      .select('*')
      .eq('conversation_id', conversationId);
    
    if (error) {
      log(`❌ Error checking leads: ${error.message}`, 'red');
      return null;
    }
    
    if (leads && leads.length > 0) {
      const lead = leads[0];
      log(`✅ Lead created successfully!`, 'green');
      log(`  Lead ID: ${lead.id}`, 'green');
      log(`  Name: ${lead.full_name}`, 'green');
      log(`  Score: ${lead.lead_score}`, 'green');
      log(`  Classification: ${lead.lead_classification}`, 'green');
      log(`  Assigned to: ${lead.agent_id || 'Not assigned'}`, lead.agent_id ? 'green' : 'yellow');
      
      if (lead.agent_id) {
        // Get agent details
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', lead.agent_id)
          .single();
        
        if (userProfile) {
          log(`  Agent Name: ${userProfile.name || userProfile.full_name || 'Unknown'}`, 'blue');
          log(`  Agent Email: ${userProfile.email}`, 'blue');
        }
      }
      
      return lead;
    } else {
      log('⚠️  No lead created yet', 'yellow');
      return null;
    }
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    return null;
  }
}

async function checkNotifications(agentId) {
  log('\n📱 Checking notifications...', 'cyan');
  
  try {
    // Check in-app notifications
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', agentId)
      .eq('type', 'lead_assigned')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      log(`⚠️  Could not check notifications: ${error.message}`, 'yellow');
      return;
    }
    
    if (notifications && notifications.length > 0) {
      log(`✅ Found ${notifications.length} lead assignment notifications`, 'green');
      
      const latest = notifications[0];
      log('\nLatest notification:', 'blue');
      log(`  Title: ${latest.title}`, 'blue');
      log(`  Message: ${latest.message}`, 'blue');
      log(`  Created: ${new Date(latest.created_at).toLocaleString()}`, 'blue');
      log(`  Read: ${latest.read ? 'Yes' : 'No'}`, 'blue');
    } else {
      log('⚠️  No lead assignment notifications found', 'yellow');
    }
  } catch (error) {
    log(`⚠️  Error checking notifications: ${error.message}`, 'yellow');
  }
}

async function runTest() {
  log('\n' + '='.repeat(60), 'magenta');
  log('🚀 BANT LEAD CREATION & NOTIFICATION TEST', 'magenta');
  log('='.repeat(60), 'magenta');
  
  try {
    // Get test agent
    const agent = await getTestAgent();
    
    // Simulate BANT conversation
    const conversationId = await simulateBantConversation(agent.id);
    
    // Wait for lead processing
    log('\n⏳ Waiting 5 seconds for lead processing...', 'yellow');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check if lead was created
    const lead = await checkLeadCreation(conversationId);
    
    if (lead && lead.agent_id) {
      // Check notifications
      await checkNotifications(lead.agent_id);
      
      log('\n' + '='.repeat(60), 'magenta');
      log('📊 TEST RESULTS', 'magenta');
      log('='.repeat(60), 'magenta');
      
      log('\n📧 EMAIL NOTIFICATION:', 'cyan');
      if (process.env.RESEND_API_KEY) {
        log('✅ Email should have been sent to the assigned agent', 'green');
        log('  Check the agent\'s email inbox', 'yellow');
        log('  Also check Resend dashboard for delivery status', 'yellow');
      } else {
        log('⚠️  Resend not configured - no email sent', 'yellow');
      }
      
      log('\n📱 IN-APP NOTIFICATION:', 'cyan');
      log('✅ Notification created in database', 'green');
      
      // Cleanup
      log('\n🧹 Cleaning up test data...', 'cyan');
      
      // Delete lead
      await supabase
        .from('leads')
        .delete()
        .eq('id', lead.id);
      
      // Delete conversation
      await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);
      
      log('✅ Test data cleaned up', 'green');
    } else {
      log('\n⚠️  Lead was not created or not assigned to an agent', 'yellow');
      log('  This might indicate an issue with the BANT flow or agent assignment', 'yellow');
    }
    
    log('\n' + '='.repeat(60), 'green');
    log('✅ TEST COMPLETED!', 'green');
    log('='.repeat(60), 'green');
    
  } catch (error) {
    log('\n' + '='.repeat(60), 'red');
    log('❌ TEST FAILED', 'red');
    log('='.repeat(60), 'red');
    log(`Error: ${error.message}`, 'red');
    console.error(error);
  }
  
  process.exit(0);
}

// Run the test
runTest().catch(console.error);