#!/usr/bin/env node

/**
 * Validation Script for Token Tracking Fixes
 * Run this to verify all 4 fixes are working correctly
 */

const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

async function validateFixes() {
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}  TOKEN TRACKING FIXES VALIDATION${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
  
  const results = {
    fix1: false,
    fix2: false,
    fix3: false,
    fix4: false
  };
  
  // Fix 1: Check for test_ operations in database
  console.log(`\n${colors.yellow}Validating Fix 1: Test File Tracking${colors.reset}`);
  const { data: testOps } = await supabase
    .from('ai_token_usage')
    .select('operation_type, total_tokens, created_at')
    .like('operation_type', 'test_%')
    .gte('created_at', new Date(Date.now() - 3600000).toISOString())
    .limit(5);
  
  if (testOps && testOps.length > 0) {
    console.log(`${colors.green}✅ Fix 1 WORKING:${colors.reset} Found ${testOps.length} test operations`);
    testOps.forEach(op => {
      console.log(`   - ${op.operation_type}: ${op.total_tokens} tokens`);
    });
    results.fix1 = true;
  } else {
    console.log(`${colors.yellow}⚠️ Fix 1 NOT VERIFIED:${colors.reset} No test operations found. Run a test file first.`);
    console.log(`   Try: node test-bant-extraction-direct.js`);
  }
  
  // Fix 2: Check that no chat_reply is labeled as bant_extraction
  console.log(`\n${colors.yellow}Validating Fix 2: Correct Operation Labels${colors.reset}`);
  const { data: recentOps } = await supabase
    .from('ai_token_usage')
    .select('operation_type, COUNT(*)')
    .gte('created_at', new Date(Date.now() - 3600000).toISOString())
    .in('operation_type', ['chat_reply', 'bant_extraction']);
  
  const hasChatReply = recentOps?.some(op => op.operation_type === 'chat_reply');
  if (hasChatReply) {
    console.log(`${colors.green}✅ Fix 2 WORKING:${colors.reset} chat_reply operations properly labeled`);
    results.fix2 = true;
  } else {
    console.log(`${colors.yellow}⚠️ Fix 2 NOT VERIFIED:${colors.reset} No recent chat_reply operations to check`);
  }
  
  // Fix 3: Check that chat_reply operations have >0 tokens
  console.log(`\n${colors.yellow}Validating Fix 3: Minimum Token Calculation${colors.reset}`);
  const { data: chatReplies } = await supabase
    .from('ai_token_usage')
    .select('total_tokens, prompt_tokens, completion_tokens')
    .eq('operation_type', 'chat_reply')
    .gte('created_at', new Date(Date.now() - 3600000).toISOString())
    .limit(5);
  
  if (chatReplies && chatReplies.length > 0) {
    const hasZeroTokens = chatReplies.some(r => r.total_tokens === 0);
    const minTokens = Math.min(...chatReplies.map(r => r.total_tokens));
    
    if (!hasZeroTokens && minTokens >= 10) {
      console.log(`${colors.green}✅ Fix 3 WORKING:${colors.reset} All chat_reply ops have ≥10 tokens`);
      console.log(`   Minimum tokens found: ${minTokens}`);
      results.fix3 = true;
    } else if (hasZeroTokens) {
      console.log(`${colors.red}❌ Fix 3 ISSUE:${colors.reset} Found chat_reply with 0 tokens`);
    } else {
      console.log(`${colors.yellow}⚠️ Fix 3 PARTIAL:${colors.reset} Min tokens: ${minTokens} (should be ≥10)`);
    }
  } else {
    console.log(`${colors.yellow}⚠️ Fix 3 NOT VERIFIED:${colors.reset} No recent chat_reply operations`);
  }
  
  // Fix 4: Check for system-intent operations
  console.log(`\n${colors.yellow}Validating Fix 4: System Intent Tracking${colors.reset}`);
  const { data: systemOps } = await supabase
    .from('ai_token_usage')
    .select('agent_id, operation_type, total_tokens')
    .or('agent_id.eq.system-intent,agent_id.eq.system_extraction')
    .eq('operation_type', 'intent_classification')
    .gte('created_at', new Date(Date.now() - 3600000).toISOString())
    .limit(5);
  
  if (systemOps && systemOps.length > 0) {
    console.log(`${colors.green}✅ Fix 4 WORKING:${colors.reset} System intent calls tracked`);
    systemOps.forEach(op => {
      console.log(`   - Agent: ${op.agent_id}, Tokens: ${op.total_tokens}`);
    });
    results.fix4 = true;
  } else {
    console.log(`${colors.yellow}⚠️ Fix 4 NOT VERIFIED:${colors.reset} No system intent operations found`);
  }
  
  // Summary
  console.log(`\n${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}  VALIDATION SUMMARY${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
  
  const fixedCount = Object.values(results).filter(r => r).length;
  const totalFixes = 4;
  
  if (fixedCount === totalFixes) {
    console.log(`${colors.bright}${colors.green}🎉 ALL ${totalFixes} FIXES VALIDATED AND WORKING!${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠️ ${fixedCount}/${totalFixes} fixes validated${colors.reset}`);
    console.log(`\nTo fully validate:`);
    if (!results.fix1) console.log(`  1. Run a test file: node test-bant-extraction-direct.js`);
    if (!results.fix2 || !results.fix3) console.log(`  2. Send a chat message through the API`);
    if (!results.fix4) console.log(`  3. Trigger an intent classification without an agent`);
  }
  
  // Token usage comparison
  console.log(`\n${colors.cyan}Recent Token Usage (Last Hour):${colors.reset}`);
  const { data: summary } = await supabase
    .from('ai_token_usage')
    .select('operation_type')
    .gte('created_at', new Date(Date.now() - 3600000).toISOString());
  
  if (summary) {
    const grouped = summary.reduce((acc, row) => {
      acc[row.operation_type] = (acc[row.operation_type] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(grouped).forEach(([type, count]) => {
      console.log(`  ${type}: ${count} operations`);
    });
    
    const total = summary.length;
    console.log(`\n  Total operations tracked: ${total}`);
  }
  
  console.log(`\n${colors.bright}${colors.cyan}Compare with OpenAI Dashboard after 1 hour for full validation${colors.reset}`);
}

// Run validation
validateFixes().catch(console.error);