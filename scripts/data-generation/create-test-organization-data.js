/**
 * Script to create test organization data for testing organization detail pages
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestData() {
  console.log('🚀 Creating test organization data...\n');
  
  try {
    // Get the admin user
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'marwryyy@gmail.com')
      .single();
    
    if (userError || !users) {
      console.error('❌ Admin user not found:', userError);
      return;
    }
    
    const adminUserId = users.id;
    console.log('✅ Found admin user:', adminUserId);
    
    // Create test organization
    const testOrgId = 'a0000000-0000-0000-0000-000000000001';
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .upsert({
        id: testOrgId,
        name: 'Test Organization Alpha',
        owner_id: adminUserId,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (orgError) {
      console.error('❌ Failed to create organization:', orgError);
    } else {
      console.log('✅ Organization created:', org.name);
    }
    
    // Add admin as member
    const { error: memberError } = await supabase
      .from('organization_members')
      .upsert({
        organization_id: testOrgId,
        user_id: adminUserId,
        role: 'admin',
        joined_at: new Date().toISOString()
      });
    
    if (!memberError) {
      console.log('✅ Admin added as organization member');
    }
    
    // Create test agent
    const testAgentId = 'b0000000-0000-0000-0000-000000000001';
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .upsert({
        id: testAgentId,
        organization_id: testOrgId,
        user_id: adminUserId,  // Add user_id field
        name: 'Test AI Agent',
        tone: 'Professional',  // Add required tone field
        status: 'ready',       // Add required status field
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (agentError) {
      console.error('❌ Failed to create agent:', agentError);
    } else {
      console.log('✅ Agent created:', agent.name);
      
      // Create agent config
      const { error: configError } = await supabase
        .from('agent_configs')
        .upsert({
          agent_id: testAgentId,
          system_prompt: 'You are a helpful real estate assistant.',
          fallback_prompt: 'I apologize, but I cannot help with that request.',
          criteria_prompt: 'Evaluate leads based on BANT criteria.',
          created_at: new Date().toISOString()
        });
      
      if (!configError) {
        console.log('✅ Agent config created');
      } else {
        console.error('⚠️ Agent config error:', configError);
      }
    }
    
    // Create test conversation
    const testConvId = 'c0000000-0000-0000-0000-000000000001';
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .upsert({
        id: testConvId,
        organization_id: testOrgId,
        agent_id: testAgentId,
        user_id: 'test-user-001',
        source: 'web',
        status: 'active',
        started_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (convError) {
      console.error('❌ Failed to create conversation:', convError);
    } else {
      console.log('✅ Conversation created');
      
      // Add messages
      const messages = [
        {
          conversation_id: testConvId,
          organization_id: testOrgId,
          content: 'Hello, I need help finding a property',
          role: 'user',
          created_at: new Date().toISOString()
        },
        {
          conversation_id: testConvId,
          organization_id: testOrgId,
          content: 'I would be happy to help you find a property. What are you looking for?',
          role: 'assistant',
          created_at: new Date().toISOString()
        }
      ];
      
      const { error: msgError } = await supabase
        .from('messages')
        .insert(messages);
      
      if (!msgError) {
        console.log('✅ Messages created');
      } else {
        console.error('⚠️ Messages error:', msgError);
      }
      
      // Add token usage
      const { error: tokenError } = await supabase
        .from('ai_token_usage')
        .insert({
          organization_id: testOrgId,
          agent_id: testAgentId,
          conversation_id: testConvId,
          prompt_tokens: 150,
          completion_tokens: 75,
          model: 'gpt-4',
          operation_type: 'chat',
          created_at: new Date().toISOString()
        });
      
      if (!tokenError) {
        console.log('✅ Token usage created');
      } else {
        console.error('⚠️ Token usage error:', tokenError);
      }
    }
    
    // Create test lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        organization_id: testOrgId,
        agent_id: testAgentId,
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '555-1234',
        source: 'web',
        notes: 'Interested in 3-bedroom homes',
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (leadError) {
      console.error('❌ Failed to create lead:', leadError);
    } else {
      console.log('✅ Lead created:', lead.name);
    }
    
    // Create test issue
    const { data: issue, error: issueError } = await supabase
      .from('issues')
      .insert({
        organization_id: testOrgId,
        user_id: adminUserId,
        user_email: 'user@example.com',
        user_name: 'Test User',
        subject: 'Chat not loading',
        description: 'The chat widget is not loading on the website',
        category: 'bug',
        priority: 'high',
        status: 'open',
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (issueError) {
      console.error('❌ Failed to create issue:', issueError);
    } else {
      console.log('✅ Issue created:', issue.subject);
    }
    
    // Create test feature request
    const { data: feature, error: featureError } = await supabase
      .from('feature_requests')
      .insert({
        organization_id: testOrgId,
        user_id: adminUserId,
        user_email: 'user@example.com',
        user_name: 'Test User',
        requested_feature: 'Dark mode support',
        reason: 'Better for working at night',
        status: 'submitted',
        priority: 'medium',
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (featureError) {
      console.error('❌ Failed to create feature request:', featureError);
    } else {
      console.log('✅ Feature request created:', feature.requested_feature);
    }
    
    console.log('\n✅ Test data creation complete!');
    console.log(`Organization ID: ${testOrgId}`);
    console.log(`Agent ID: ${testAgentId}`);
    console.log(`Conversation ID: ${testConvId}`);
    
  } catch (error) {
    console.error('❌ Error creating test data:', error);
  }
}

// Run the script
createTestData();