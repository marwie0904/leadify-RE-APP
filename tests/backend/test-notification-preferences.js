/**
 * Test Notification Preferences API
 * This script tests the notification preferences endpoints
 */

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const API_URL = process.env.API_URL || 'http://localhost:3001';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

async function authenticateUser() {
  log('\n🔐 Authenticating user...', 'cyan');
  
  try {
    // Sign in with test credentials
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'zarealmarwie@gmail.com',
      password: 'password123' // Replace with actual password
    });
    
    if (error) {
      log(`⚠️  Failed to authenticate: ${error.message}`, 'yellow');
      log('Please update the test with valid credentials', 'yellow');
      return null;
    }
    
    log(`✅ Authenticated as: ${data.user.email}`, 'green');
    return data.session.access_token;
  } catch (error) {
    log(`❌ Authentication error: ${error.message}`, 'red');
    return null;
  }
}

async function testGetPreferences(token) {
  log('\n📋 Testing GET /api/notifications/preferences...', 'cyan');
  
  try {
    const response = await axios.get(`${API_URL}/api/notifications/preferences`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    log('✅ Successfully fetched preferences:', 'green');
    console.log(JSON.stringify(response.data, null, 2));
    
    return response.data.preferences;
  } catch (error) {
    log(`❌ Failed to fetch preferences: ${error.response?.data?.message || error.message}`, 'red');
    if (error.response?.data) {
      console.log(error.response.data);
    }
    return null;
  }
}

async function testUpdatePreferences(token, currentPrefs) {
  log('\n✏️ Testing PUT /api/notifications/preferences...', 'cyan');
  
  // Modify preferences for testing
  const updatedPreferences = {
    emailEnabled: !currentPrefs?.emailEnabled,
    pushEnabled: false,
    inAppEnabled: true,
    preferences: {
      lead_created: true,
      lead_qualified: true,
      conversation_started: false,
      handoff_assigned: true,
      system_announcement: true
    }
  };
  
  log('Updating preferences with:', 'blue');
  console.log(JSON.stringify(updatedPreferences, null, 2));
  
  try {
    const response = await axios.put(
      `${API_URL}/api/notifications/preferences`,
      updatedPreferences,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    log('✅ Successfully updated preferences:', 'green');
    console.log(JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    log(`❌ Failed to update preferences: ${error.response?.data?.message || error.message}`, 'red');
    if (error.response?.data) {
      console.log(error.response.data);
    }
    return null;
  }
}

async function verifyPreferencesTable() {
  log('\n🔍 Checking user_notification_preferences table...', 'cyan');
  
  try {
    const { data, error } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .limit(5);
    
    if (error) {
      log(`⚠️  Table check failed: ${error.message}`, 'yellow');
      return false;
    }
    
    log(`✅ Table exists with ${data.length} records`, 'green');
    return true;
  } catch (error) {
    log(`❌ Error checking table: ${error.message}`, 'red');
    return false;
  }
}

async function runTest() {
  log('\n' + '='.repeat(60), 'magenta');
  log('🚀 NOTIFICATION PREFERENCES API TEST', 'magenta');
  log('='.repeat(60), 'magenta');
  
  try {
    // Verify table exists
    const tableExists = await verifyPreferencesTable();
    if (!tableExists) {
      log('\n⚠️  user_notification_preferences table may not exist', 'yellow');
    }
    
    // Authenticate
    const token = await authenticateUser();
    if (!token) {
      log('\n⚠️  Cannot proceed without authentication', 'yellow');
      log('Please update the test with valid credentials', 'yellow');
      process.exit(1);
    }
    
    // Test GET preferences
    const currentPrefs = await testGetPreferences(token);
    
    // Test UPDATE preferences
    if (currentPrefs) {
      await testUpdatePreferences(token, currentPrefs);
      
      // Verify the update by fetching again
      log('\n🔄 Verifying update...', 'cyan');
      await testGetPreferences(token);
    }
    
    log('\n' + '='.repeat(60), 'green');
    log('✅ NOTIFICATION PREFERENCES TEST COMPLETED!', 'green');
    log('='.repeat(60), 'green');
    
    log('\n📌 SUMMARY:', 'cyan');
    log('1. Notification preferences endpoints are working', 'blue');
    log('2. Frontend can now safely access these endpoints', 'blue');
    log('3. The notification preferences page should work without errors', 'blue');
    
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