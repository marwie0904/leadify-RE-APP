/**
 * Final GPT-5 System Test
 * Validates all GPT-5 models are working correctly in the system
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

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
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

async function runGPT5Tests() {
  console.log(`${colors.bright}${colors.magenta}`);
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║            GPT-5 MODELS FINAL VALIDATION TEST              ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`${colors.reset}\n`);

  const tests = [];
  let passed = 0;
  let failed = 0;

  // Test 1: GPT-5 Mini Chat
  console.log(`${colors.cyan}Testing GPT-5 Mini (gpt-5-mini-2025-08-07)...${colors.reset}`);
  try {
    const start = Date.now();
    const response = await openai.chat.completions.create({
      model: 'gpt-5-mini-2025-08-07',
      messages: [
        { role: 'system', content: 'You are a helpful real estate assistant.' },
        { role: 'user', content: 'What are the top 3 factors when buying a home?' }
      ],
      max_completion_tokens: 150
    });
    const time = Date.now() - start;
    
    console.log(`${colors.green}✅ GPT-5 Mini: SUCCESS${colors.reset}`);
    console.log(`   Tokens: ${response.usage.total_tokens} | Time: ${time}ms`);
    console.log(`   Cost: $${((response.usage.prompt_tokens * 0.00025 + response.usage.completion_tokens * 0.002) / 1000).toFixed(6)}`);
    passed++;
    tests.push({ name: 'GPT-5 Mini Chat', status: 'passed', time, tokens: response.usage.total_tokens });
  } catch (error) {
    console.log(`${colors.red}❌ GPT-5 Mini: FAILED - ${error.message}${colors.reset}`);
    failed++;
    tests.push({ name: 'GPT-5 Mini Chat', status: 'failed', error: error.message });
  }

  // Test 2: GPT-5 Nano Intent
  console.log(`\n${colors.cyan}Testing GPT-5 Nano (gpt-5-nano-2025-08-07)...${colors.reset}`);
  try {
    const start = Date.now();
    const response = await openai.chat.completions.create({
      model: 'gpt-5-nano-2025-08-07',
      messages: [
        { role: 'system', content: 'Classify intent as: question, statement, request. One word only.' },
        { role: 'user', content: 'I need a 3-bedroom house' }
      ],
      max_completion_tokens: 10
    });
    const time = Date.now() - start;
    
    console.log(`${colors.green}✅ GPT-5 Nano: SUCCESS${colors.reset}`);
    console.log(`   Intent: ${response.choices[0].message.content.trim()}`);
    console.log(`   Tokens: ${response.usage.total_tokens} | Time: ${time}ms`);
    console.log(`   Cost: $${((response.usage.prompt_tokens * 0.00005 + response.usage.completion_tokens * 0.0004) / 1000).toFixed(6)}`);
    passed++;
    tests.push({ name: 'GPT-5 Nano Intent', status: 'passed', time, tokens: response.usage.total_tokens });
  } catch (error) {
    console.log(`${colors.red}❌ GPT-5 Nano: FAILED - ${error.message}${colors.reset}`);
    failed++;
    tests.push({ name: 'GPT-5 Nano Intent', status: 'failed', error: error.message });
  }

  // Test 3: BANT Extraction with GPT-5 Mini
  console.log(`\n${colors.cyan}Testing BANT Extraction (GPT-5 Mini)...${colors.reset}`);
  try {
    const start = Date.now();
    const response = await openai.chat.completions.create({
      model: 'gpt-5-mini-2025-08-07',
      messages: [
        { role: 'system', content: 'Extract BANT info. Return JSON with budget, authority, need, timeline fields.' },
        { role: 'user', content: 'I have $500K budget and need to buy within 3 months. I am the decision maker.' }
      ],
      max_completion_tokens: 100,
      response_format: { type: "json_object" }
    });
    const time = Date.now() - start;
    const bant = JSON.parse(response.choices[0].message.content);
    
    console.log(`${colors.green}✅ BANT Extraction: SUCCESS${colors.reset}`);
    console.log(`   BANT: ${JSON.stringify(bant)}`);
    console.log(`   Tokens: ${response.usage.total_tokens} | Time: ${time}ms`);
    passed++;
    tests.push({ name: 'BANT Extraction', status: 'passed', time, tokens: response.usage.total_tokens });
  } catch (error) {
    console.log(`${colors.red}❌ BANT Extraction: FAILED - ${error.message}${colors.reset}`);
    failed++;
    tests.push({ name: 'BANT Extraction', status: 'failed', error: error.message });
  }

  // Test 4: End-to-End Pipeline
  console.log(`\n${colors.cyan}Testing End-to-End Pipeline...${colors.reset}`);
  try {
    const pipelineStart = Date.now();
    
    // Intent Classification (Nano)
    const intent = await openai.chat.completions.create({
      model: 'gpt-5-nano-2025-08-07',
      messages: [
        { role: 'system', content: 'Classify: question, statement, request, other. One word.' },
        { role: 'user', content: 'Show me homes under $400K' }
      ],
      max_completion_tokens: 10
    });

    // Chat Response (Mini)
    const chat = await openai.chat.completions.create({
      model: 'gpt-5-mini-2025-08-07',
      messages: [
        { role: 'system', content: 'You are a real estate agent.' },
        { role: 'user', content: 'Show me homes under $400K' }
      ],
      max_completion_tokens: 100
    });

    // Embedding (for search)
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: 'homes under 400000 budget'
    });

    const pipelineTime = Date.now() - pipelineStart;
    const totalTokens = intent.usage.total_tokens + chat.usage.total_tokens + embedding.usage.total_tokens;

    console.log(`${colors.green}✅ E2E Pipeline: SUCCESS${colors.reset}`);
    console.log(`   Total time: ${pipelineTime}ms | Total tokens: ${totalTokens}`);
    console.log(`   Intent: ${intent.choices[0].message.content.trim()}`);
    console.log(`   Chat tokens: ${chat.usage.total_tokens}`);
    console.log(`   Embedding dimensions: ${embedding.data[0].embedding.length}`);
    passed++;
    tests.push({ name: 'E2E Pipeline', status: 'passed', time: pipelineTime, tokens: totalTokens });
  } catch (error) {
    console.log(`${colors.red}❌ E2E Pipeline: FAILED - ${error.message}${colors.reset}`);
    failed++;
    tests.push({ name: 'E2E Pipeline', status: 'failed', error: error.message });
  }

  // Summary
  console.log(`\n${colors.bright}${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}FINAL RESULTS${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

  console.log(`${colors.green}✅ Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${failed}${colors.reset}`);
  console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%\n`);

  // Cost Comparison
  console.log(`${colors.bright}💰 Cost Comparison (per 1000 tokens):${colors.reset}`);
  console.log('┌─────────────────┬──────────────┬──────────────┐');
  console.log('│ Model           │ GPT-5 Cost   │ GPT-4 Cost   │');
  console.log('├─────────────────┼──────────────┼──────────────┤');
  console.log('│ Chat (Mini)     │ $0.00025     │ $0.01        │');
  console.log('│ Intent (Nano)   │ $0.00005     │ $0.01        │');
  console.log('│ Savings         │ 97.5%        │ Baseline     │');
  console.log('└─────────────────┴──────────────┴──────────────┘');

  // Performance Summary
  if (passed > 0) {
    const avgTime = tests
      .filter(t => t.status === 'passed' && t.time)
      .reduce((sum, t) => sum + t.time, 0) / passed;
    
    console.log(`\n${colors.bright}⚡ Performance:${colors.reset}`);
    console.log(`Average response time: ${avgTime.toFixed(0)}ms`);
    
    const totalTokensUsed = tests
      .filter(t => t.status === 'passed' && t.tokens)
      .reduce((sum, t) => sum + t.tokens, 0);
    console.log(`Total tokens used: ${totalTokensUsed}`);
  }

  if (passed === tests.length) {
    console.log(`\n${colors.bright}${colors.green}🎉 All GPT-5 models are working perfectly!${colors.reset}`);
    console.log(`${colors.green}The system is ready with 97-99% cost savings compared to GPT-4.${colors.reset}`);
  } else {
    console.log(`\n${colors.yellow}⚠️ Some tests failed. Please check the errors above.${colors.reset}`);
  }
}

runGPT5Tests().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});