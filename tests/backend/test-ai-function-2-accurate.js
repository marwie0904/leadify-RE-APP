#!/usr/bin/env node

/**
 * Accurate test of AI Function 2: BANT Extraction
 * Ensures proper token tracking and database recording
 */

const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
require('dotenv').config();

// Initialize services
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// Track token usage in database
async function trackTokenUsage({ organizationId, agentId, operationType, usage, model }) {
  if (!usage) {
    console.log(`${colors.red}⚠️ No usage data to track${colors.reset}`);
    return false;
  }
  
  try {
    const { data, error } = await supabase.from('ai_token_usage').insert({
      organization_id: organizationId || '8266be99-fcfd-42f7-a6e2-948e070f1eef',
      agent_id: agentId || '2b51a1a2-e10b-43a0-8501-ca28cf767cca',
      user_id: '8ad6ed68-ac60-4483-b22d-e6747727971b',
      operation_type: operationType,
      prompt_tokens: usage.prompt_tokens || 0,
      completion_tokens: usage.completion_tokens || 0,
      total_tokens: usage.total_tokens || 0,
      model: model || 'gpt-5-2025-08-07',
      created_at: new Date().toISOString()
    }).select();
    
    if (error) {
      console.log(`${colors.red}❌ Failed to track tokens: ${error.message}${colors.reset}`);
      return false;
    }
    
    console.log(`${colors.green}✅ Tracked ${usage.total_tokens} tokens in database${colors.reset}`);
    return true;
  } catch (err) {
    console.log(`${colors.red}❌ Database error: ${err.message}${colors.reset}`);
    return false;
  }
}

// BANT extraction function
async function extractBANTInfo(conversationHistory, testName, previousBantState = null) {
  console.log(`\n${colors.cyan}━━━ ${testName} ━━━${colors.reset}`);
  console.log(`Input: "${conversationHistory.substring(0, 80)}..."`);
  
  const systemPrompt = `You are analyzing a real estate conversation to extract BANT information.

Extract and return a JSON object with these fields:
- budget: number (in dollars) or null if not mentioned
- authority: "single", "dual", "group", or null if not mentioned
- need: string describing what they want or null if not mentioned
- timeline: string describing when they want to buy or null if not mentioned
- hasContact: true if email/phone provided, false otherwise

${previousBantState ? `Previous BANT state: ${JSON.stringify(previousBantState)}` : ''}

Return ONLY the JSON object, no explanation.`;

  const userPrompt = `Extract BANT from this conversation:\n${conversationHistory}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  console.log(`${colors.yellow}Calling OpenAI GPT-5...${colors.reset}`);
  const startTime = Date.now();
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5-2025-08-07',
      messages: messages,
      max_completion_tokens: 500,
      reasoning_effort: 'low'
    });

    const responseTime = Date.now() - startTime;
    const rawContent = response.choices[0].message.content || '';
    
    console.log(`Response time: ${responseTime}ms`);
    console.log(`Response: ${rawContent.substring(0, 150)}${rawContent.length > 150 ? '...' : ''}`);
    
    // Parse the response
    let bantInfo = null;
    let parseSuccess = false;
    
    try {
      // Try to extract JSON from response
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        bantInfo = JSON.parse(jsonMatch[0]);
        parseSuccess = true;
        console.log(`${colors.green}✅ Successfully parsed BANT data${colors.reset}`);
      } else {
        console.log(`${colors.yellow}⚠️ No JSON found in response${colors.reset}`);
      }
    } catch (parseError) {
      console.log(`${colors.red}❌ JSON parse error: ${parseError.message}${colors.reset}`);
    }
    
    // Log token usage
    if (response.usage) {
      console.log(`${colors.blue}Tokens - Prompt: ${response.usage.prompt_tokens}, Completion: ${response.usage.completion_tokens}, Total: ${response.usage.total_tokens}${colors.reset}`);
      
      // Track in database
      const tracked = await trackTokenUsage({
        organizationId: '8266be99-fcfd-42f7-a6e2-948e070f1eef',
        agentId: '2b51a1a2-e10b-43a0-8501-ca28cf767cca',
        operationType: 'bant_extraction',
        usage: response.usage,
        model: 'gpt-5-2025-08-07'
      });
    } else {
      console.log(`${colors.red}⚠️ No usage data in response${colors.reset}`);
    }
    
    return {
      success: parseSuccess,
      bantInfo: bantInfo,
      raw: rawContent,
      usage: response.usage || null
    };
    
  } catch (error) {
    console.log(`${colors.red}❌ OpenAI Error: ${error.message}${colors.reset}`);
    return {
      success: false,
      error: error.message,
      usage: null
    };
  }
}

async function runBANTExtractionTests() {
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}  AI FUNCTION 2: BANT Extraction - Accurate Test${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
  
  console.log(`\n${colors.yellow}Test Configuration:${colors.reset}`);
  console.log(`  Model: GPT-5-2025-08-07`);
  console.log(`  Operation: bant_extraction`);
  console.log(`  Max Tokens: 500`);
  console.log(`  Reasoning Effort: low`);
  
  // Get baseline token count from last 60 seconds
  console.log(`\n${colors.cyan}Getting baseline token count...${colors.reset}`);
  const baselineTime = new Date(Date.now() - 60000).toISOString();
  const { data: beforeData, error: beforeError } = await supabase
    .from('ai_token_usage')
    .select('total_tokens')
    .gte('created_at', baselineTime)
    .eq('operation_type', 'bant_extraction');
  
  if (beforeError) {
    console.log(`${colors.yellow}Warning: Could not get baseline: ${beforeError.message}${colors.reset}`);
  }
  
  const beforeTotal = beforeData?.reduce((sum, row) => sum + row.total_tokens, 0) || 0;
  console.log(`Baseline tokens (last 60s): ${beforeTotal}`);
  
  // Test cases
  const testCases = [
    {
      name: "Test 1: Simple Budget Only",
      conversation: "I have a budget of 10 million dollars for a property."
    },
    {
      name: "Test 2: Full BANT Information",
      conversation: "I'm looking for a 4-bedroom house in Miami Beach. My budget is 15 million dollars. My wife and I will decide together. We need to move by January 2025."
    },
    {
      name: "Test 3: Dialogue Format",
      conversation: `Agent: What's your budget range?
User: Between 8 and 12 million
Agent: When do you need to purchase?
User: Within the next 3 months
Agent: Will anyone else be involved in the decision?
User: No, just me`
    },
    {
      name: "Test 4: Partial Information",
      conversation: "Looking for investment properties, flexible budget depending on ROI. Timeline is ASAP."
    },
    {
      name: "Test 5: With Contact Info",
      conversation: "Budget is 20 million for beachfront property. Call me at 555-0123 or email john@example.com. Need to close by end of Q2 2025."
    },
    {
      name: "Test 6: Update Previous State",
      conversation: "Actually, let's increase the budget to 25 million for the right property.",
      previousState: { budget: 20000000, authority: "single", need: "beachfront property", timeline: "Q2 2025" }
    }
  ];
  
  console.log(`\n${colors.bright}${colors.yellow}═══ RUNNING ${testCases.length} TEST CASES ═══${colors.reset}`);
  
  const results = [];
  let totalTokens = 0;
  let successCount = 0;
  let dbTrackCount = 0;
  
  for (let i = 0; i < testCases.length; i++) {
    const test = testCases[i];
    const result = await extractBANTInfo(
      test.conversation, 
      test.name,
      test.previousState
    );
    
    results.push({
      name: test.name,
      success: result.success,
      tokens: result.usage?.total_tokens || 0
    });
    
    if (result.success) successCount++;
    if (result.usage) {
      totalTokens += result.usage.total_tokens;
      dbTrackCount++;
    }
    
    // Small delay between requests
    if (i < testCases.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // Wait for database to update
  console.log(`\n${colors.cyan}Waiting 5 seconds for database synchronization...${colors.reset}`);
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Get tokens after tests
  console.log(`${colors.cyan}Checking final token count...${colors.reset}`);
  const { data: afterData, error: afterError } = await supabase
    .from('ai_token_usage')
    .select('total_tokens, created_at')
    .gte('created_at', baselineTime)
    .eq('operation_type', 'bant_extraction')
    .order('created_at', { ascending: false });
  
  if (afterError) {
    console.log(`${colors.yellow}Warning: Could not get final count: ${afterError.message}${colors.reset}`);
  }
  
  const afterTotal = afterData?.reduce((sum, row) => sum + row.total_tokens, 0) || 0;
  const newTokens = afterTotal - beforeTotal;
  
  // Display results summary
  console.log(`\n${colors.bright}${colors.yellow}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}${colors.yellow}  TEST RESULTS SUMMARY${colors.reset}`);
  console.log(`${colors.bright}${colors.yellow}═══════════════════════════════════════════════════════════${colors.reset}`);
  
  console.log(`\n${colors.cyan}Individual Test Results:${colors.reset}`);
  results.forEach(r => {
    const status = r.success ? `${colors.green}✅ PASS${colors.reset}` : `${colors.red}❌ FAIL${colors.reset}`;
    console.log(`  ${status} ${r.name}: ${r.tokens} tokens`);
  });
  
  console.log(`\n${colors.cyan}Overall Statistics:${colors.reset}`);
  console.log(`  Tests Run: ${testCases.length}`);
  console.log(`  Successful Extractions: ${successCount}/${testCases.length}`);
  console.log(`  Database Tracking Success: ${dbTrackCount}/${testCases.length}`);
  
  console.log(`\n${colors.cyan}Token Usage:${colors.reset}`);
  console.log(`  Total from OpenAI responses: ${totalTokens} tokens`);
  console.log(`  New tokens in database: ${newTokens} tokens`);
  console.log(`  Match: ${newTokens === totalTokens ? `${colors.green}✅ EXACT MATCH${colors.reset}` : `${colors.yellow}⚠️ MISMATCH (diff: ${Math.abs(newTokens - totalTokens)})${colors.reset}`}`);
  
  console.log(`\n${colors.bright}${colors.yellow}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}${colors.green}  FINAL TOKEN COUNT: ${totalTokens}${colors.reset}`);
  console.log(`${colors.bright}${colors.yellow}═══════════════════════════════════════════════════════════${colors.reset}`);
  
  console.log(`\n${colors.bright}${colors.cyan}📊 Please check your OpenAI Dashboard now${colors.reset}`);
  console.log(`${colors.cyan}Compare the dashboard total with our tracked: ${totalTokens} tokens${colors.reset}`);
  console.log(`${colors.cyan}Model used: GPT-5-2025-08-07${colors.reset}`);
  
  // Show database entries if available
  if (afterData && afterData.length > 0) {
    console.log(`\n${colors.cyan}Recent Database Entries:${colors.reset}`);
    afterData.slice(0, 6).forEach(entry => {
      const time = new Date(entry.created_at).toLocaleTimeString();
      console.log(`  ${time}: ${entry.total_tokens} tokens`);
    });
  }
}

// Run the tests
runBANTExtractionTests().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});