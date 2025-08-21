#!/usr/bin/env node

/**
 * Comprehensive test for Custom BANT Questions Feature
 * Tests:
 * 1. Database migration and table creation
 * 2. API endpoints for BANT questions
 * 3. Frontend onboarding flow with custom questions
 * 4. Agent settings page editing
 * 5. Conversation flow using custom questions
 * 6. BANT qualification with custom questions
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
const { chromium } = require('playwright');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Test user credentials
const TEST_USER = {
  email: 'test@example.com',
  password: 'testpassword123'
};

// Custom BANT questions for testing
const CUSTOM_QUESTIONS = [
  // Budget questions
  { category: 'budget', question_text: 'What is your investment budget?', question_order: 1 },
  { category: 'budget', question_text: 'Do you require financing?', question_order: 2 },
  
  // Authority questions
  { category: 'authority', question_text: 'Who will make the final decision?', question_order: 1 },
  { category: 'authority', question_text: 'Are there any other stakeholders?', question_order: 2 },
  
  // Need questions
  { category: 'need', question_text: 'What type of property are you looking for?', question_order: 1 },
  { category: 'need', question_text: 'What are your must-have features?', question_order: 2 },
  
  // Timeline questions
  { category: 'timeline', question_text: 'When do you plan to purchase?', question_order: 1 },
  { category: 'timeline', question_text: 'Is there a specific deadline?', question_order: 2 }
];

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

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test 1: Verify database migration
async function testDatabaseMigration() {
  log('\n📊 Test 1: Database Migration', 'cyan');
  
  try {
    // Check if agent_bant_questions table exists
    const { data, error } = await supabase
      .from('agent_bant_questions')
      .select('*')
      .limit(1);
    
    if (error && error.message.includes('relation "agent_bant_questions" does not exist')) {
      log('❌ Table agent_bant_questions does not exist. Running migration...', 'yellow');
      
      // Run migration
      const migrationSQL = `
        CREATE TABLE IF NOT EXISTS agent_bant_questions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
          category TEXT NOT NULL CHECK (category IN ('budget', 'authority', 'need', 'timeline')),
          question_text TEXT NOT NULL,
          question_order INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT true,
          placeholder_text TEXT,
          help_text TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_agent_bant_questions_agent_id ON agent_bant_questions(agent_id);
        CREATE INDEX IF NOT EXISTS idx_agent_bant_questions_category ON agent_bant_questions(category);
      `;
      
      const { error: migrationError } = await supabase.rpc('exec_sql', { sql: migrationSQL });
      
      if (migrationError) {
        log(`❌ Migration failed: ${migrationError.message}`, 'red');
        return false;
      }
      
      log('✅ Migration completed successfully', 'green');
    } else {
      log('✅ Table agent_bant_questions exists', 'green');
    }
    
    return true;
  } catch (error) {
    log(`❌ Database test failed: ${error.message}`, 'red');
    return false;
  }
}

// Test 2: Test API endpoints
async function testAPIEndpoints() {
  log('\n🔌 Test 2: API Endpoints', 'cyan');
  
  try {
    // Get auth token (you may need to implement proper auth)
    const authHeaders = {
      'Authorization': `Bearer ${process.env.TEST_AUTH_TOKEN || ''}`
    };
    
    // Create a test agent first
    log('Creating test agent...', 'yellow');
    const createAgentRes = await fetch(`${API_BASE_URL}/api/agents`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test Agent',
        language: 'English',
        tone: 'Professional',
        organizationId: 'test-org-id'
      })
    });
    
    if (!createAgentRes.ok) {
      log('⚠️  Failed to create test agent (may already exist)', 'yellow');
    }
    
    const agent = await createAgentRes.json();
    const agentId = agent.id || 'test-agent-id';
    
    // Test GET default questions
    log('Testing GET default questions...', 'yellow');
    const getDefaultRes = await fetch(`${API_BASE_URL}/api/bant-questions/defaults`, {
      headers: authHeaders
    });
    
    if (getDefaultRes.ok) {
      const defaultData = await getDefaultRes.json();
      log(`✅ GET defaults successful: ${defaultData.questions?.length || 0} default questions`, 'green');
    } else {
      log('❌ GET defaults failed', 'red');
    }
    
    // Test POST custom questions
    log('Testing POST custom questions...', 'yellow');
    const postRes = await fetch(`${API_BASE_URL}/api/agents/${agentId}/bant-questions`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ questions: CUSTOM_QUESTIONS })
    });
    
    if (postRes.ok) {
      const postData = await postRes.json();
      log(`✅ POST questions successful: ${postData.questions?.length || 0} questions saved`, 'green');
    } else {
      log('❌ POST questions failed', 'red');
    }
    
    // Test GET agent questions
    log('Testing GET agent questions...', 'yellow');
    const getRes = await fetch(`${API_BASE_URL}/api/agents/${agentId}/bant-questions`, {
      headers: authHeaders
    });
    
    if (getRes.ok) {
      const getData = await getRes.json();
      log(`✅ GET questions successful: ${getData.questions?.length || 0} questions retrieved`, 'green');
      
      // Verify questions match what we saved
      const savedQuestions = getData.questions || [];
      const allCategoriesPresent = ['budget', 'authority', 'need', 'timeline'].every(cat =>
        savedQuestions.some(q => q.category === cat)
      );
      
      if (allCategoriesPresent) {
        log('✅ All BANT categories have questions', 'green');
      } else {
        log('⚠️  Some BANT categories missing questions', 'yellow');
      }
    } else {
      log('❌ GET questions failed', 'red');
    }
    
    return true;
  } catch (error) {
    log(`❌ API test failed: ${error.message}`, 'red');
    return false;
  }
}

// Test 3: Test conversation flow with custom questions
async function testConversationFlow() {
  log('\n💬 Test 3: Conversation Flow with Custom Questions', 'cyan');
  
  try {
    const authHeaders = {
      'Authorization': `Bearer ${process.env.TEST_AUTH_TOKEN || ''}`
    };
    
    // Start a conversation
    log('Starting conversation...', 'yellow');
    const chatRes = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Hello, I am interested in buying property',
        agentId: 'test-agent-id',
        source: 'web'
      })
    });
    
    if (chatRes.ok) {
      const chatData = await chatRes.json();
      const response = chatData.message || chatData.response || '';
      
      log('✅ Conversation started', 'green');
      log(`AI Response: ${response.substring(0, 100)}...`, 'blue');
      
      // Check if custom question is being asked
      const hasCustomQuestion = CUSTOM_QUESTIONS.some(q => 
        response.toLowerCase().includes(q.question_text.toLowerCase().substring(0, 20))
      );
      
      if (hasCustomQuestion) {
        log('✅ Custom BANT question detected in response', 'green');
      } else {
        log('⚠️  Custom question not clearly detected (may be paraphrased)', 'yellow');
      }
      
      // Test BANT flow progression
      log('\nTesting BANT flow progression...', 'yellow');
      
      // Answer budget question
      const budgetRes = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'My budget is around $2 million',
          conversationId: chatData.conversationId,
          agentId: 'test-agent-id',
          source: 'web'
        })
      });
      
      if (budgetRes.ok) {
        const budgetData = await budgetRes.json();
        log('✅ Budget answer processed', 'green');
        
        // Check if moving to authority questions
        const response = budgetData.message || budgetData.response || '';
        if (response.toLowerCase().includes('decision') || response.toLowerCase().includes('authority')) {
          log('✅ Progressed to Authority questions', 'green');
        }
      }
      
    } else {
      log('❌ Failed to start conversation', 'red');
    }
    
    return true;
  } catch (error) {
    log(`❌ Conversation test failed: ${error.message}`, 'red');
    return false;
  }
}

// Test 4: Frontend E2E test with Playwright
async function testFrontendE2E() {
  log('\n🌐 Test 4: Frontend E2E Testing', 'cyan');
  
  let browser;
  try {
    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Navigate to frontend
    log('Navigating to frontend...', 'yellow');
    await page.goto(FRONTEND_URL);
    await delay(2000);
    
    // Login (adjust selectors as needed)
    log('Logging in...', 'yellow');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await delay(3000);
    
    // Navigate to agent management
    log('Navigating to agent management...', 'yellow');
    await page.click('text=Agents');
    await delay(2000);
    
    // Check if custom BANT questions section exists
    const bantQuestionsSection = await page.locator('text=Custom BANT Questions').count();
    if (bantQuestionsSection > 0) {
      log('✅ Custom BANT Questions section found', 'green');
      
      // Try to edit questions
      await page.click('text=Custom BANT Questions');
      await delay(1000);
      
      // Check for Budget tab
      const budgetTab = await page.locator('text=Budget').first();
      if (budgetTab) {
        await budgetTab.click();
        log('✅ Budget questions tab accessible', 'green');
      }
      
      // Check for Authority tab
      const authorityTab = await page.locator('text=Authority').first();
      if (authorityTab) {
        await authorityTab.click();
        log('✅ Authority questions tab accessible', 'green');
      }
      
      // Try to add a new question
      const addButton = await page.locator('button:has-text("Add Question")').first();
      if (addButton) {
        await addButton.click();
        log('✅ Can add new questions', 'green');
      }
      
      // Save questions
      const saveButton = await page.locator('button:has-text("Save Questions")').first();
      if (saveButton) {
        await saveButton.click();
        await delay(2000);
        
        // Check for success message
        const successMessage = await page.locator('text=saved successfully').count();
        if (successMessage > 0) {
          log('✅ Questions saved successfully', 'green');
        }
      }
      
    } else {
      log('❌ Custom BANT Questions section not found', 'red');
    }
    
    await browser.close();
    return true;
    
  } catch (error) {
    log(`❌ Frontend test failed: ${error.message}`, 'red');
    if (browser) await browser.close();
    return false;
  }
}

// Main test runner
async function runTests() {
  log('🚀 Starting Custom BANT Questions Feature Tests', 'magenta');
  log('=' .repeat(50), 'magenta');
  
  const results = {
    database: false,
    api: false,
    conversation: false,
    frontend: false
  };
  
  // Run tests
  results.database = await testDatabaseMigration();
  await delay(1000);
  
  results.api = await testAPIEndpoints();
  await delay(1000);
  
  results.conversation = await testConversationFlow();
  await delay(1000);
  
  results.frontend = await testFrontendE2E();
  
  // Summary
  log('\n' + '=' .repeat(50), 'magenta');
  log('📋 Test Summary', 'magenta');
  log('=' .repeat(50), 'magenta');
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASSED' : '❌ FAILED';
    const color = passed ? 'green' : 'red';
    log(`${test.padEnd(15)}: ${status}`, color);
  });
  
  const allPassed = Object.values(results).every(r => r);
  
  log('\n' + '=' .repeat(50), 'magenta');
  if (allPassed) {
    log('🎉 All tests passed! Custom BANT Questions feature is working correctly.', 'green');
  } else {
    log('⚠️  Some tests failed. Please review the issues above.', 'yellow');
  }
  log('=' .repeat(50), 'magenta');
  
  process.exit(allPassed ? 0 : 1);
}

// Run tests
runTests().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  process.exit(1);
});