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
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    const { error: convError } = await supabase
      .from('conversations')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    // Clean leads
    console.log('🗑️ Cleaning leads...');
    const { error: leadError } = await supabase
      .from('leads')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    // Clean handoffs
    console.log('🗑️ Cleaning handoffs...');
    const { error: handoffError } = await supabase
      .from('conversation_handoffs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    // Clean agent embeddings
    console.log('🗑️ Cleaning agent embeddings...');
    const { error: embError } = await supabase
      .from('agent_embeddings')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    // Clean agents
    console.log('🗑️ Cleaning agents...');
    const { error: agentError } = await supabase
      .from('agents')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    // Clean issues
    console.log('🗑️ Cleaning issues...');
    const { error: issueError } = await supabase
      .from('issues')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    // Clean feature requests
    console.log('🗑️ Cleaning feature requests...');
    const { error: featureError } = await supabase
      .from('feature_requests')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    // Clean organization members (except dev members)
    console.log('🗑️ Cleaning organization members (except devs)...');
    
    // First get the IDs of dev users to preserve
    const { data: devUsers } = await supabase
      .from('users')
      .select('id')
      .in('email', devEmails);
    
    const devUserIds = devUsers?.map(u => u.id) || [];
    
    let memberError;
    if (devUserIds.length > 0) {
      // Delete all organization members except dev users
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .not('user_id', 'in', `(${devUserIds.join(',')})`);
      memberError = error;
    } else {
      // Delete all organization members
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      memberError = error;
    }
    
    // Clean organizations
    console.log('🗑️ Cleaning organizations...');
    const { error: orgError } = await supabase
      .from('organizations')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    // Clean AI token usage
    console.log('🗑️ Cleaning AI token usage...');
    const { error: tokenError } = await supabase
      .from('ai_token_usage')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    // Clean test users from users table (except dev members)
    console.log('🗑️ Cleaning test users (except devs)...');
    const { error: userError } = await supabase
      .from('users')
      .delete()
      .not('email', 'in', `(${devEmails.map(e => `'${e}'`).join(',')})`);
    
    // Clean BANT memory
    console.log('🗑️ Cleaning BANT memory...');
    const { error: bantError } = await supabase
      .from('bant_memory')
      .delete()
      .neq('conversation_id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
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
      bant: bantError
    };
    
    Object.entries(errors).forEach(([table, error]) => {
      if (error) {
        console.error(`❌ Error cleaning ${table}:`, error.message);
      }
    });
    
    // Also clean auth users (except dev users)
    console.log('🗑️ Cleaning auth users (except devs)...');
    try {
      // Get all auth users
      const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();
      
      // Filter out dev users and delete the rest
      const usersToDelete = authUsers?.filter(u => !devEmails.includes(u.email)) || [];
      
      for (const user of usersToDelete) {
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
        if (deleteError) {
          console.error(`❌ Error deleting auth user ${user.email}:`, deleteError.message);
        }
      }
      
      console.log(`✅ Cleaned ${usersToDelete.length} auth users`);
    } catch (authError) {
      console.error('❌ Error cleaning auth users:', authError);
    }
    
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