const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getTokenUsageBefore() {
  const { data, error } = await supabase
    .from('ai_token_usage')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (error) {
    console.error('Error fetching token usage:', error);
    return null;
  }
  
  return data?.[0];
}

async function getTokenUsageAfter(beforeTimestamp) {
  const { data, error } = await supabase
    .from('ai_token_usage')
    .select('*')
    .gt('created_at', beforeTimestamp)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching token usage:', error);
    return [];
  }
  
  return data || [];
}

async function getSystemTokens() {
  const { data, error } = await supabase
    .from('ai_token_usage')
    .select('agent_id, operation_type, total_tokens, created_at')
    .in('agent_id', ['system', 'system_extraction', 'system_embedding', 'system_search'])
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching system tokens:', error);
    return [];
  }
  
  return data || [];
}

async function getTotalTokensToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { data, error } = await supabase
    .from('ai_token_usage')
    .select('total_tokens, agent_id, operation_type')
    .gte('created_at', today.toISOString());
  
  if (error) {
    console.error('Error fetching today\'s tokens:', error);
    return null;
  }
  
  const summary = {
    total: 0,
    byAgent: {},
    byOperation: {},
    systemCalls: 0
  };
  
  data?.forEach(record => {
    summary.total += record.total_tokens || 0;
    
    // Group by agent
    if (!summary.byAgent[record.agent_id]) {
      summary.byAgent[record.agent_id] = 0;
    }
    summary.byAgent[record.agent_id] += record.total_tokens || 0;
    
    // Group by operation
    if (!summary.byOperation[record.operation_type]) {
      summary.byOperation[record.operation_type] = 0;
    }
    summary.byOperation[record.operation_type] += record.total_tokens || 0;
    
    // Count system calls
    if (record.agent_id?.startsWith('system')) {
      summary.systemCalls += record.total_tokens || 0;
    }
  });
  
  return summary;
}

async function monitorTokenTracking() {
  console.log('🔍 TOKEN TRACKING VERIFICATION TOOL');
  console.log('=' . repeat(60));
  console.log('This tool verifies that all AI token usage is being tracked.\n');
  
  // Get current state
  const beforeUsage = await getTokenUsageBefore();
  const beforeTimestamp = beforeUsage?.created_at || new Date().toISOString();
  
  console.log('📊 Current Token Tracking Status:');
  console.log('-'.repeat(40));
  
  // Get today's summary
  const todaySummary = await getTotalTokensToday();
  if (todaySummary) {
    console.log(`\nToday's Total Tokens: ${todaySummary.total.toLocaleString()}`);
    console.log(`System Calls: ${todaySummary.systemCalls.toLocaleString()} tokens`);
    
    console.log('\nTokens by Agent:');
    Object.entries(todaySummary.byAgent)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([agent, tokens]) => {
        const isSystem = agent?.startsWith('system');
        console.log(`  ${isSystem ? '🔧' : '👤'} ${agent}: ${tokens.toLocaleString()}`);
      });
    
    console.log('\nTokens by Operation:');
    Object.entries(todaySummary.byOperation)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([op, tokens]) => {
        console.log(`  📝 ${op}: ${tokens.toLocaleString()}`);
      });
  }
  
  // Check for system tokens (indicating fix is working)
  console.log('\n🔧 System Token Tracking (Last 24h):');
  console.log('-'.repeat(40));
  const systemTokens = await getSystemTokens();
  
  if (systemTokens.length > 0) {
    console.log(`✅ Found ${systemTokens.length} system-level token tracking entries`);
    console.log('This indicates the fix is working!\n');
    
    // Show recent system calls
    console.log('Recent System Calls:');
    systemTokens.slice(0, 5).forEach(record => {
      const time = new Date(record.created_at).toLocaleTimeString();
      console.log(`  [${time}] ${record.operation_type}: ${record.total_tokens} tokens (${record.agent_id})`);
    });
  } else {
    console.log('⚠️ No system-level token tracking found.');
    console.log('This might indicate:');
    console.log('  1. The fix hasn\'t been applied yet');
    console.log('  2. No extraction functions have been called');
    console.log('  3. All calls had valid agent IDs');
  }
  
  // Instructions for testing
  console.log('\n📋 To Test Token Tracking:');
  console.log('-'.repeat(40));
  console.log('1. Trigger a property estimation conversation');
  console.log('2. Watch server logs for "[TOKEN TRACKING] System call" messages');
  console.log('3. Run this script again to see new system tokens');
  console.log('4. Compare with OpenAI dashboard after ~10 conversations');
  
  // Monitor for new tokens
  console.log('\n⏳ Monitoring for new token usage...');
  console.log('(Press Ctrl+C to stop)\n');
  
  setInterval(async () => {
    const newUsage = await getTokenUsageAfter(beforeTimestamp);
    if (newUsage.length > 0) {
      console.log(`\n🆕 New token usage detected: ${newUsage.length} entries`);
      newUsage.forEach(record => {
        const isSystem = record.agent_id?.startsWith('system');
        const icon = isSystem ? '🔧 SYSTEM' : '👤 AGENT';
        console.log(`  ${icon} [${record.operation_type}]: ${record.total_tokens} tokens`);
      });
    }
  }, 5000); // Check every 5 seconds
}

// Run the monitor
monitorTokenTracking().catch(console.error);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Token tracking monitor stopped.');
  process.exit(0);
});