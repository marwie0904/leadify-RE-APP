const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyAllData() {
  console.log('🔍 Starting comprehensive data verification...\n');
  
  const results = {
    users: { expected: 24, actual: 0, admins: 0, agents: 0 },
    organizations: { expected: 4, actual: 0 },
    aiAgents: { expected: 4, actual: 0 },
    issues: { expected: 8, actual: 0 },
    features: { expected: 4, actual: 0 },
    conversations: { expected: 80, actual: 0, byType: {} },
    leads: { hot: 0, warm: 0, cold: 0, total: 0 },
    tokenUsage: { total: 0, byOrg: {} },
    errors: []
  };
  
  try {
    // 1. Verify Users
    console.log('👥 Verifying users...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .not('email', 'eq', 'hoangmanh.cu@gmail.com'); // Exclude dev user
    
    if (usersError) {
      results.errors.push(`Users: ${usersError.message}`);
    } else {
      results.users.actual = users.length;
      results.users.admins = users.filter(u => u.role === 'admin').length;
      results.users.agents = users.filter(u => u.role === 'agent').length;
      
      console.log(`  ✅ Found ${results.users.actual} users (${results.users.admins} admins, ${results.users.agents} agents)`);
    }
    
    // 2. Verify Organizations
    console.log('\n🏢 Verifying organizations...');
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select(`
        *,
        organization_members(count)
      `);
    
    if (orgsError) {
      results.errors.push(`Organizations: ${orgsError.message}`);
    } else {
      results.organizations.actual = orgs.length;
      console.log(`  ✅ Found ${results.organizations.actual} organizations`);
      
      orgs.forEach(org => {
        console.log(`     - ${org.name}: ${org.organization_members[0].count} members`);
      });
    }
    
    // 3. Verify AI Agents
    console.log('\n🤖 Verifying AI agents...');
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select(`
        *,
        organizations!inner(name)
      `);
    
    if (agentsError) {
      results.errors.push(`AI Agents: ${agentsError.message}`);
    } else {
      results.aiAgents.actual = agents.length;
      console.log(`  ✅ Found ${results.aiAgents.actual} AI agents`);
      
      agents.forEach(agent => {
        const thresholds = agent.bant_thresholds || {};
        console.log(`     - ${agent.name} (${agent.organizations.name})`);
        console.log(`       BANT: Hot>${thresholds.hot}, Warm>${thresholds.warm}, Cold>${thresholds.cold}`);
      });
    }
    
    // 4. Verify Issues
    console.log('\n🐛 Verifying issues...');
    const { data: issues, error: issuesError } = await supabase
      .from('issues')
      .select(`
        *,
        organizations!inner(name)
      `);
    
    if (issuesError) {
      results.errors.push(`Issues: ${issuesError.message}`);
    } else {
      results.issues.actual = issues.length;
      console.log(`  ✅ Found ${results.issues.actual} issues`);
      
      // Group by organization
      const issuesByOrg = {};
      issues.forEach(issue => {
        const orgName = issue.organizations.name;
        issuesByOrg[orgName] = (issuesByOrg[orgName] || 0) + 1;
      });
      
      Object.entries(issuesByOrg).forEach(([org, count]) => {
        console.log(`     - ${org}: ${count} issues`);
      });
    }
    
    // 5. Verify Feature Requests
    console.log('\n✨ Verifying feature requests...');
    const { data: features, error: featuresError } = await supabase
      .from('feature_requests')
      .select(`
        *,
        organizations!inner(name)
      `);
    
    if (featuresError) {
      results.errors.push(`Features: ${featuresError.message}`);
    } else {
      results.features.actual = features.length;
      console.log(`  ✅ Found ${results.features.actual} feature requests`);
      
      features.forEach(feature => {
        console.log(`     - ${feature.organizations.name}: ${feature.title}`);
      });
    }
    
    // 6. Verify Conversations
    console.log('\n💬 Verifying conversations...');
    const { data: conversations, error: convsError } = await supabase
      .from('conversations')
      .select(`
        *,
        agents!inner(name, organizations!inner(name)),
        messages(count)
      `);
    
    if (convsError) {
      results.errors.push(`Conversations: ${convsError.message}`);
    } else {
      results.conversations.actual = conversations.length;
      console.log(`  ✅ Found ${results.conversations.actual} conversations`);
      
      // Group by agent
      const convsByAgent = {};
      conversations.forEach(conv => {
        const agentName = conv.agents.name;
        if (!convsByAgent[agentName]) {
          convsByAgent[agentName] = {
            total: 0,
            handoff: 0,
            messages: 0
          };
        }
        convsByAgent[agentName].total++;
        if (conv.status === 'handoff_requested') {
          convsByAgent[agentName].handoff++;
        }
        convsByAgent[agentName].messages += conv.messages[0]?.count || 0;
      });
      
      Object.entries(convsByAgent).forEach(([agent, stats]) => {
        console.log(`     - ${agent}: ${stats.total} conversations, ${stats.handoff} handoffs, ${stats.messages} messages`);
      });
    }
    
    // 7. Verify Leads
    console.log('\n📊 Verifying leads...');
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*');
    
    if (leadsError) {
      results.errors.push(`Leads: ${leadsError.message}`);
    } else {
      results.leads.total = leads.length;
      
      leads.forEach(lead => {
        const score = lead.bant_score || 0;
        if (score >= 80) results.leads.hot++;
        else if (score >= 50) results.leads.warm++;
        else results.leads.cold++;
      });
      
      console.log(`  ✅ Found ${results.leads.total} leads`);
      console.log(`     - Hot leads (>80): ${results.leads.hot}`);
      console.log(`     - Warm leads (50-80): ${results.leads.warm}`);
      console.log(`     - Cold leads (<50): ${results.leads.cold}`);
    }
    
    // 8. Verify AI Token Usage
    console.log('\n🎯 Verifying AI token usage...');
    const { data: tokenUsage, error: tokenError } = await supabase
      .from('ai_token_usage')
      .select(`
        *,
        organizations!inner(name)
      `);
    
    if (tokenError) {
      results.errors.push(`Token Usage: ${tokenError.message}`);
    } else {
      tokenUsage.forEach(usage => {
        results.tokenUsage.total += (usage.prompt_tokens || 0) + (usage.completion_tokens || 0);
        const orgName = usage.organizations.name;
        if (!results.tokenUsage.byOrg[orgName]) {
          results.tokenUsage.byOrg[orgName] = 0;
        }
        results.tokenUsage.byOrg[orgName] += (usage.prompt_tokens || 0) + (usage.completion_tokens || 0);
      });
      
      console.log(`  ✅ Total tokens used: ${results.tokenUsage.total.toLocaleString()}`);
      Object.entries(results.tokenUsage.byOrg).forEach(([org, tokens]) => {
        console.log(`     - ${org}: ${tokens.toLocaleString()} tokens`);
      });
    }
    
    // Final Summary
    console.log('\n' + '='.repeat(60));
    console.log('📈 VERIFICATION SUMMARY');
    console.log('='.repeat(60));
    
    const checks = [
      { name: 'Users', expected: results.users.expected, actual: results.users.actual },
      { name: 'Organizations', expected: results.organizations.expected, actual: results.organizations.actual },
      { name: 'AI Agents', expected: results.aiAgents.expected, actual: results.aiAgents.actual },
      { name: 'Issues', expected: results.issues.expected, actual: results.issues.actual },
      { name: 'Feature Requests', expected: results.features.expected, actual: results.features.actual },
      { name: 'Conversations', expected: results.conversations.expected, actual: results.conversations.actual }
    ];
    
    let allPassed = true;
    checks.forEach(check => {
      const status = check.actual >= check.expected ? '✅' : '❌';
      const percentage = ((check.actual / check.expected) * 100).toFixed(0);
      console.log(`${status} ${check.name}: ${check.actual}/${check.expected} (${percentage}%)`);
      if (check.actual < check.expected) allPassed = false;
    });
    
    if (results.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      results.errors.forEach(err => console.log(`   - ${err}`));
      allPassed = false;
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(allPassed ? '✅ ALL CHECKS PASSED!' : '⚠️  SOME CHECKS FAILED');
    console.log('='.repeat(60));
    
    return results;
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  verifyAllData().then((results) => {
    process.exit(results.errors.length === 0 ? 0 : 1);
  }).catch((error) => {
    console.error('❌ Process failed:', error);
    process.exit(1);
  });
}

module.exports = { verifyAllData };