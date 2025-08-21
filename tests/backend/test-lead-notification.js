/**
 * Test Lead Creation and Notification
 * This script simulates lead creation with automatic assignment to trigger email notifications
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

async function getOrganizationAndAgent() {
  log('\n🔍 Finding organization and agent for testing...', 'cyan');
  
  try {
    // Get the first organization
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .limit(1);
    
    if (orgError || !orgs || orgs.length === 0) {
      throw new Error('No organizations found. Please create an organization first.');
    }
    
    const organization = orgs[0];
    log(`✅ Found organization: ${organization.name} (${organization.id})`, 'green');
    
    // Get a human agent from this organization (preferably you)
    const { data: members, error: memberError } = await supabase
      .from('organization_members')
      .select('user_id, role')
      .eq('organization_id', organization.id)
      .in('role', ['admin', 'agent', 'moderator']);
    
    if (memberError || !members || members.length === 0) {
      throw new Error('No agents found in organization. Please add members first.');
    }
    
    // Get user details for the first agent using RPC function
    const { data: userData } = await supabase
      .rpc('get_user_by_id', { user_id: members[0].user_id });
    
    const user = userData && userData.length > 0 ? userData[0] : null;
    
    const agent = {
      id: members[0].user_id,
      email: user?.email,
      name: user?.raw_user_meta_data?.name || user?.raw_user_meta_data?.full_name || user?.email,
      role: members[0].role
    };
    
    log(`✅ Found agent: ${agent.name} (${agent.email})`, 'green');
    log(`  Role: ${agent.role}`, 'blue');
    
    return { organization, agent };
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    throw error;
  }
}

async function createTestLead(organizationId, agentId) {
  log('\n📝 Creating test lead...', 'cyan');
  
  const timestamp = Date.now();
  const leadData = {
    name: `Test Lead ${timestamp}`,
    email: `testlead${timestamp}@example.com`,
    phone: `555-${Math.floor(Math.random() * 10000000).toString().padStart(7, '0')}`,
    organizationId: organizationId,
    agentId: agentId, // Specify agent to ensure they get the notification
    lead_classification: 'Hot', // Hot lead to ensure it's high priority
    lead_score: 95,
    budget_range: 'high', // Must be 'high', 'medium', or 'low'
    timeline: 'Within 30 days',
    need: 'residence', // Must be 'residence', 'investment', or 'resale'
    authority: 'individual', // Must be 'individual' or 'shared'
    source: 'website'
  };
  
  log('Lead details:', 'blue');
  console.log(leadData);
  
  try {
    const response = await axios.post(`${API_URL}/api/leads`, leadData);
    
    if (response.status === 201) {
      log(`\n✅ Lead created successfully!`, 'green');
      log(`  Lead ID: ${response.data.id}`, 'green');
      log(`  Assigned to agent: ${response.data.agent_id}`, 'green');
      return response.data;
    }
  } catch (error) {
    log(`❌ Failed to create lead: ${error.response?.data?.message || error.message}`, 'red');
    throw error;
  }
}

async function checkNotificationStatus() {
  log('\n📧 Checking notification system status...', 'cyan');
  
  // Check if Resend is configured
  if (!process.env.RESEND_API_KEY) {
    log('⚠️  RESEND_API_KEY not configured - email notifications will not be sent', 'yellow');
    log('  Please add RESEND_API_KEY to your .env file', 'yellow');
    return false;
  }
  
  if (!process.env.RESEND_FROM_EMAIL) {
    log('⚠️  RESEND_FROM_EMAIL not configured - using default', 'yellow');
    log('  Please add RESEND_FROM_EMAIL to your .env file for proper configuration', 'yellow');
  }
  
  log(`✅ Resend configured`, 'green');
  log(`  From: ${process.env.RESEND_FROM_EMAIL || 'noreply@realestate-ai.com'}`, 'blue');
  log(`  API Key: ${process.env.RESEND_API_KEY.substring(0, 10)}...`, 'blue');
  
  return true;
}

async function checkInAppNotifications(agentId) {
  log('\n📱 Checking in-app notifications...', 'cyan');
  
  try {
    // Check notifications table for the agent
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', agentId)
      .eq('type', 'lead_assigned')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      log(`⚠️  Could not check in-app notifications: ${error.message}`, 'yellow');
      return;
    }
    
    if (notifications && notifications.length > 0) {
      log(`✅ Found ${notifications.length} recent lead assignment notifications`, 'green');
      
      const latest = notifications[0];
      log('\nLatest notification:', 'blue');
      log(`  Title: ${latest.title}`, 'blue');
      log(`  Message: ${latest.message}`, 'blue');
      log(`  Created: ${new Date(latest.created_at).toLocaleString()}`, 'blue');
      log(`  Read: ${latest.read ? 'Yes' : 'No'}`, 'blue');
      if (latest.link) {
        log(`  Link: ${latest.link}`, 'blue');
      }
    } else {
      log('ℹ️  No recent lead assignment notifications found in database', 'yellow');
    }
  } catch (error) {
    log(`⚠️  Error checking in-app notifications: ${error.message}`, 'yellow');
  }
}

async function cleanupTestLead(leadId) {
  if (!leadId) return;
  
  log('\n🧹 Cleaning up test lead...', 'cyan');
  
  try {
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', leadId);
    
    if (!error) {
      log('✅ Test lead cleaned up', 'green');
    }
  } catch (error) {
    log(`⚠️  Could not clean up test lead: ${error.message}`, 'yellow');
  }
}

async function runTest() {
  log('\n' + '='.repeat(60), 'magenta');
  log('🚀 LEAD CREATION & NOTIFICATION TEST', 'magenta');
  log('='.repeat(60), 'magenta');
  
  let createdLead = null;
  
  try {
    // Check notification system status
    const emailEnabled = await checkNotificationStatus();
    
    // Get organization and agent
    const { organization, agent } = await getOrganizationAndAgent();
    
    log('\n' + '='.repeat(60), 'cyan');
    log('📋 TEST SUMMARY', 'cyan');
    log('='.repeat(60), 'cyan');
    log(`Organization: ${organization.name}`, 'blue');
    log(`Agent: ${agent.name} (${agent.email})`, 'blue');
    log(`Email Notifications: ${emailEnabled ? 'ENABLED ✅' : 'DISABLED ⚠️'}`, emailEnabled ? 'green' : 'yellow');
    
    // Create the test lead
    log('\n' + '='.repeat(60), 'cyan');
    createdLead = await createTestLead(organization.id, agent.id);
    
    // Wait a moment for notifications to be processed
    log('\n⏳ Waiting 3 seconds for notifications to be processed...', 'yellow');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check results
    log('\n' + '='.repeat(60), 'magenta');
    log('📊 NOTIFICATION RESULTS', 'magenta');
    log('='.repeat(60), 'magenta');
    
    if (emailEnabled) {
      log('\n📧 EMAIL NOTIFICATION:', 'cyan');
      log(`✅ Email should have been sent to: ${agent.email}`, 'green');
      log('  Subject: 📋 New Lead Assigned: ' + createdLead.full_name, 'blue');
      log('  Please check your email inbox (and spam folder)', 'yellow');
      log('  The email will be from: ' + (process.env.RESEND_FROM_EMAIL || 'noreply@realestate-ai.com'), 'blue');
    } else {
      log('\n📧 EMAIL NOTIFICATION:', 'cyan');
      log('⚠️  Email not sent (Resend not configured)', 'yellow');
    }
    
    // Check in-app notifications
    await checkInAppNotifications(agent.id);
    
    log('\n' + '='.repeat(60), 'green');
    log('✅ TEST COMPLETED SUCCESSFULLY!', 'green');
    log('='.repeat(60), 'green');
    
    log('\n📌 NEXT STEPS:', 'cyan');
    if (emailEnabled) {
      log('1. Check your email inbox for the notification', 'blue');
      log('2. If not in inbox, check spam/junk folder', 'blue');
      log('3. Click the link in the email to view the lead', 'blue');
    } else {
      log('1. Configure RESEND_API_KEY in .env to enable emails', 'blue');
      log('2. Configure RESEND_FROM_EMAIL in .env', 'blue');
      log('3. Run this test again to receive email notifications', 'blue');
    }
    
    // Cleanup
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question('\nPress Enter to clean up test lead and exit...', () => {
      cleanupTestLead(createdLead?.id);
      rl.close();
      process.exit(0);
    });
    
  } catch (error) {
    log('\n' + '='.repeat(60), 'red');
    log('❌ TEST FAILED', 'red');
    log('='.repeat(60), 'red');
    log(`Error: ${error.message}`, 'red');
    console.error(error);
    
    if (createdLead) {
      await cleanupTestLead(createdLead.id);
    }
    
    process.exit(1);
  }
}

// Run the test
runTest().catch(console.error);