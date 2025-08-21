const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanTestData() {
  console.log('🧹 Starting test data cleanup...');
  
  try {
    // Get all dev member emails to preserve
    const devEmails = [
      'hoangmanh.cu@gmail.com',
      'admin@test.com', 
      // Add any other dev emails to preserve
    ];
    
    console.log('📧 Preserving dev members:', devEmails);
    
    // Clean conversations and messages first (due to foreign keys)
    console.log('🗑️ Cleaning conversations and messages...');
    const { error: msgError } = await supabase
      .from('messages')
      .delete()
      .not('conversation_id', 'is', null);
    
    const { error: convError } = await supabase
      .from('conversations')
      .delete()
      .not('id', 'is', null);
    
    // Clean leads
    console.log('🗑️ Cleaning leads...');
    const { error: leadError } = await supabase
      .from('leads')
      .delete()
      .not('id', 'is', null);
    
    // Clean handoffs
    console.log('🗑️ Cleaning handoffs...');
    const { error: handoffError } = await supabase
      .from('conversation_handoffs')
      .delete()
      .not('id', 'is', null);
    
    // Clean agent embeddings
    console.log('🗑️ Cleaning agent embeddings...');
    const { error: embError } = await supabase
      .from('agent_embeddings')
      .delete()
      .not('id', 'is', null);
    
    // Clean agents
    console.log('🗑️ Cleaning agents...');
    const { error: agentError } = await supabase
      .from('agents')
      .delete()
      .not('id', 'is', null);
    
    // Clean issues
    console.log('🗑️ Cleaning issues...');
    const { error: issueError } = await supabase
      .from('issues')
      .delete()
      .not('id', 'is', null);
    
    // Clean feature requests
    console.log('🗑️ Cleaning feature requests...');
    const { error: featureError } = await supabase
      .from('feature_requests')
      .delete()
      .not('id', 'is', null);
    
    // Clean organization members (except dev members)
    console.log('🗑️ Cleaning organization members (except devs)...');
    const { data: devUsers } = await supabase
      .from('users')
      .select('id')
      .in('email', devEmails);
    
    const devUserIds = devUsers?.map(u => u.id) || [];
    
    let memberError;
    if (devUserIds.length > 0) {
      const result = await supabase
        .from('organization_members')
        .delete()
        .not('user_id', 'in', devUserIds);
      memberError = result.error;
    } else {
      const result = await supabase
        .from('organization_members')
        .delete()
        .not('id', 'is', null);
      memberError = result.error;
    }
    
    // Clean organizations
    console.log('🗑️ Cleaning organizations...');
    const { error: orgError } = await supabase
      .from('organizations')
      .delete()
      .not('id', 'is', null);
    
    // Clean AI token usage
    console.log('🗑️ Cleaning AI token usage...');
    const { error: tokenError } = await supabase
      .from('ai_token_usage')
      .delete()
      .not('id', 'is', null);
    
    // Clean users (except auth users and dev members)
    console.log('🗑️ Cleaning test users (except devs)...');
    const { error: userError } = await supabase
      .from('users')
      .delete()
      .not('email', 'in', devEmails);
    
    // Clean BANT memory
    console.log('🗑️ Cleaning BANT memory...');
    const { error: bantError } = await supabase
      .from('bant_memory')
      .delete()
      .not('id', 'is', null);
    
    // Clean estimation memory
    console.log('🗑️ Cleaning estimation memory...');
    const { error: estError } = await supabase
      .from('estimation_memory')
      .delete()
      .not('id', 'is', null);
    
    console.log('✅ Test data cleanup completed successfully!');
    
    // Log any errors
    const errors = {
      messages: msgError,
      conversations: convError,
      leads: leadError,
      handoffs: handoffError,
      embeddings: embError,
      agents: agentError,
      issues: issueError,
      features: featureError,
      members: memberError,
      organizations: orgError,
      tokens: tokenError,
      users: userError,
      bant: bantError,
      estimation: estError
    };
    
    Object.entries(errors).forEach(([table, error]) => {
      if (error) {
        console.error(`❌ Error cleaning ${table}:`, error.message);
      }
    });
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  cleanTestData().then(() => {
    console.log('🎉 Cleanup process finished!');
    process.exit(0);
  });
}

module.exports = { cleanTestData };