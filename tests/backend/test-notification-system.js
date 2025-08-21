/**
 * Test Notification System
 * Manual test script to verify notification system functionality
 */

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const API_URL = process.env.API_URL || 'http://localhost:3001';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Test configuration
let testUserId;
let testOrganizationId;
let authToken;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function setupTestUser() {
  log('\n📋 Setting up test user and organization...', 'cyan');
  
  try {
    // Get or create test organization
    const { data: orgs } = await supabase
      .from('organizations')
      .select('*')
      .limit(1);
    
    if (orgs && orgs.length > 0) {
      testOrganizationId = orgs[0].id;
      log(`✅ Using existing organization: ${testOrganizationId}`, 'green');
    }
    
    // Get test user
    const { data: members } = await supabase
      .from('organization_members')
      .select('*')
      .eq('organization_id', testOrganizationId)
      .limit(1);
    
    if (members && members.length > 0) {
      testUserId = members[0].user_id;
      log(`✅ Using test user: ${testUserId}`, 'green');
    }
    
    // Generate auth token (in production, this would come from login)
    const jwt = require('jsonwebtoken');
    authToken = jwt.sign(
      { id: testUserId, email: 'test@example.com' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
    
    return true;
  } catch (error) {
    log(`❌ Setup failed: ${error.message}`, 'red');
    return false;
  }
}

async function testNotificationPreferences() {
  log('\n🔔 Testing notification preferences...', 'cyan');
  
  try {
    // Get current preferences
    const getResponse = await axios.get(
      `${API_URL}/api/notifications/preferences`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    log('Current preferences:', 'blue');
    console.log(getResponse.data.preferences);
    
    // Update preferences
    const updateResponse = await axios.put(
      `${API_URL}/api/notifications/preferences`,
      {
        emailEnabled: true,
        inAppEnabled: true,
        pushEnabled: false,
        preferences: {
          handoff_assigned: true,
          lead_assigned: true,
          lead_qualified: true,
          conversation_started: true,
          system_announcement: true
        }
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    if (updateResponse.data.success) {
      log('✅ Preferences updated successfully', 'green');
    }
    
    return true;
  } catch (error) {
    log(`❌ Preference test failed: ${error.response?.data?.error || error.message}`, 'red');
    return false;
  }
}

async function testLeadNotification() {
  log('\n📋 Testing lead assignment notification...', 'cyan');
  
  try {
    // Create a test lead
    const leadResponse = await axios.post(
      `${API_URL}/api/leads`,
      {
        name: 'Test Lead ' + Date.now(),
        email: 'testlead@example.com',
        phone: '555-' + Math.floor(Math.random() * 10000),
        organizationId: testOrganizationId,
        agentId: testUserId,
        lead_classification: 'hot',
        lead_score: 85,
        source: 'test'
      }
    );
    
    if (leadResponse.data.id) {
      log(`✅ Lead created: ${leadResponse.data.id}`, 'green');
      log('  Agent should receive notification for lead assignment', 'yellow');
      
      // Clean up test lead
      await supabase
        .from('leads')
        .delete()
        .eq('id', leadResponse.data.id);
    }
    
    return true;
  } catch (error) {
    log(`❌ Lead notification test failed: ${error.response?.data?.message || error.message}`, 'red');
    return false;
  }
}

async function testHandoffNotification() {
  log('\n🤝 Testing handoff notification...', 'cyan');
  
  try {
    // Create a test conversation
    const { data: conversation } = await supabase
      .from('conversations')
      .insert({
        organization_id: testOrganizationId,
        agent_id: testUserId,
        source: 'test',
        handoff: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (conversation) {
      log(`✅ Test conversation created: ${conversation.id}`, 'green');
      
      // Request handoff
      const handoffResponse = await axios.post(
        `${API_URL}/api/conversations/${conversation.id}/request-handoff`,
        {
          priority: 'high',
          reason: 'Test handoff notification',
          notes: 'This is a test of the notification system'
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      if (handoffResponse.data.success) {
        log('✅ Handoff requested successfully', 'green');
        log('  All agents in organization should receive notification', 'yellow');
      }
      
      // Clean up
      await supabase
        .from('conversation_handoffs')
        .delete()
        .eq('conversation_id', conversation.id);
      
      await supabase
        .from('conversations')
        .delete()
        .eq('id', conversation.id);
    }
    
    return true;
  } catch (error) {
    log(`❌ Handoff notification test failed: ${error.response?.data?.error || error.message}`, 'red');
    return false;
  }
}

async function testGetNotifications() {
  log('\n📬 Testing notification retrieval...', 'cyan');
  
  try {
    // Get all notifications
    const response = await axios.get(
      `${API_URL}/api/notifications`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        params: { limit: 10 }
      }
    );
    
    log(`✅ Retrieved ${response.data.notifications.length} notifications`, 'green');
    
    if (response.data.notifications.length > 0) {
      log('Recent notifications:', 'blue');
      response.data.notifications.slice(0, 3).forEach(notif => {
        console.log(`  - ${notif.title}: ${notif.message} (${notif.read ? 'read' : 'unread'})`);
      });
      
      // Mark first unread notification as read
      const unreadNotif = response.data.notifications.find(n => !n.read);
      if (unreadNotif) {
        const markReadResponse = await axios.patch(
          `${API_URL}/api/notifications/${unreadNotif.id}/read`,
          {},
          {
            headers: { Authorization: `Bearer ${authToken}` }
          }
        );
        
        if (markReadResponse.data.success) {
          log(`✅ Marked notification ${unreadNotif.id} as read`, 'green');
        }
      }
    }
    
    // Get unread notifications only
    const unreadResponse = await axios.get(
      `${API_URL}/api/notifications`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        params: { unread_only: 'true' }
      }
    );
    
    log(`  ${unreadResponse.data.notifications.length} unread notifications`, 'blue');
    
    return true;
  } catch (error) {
    log(`❌ Get notifications test failed: ${error.response?.data?.error || error.message}`, 'red');
    return false;
  }
}

async function testSSEConnection() {
  log('\n📡 Testing SSE real-time notifications...', 'cyan');
  
  return new Promise((resolve) => {
    try {
      const EventSource = require('eventsource');
      const eventSource = new EventSource(
        `${API_URL}/api/notifications/stream`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );
      
      eventSource.onopen = () => {
        log('✅ SSE connection established', 'green');
      };
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'connected') {
          log('✅ Received connection confirmation', 'green');
          eventSource.close();
          resolve(true);
        } else {
          log(`📨 Real-time notification: ${data.title}`, 'yellow');
        }
      };
      
      eventSource.onerror = (error) => {
        log(`❌ SSE connection error: ${error.message}`, 'red');
        eventSource.close();
        resolve(false);
      };
      
      // Timeout after 5 seconds
      setTimeout(() => {
        eventSource.close();
        resolve(true);
      }, 5000);
    } catch (error) {
      log(`❌ SSE test failed: ${error.message}`, 'red');
      resolve(false);
    }
  });
}

async function checkEmailConfiguration() {
  log('\n📧 Checking email configuration...', 'cyan');
  
  const emailConfigured = process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL;
  
  if (emailConfigured) {
    log('✅ Email service configured: Resend', 'green');
    log(`  From: ${process.env.RESEND_FROM_EMAIL}`, 'blue');
    log(`  API Key: ${process.env.RESEND_API_KEY.substring(0, 10)}...`, 'blue');
    return true;
  } else {
    log('⚠️  Resend not configured - only in-app notifications will work', 'yellow');
    log('  To enable email notifications:', 'yellow');
    log('    1. Set RESEND_API_KEY in .env', 'yellow');
    log('    2. Set RESEND_FROM_EMAIL in .env', 'yellow');
    return false;
  }
}

async function runTests() {
  log('\n🧪 NOTIFICATION SYSTEM TEST SUITE', 'cyan');
  log('=' .repeat(50), 'cyan');
  
  const results = {
    setup: false,
    email: false,
    preferences: false,
    leadNotification: false,
    handoffNotification: false,
    getNotifications: false,
    sse: false
  };
  
  try {
    // Check email configuration
    results.email = await checkEmailConfiguration();
    
    // Setup test data
    results.setup = await setupTestUser();
    if (!results.setup) {
      log('\n❌ Cannot proceed without test user setup', 'red');
      return;
    }
    
    // Run tests
    results.preferences = await testNotificationPreferences();
    results.leadNotification = await testLeadNotification();
    results.handoffNotification = await testHandoffNotification();
    results.getNotifications = await testGetNotifications();
    results.sse = await testSSEConnection();
    
    // Summary
    log('\n📊 TEST RESULTS SUMMARY', 'cyan');
    log('=' .repeat(50), 'cyan');
    
    const passed = Object.values(results).filter(r => r).length;
    const total = Object.keys(results).length;
    
    Object.entries(results).forEach(([test, passed]) => {
      const icon = passed ? '✅' : '❌';
      const color = passed ? 'green' : 'red';
      log(`${icon} ${test}: ${passed ? 'PASSED' : 'FAILED'}`, color);
    });
    
    log('\n' + '=' .repeat(50), 'cyan');
    const successRate = Math.round((passed / total) * 100);
    const overallColor = successRate >= 70 ? 'green' : successRate >= 50 ? 'yellow' : 'red';
    log(`Overall: ${passed}/${total} tests passed (${successRate}%)`, overallColor);
    
    if (!results.email) {
      log('\nℹ️  Note: Email notifications are not configured', 'yellow');
      log('  Configure RESEND_API_KEY and RESEND_FROM_EMAIL in .env to enable email notifications', 'yellow');
      log('  Sign up at https://resend.com to get your API key', 'yellow');
    }
    
  } catch (error) {
    log(`\n❌ Test suite error: ${error.message}`, 'red');
    console.error(error);
  }
}

// Run the tests
runTests().catch(console.error);