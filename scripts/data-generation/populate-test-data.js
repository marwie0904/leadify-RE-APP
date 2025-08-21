// Populate database with real test data for comprehensive testing
require('dotenv').config({ path: './BACKEND/.env' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key for admin access
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function populateTestData() {
  console.log('🚀 Starting to populate real test data in Supabase...\n');
  
  try {
    // 1. Create a test user
    console.log('Creating test user...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'test.real@example.com',
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: {
        name: 'Real Test User'
      }
    });
    
    if (authError && !authError.message.includes('already been registered')) {
      console.error('Auth error:', authError);
    }
    
    const userId = authData?.user?.id || 'test-user-' + Date.now();
    console.log('✅ User ready:', userId);
    
    // 2. Create a test organization
    console.log('\nCreating test organization...');
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({
        id: '9a24d180-a1fe-4d22-91e2-066d55679888', // Use the specific test org ID
        name: 'Real Test Organization',
        owner_id: userId,
        status: 'active',
        plan: 'enterprise',
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (orgError && !orgError.message.includes('duplicate')) {
      console.error('Org error:', orgError);
    }
    
    const orgId = orgData?.id || '9a24d180-a1fe-4d22-91e2-066d55679888';
    console.log('✅ Organization ready:', orgId);
    
    // 3. Add organization members
    console.log('\nAdding organization members...');
    const members = [
      { email: 'admin@test.com', name: 'Admin User', role: 'admin' },
      { email: 'member1@test.com', name: 'John Developer', role: 'member' },
      { email: 'member2@test.com', name: 'Jane Designer', role: 'member' },
      { email: 'viewer@test.com', name: 'Bob Viewer', role: 'viewer' }
    ];
    
    for (const member of members) {
      const { error } = await supabase
        .from('organization_members')
        .upsert({
          organization_id: orgId,
          user_id: 'user-' + member.email.split('@')[0],
          role: member.role,
          created_at: new Date().toISOString()
        });
      
      if (error && !error.message.includes('duplicate')) {
        console.error(`Member error for ${member.email}:`, error.message);
      }
    }
    console.log('✅ Members added');
    
    // 4. Create AI agents
    console.log('\nCreating AI agents...');
    const agents = [
      {
        id: 'agent-sales-1',
        user_id: userId,
        organization_id: orgId,
        name: 'Sales Expert Pro',
        type: 'sales',
        status: 'active',
        system_prompt: 'You are an expert real estate sales agent specializing in residential properties.',
        bant_enabled: true,
        bant_config: {
          budget_weight: 0.3,
          authority_weight: 0.2,
          need_weight: 0.3,
          timeline_weight: 0.2,
          qualification_threshold: 70,
          questions: {
            budget: 'What is your budget range for this property?',
            authority: 'Are you the primary decision maker?',
            need: 'What are your main requirements?',
            timeline: 'When are you looking to make a purchase?'
          }
        },
        created_at: new Date().toISOString()
      },
      {
        id: 'agent-support-1',
        user_id: userId,
        organization_id: orgId,
        name: 'Customer Support AI',
        type: 'support',
        status: 'active',
        system_prompt: 'You are a helpful customer support agent for real estate inquiries.',
        bant_enabled: false,
        created_at: new Date().toISOString()
      }
    ];
    
    for (const agent of agents) {
      const { error } = await supabase
        .from('agents')
        .upsert(agent);
      
      if (error && !error.message.includes('duplicate')) {
        console.error(`Agent error for ${agent.name}:`, error.message);
      }
    }
    console.log('✅ Agents created');
    
    // 5. Create conversations
    console.log('\nCreating conversations...');
    const conversations = [
      {
        id: 'conv-real-1',
        agent_id: 'agent-sales-1',
        organization_id: orgId,
        source: 'web',
        status: 'active',
        user_name: 'Alice Johnson',
        user_email: 'alice@example.com',
        user_phone: '555-0101',
        created_at: new Date(Date.now() - 86400000).toISOString() // 1 day ago
      },
      {
        id: 'conv-real-2',
        agent_id: 'agent-sales-1',
        organization_id: orgId,
        source: 'facebook',
        status: 'active',
        user_name: 'Bob Smith',
        user_email: 'bob@example.com',
        user_phone: '555-0102',
        created_at: new Date(Date.now() - 172800000).toISOString() // 2 days ago
      },
      {
        id: 'conv-real-3',
        agent_id: 'agent-support-1',
        organization_id: orgId,
        source: 'embed',
        status: 'closed',
        user_name: 'Charlie Brown',
        user_email: 'charlie@example.com',
        user_phone: '555-0103',
        created_at: new Date(Date.now() - 259200000).toISOString() // 3 days ago
      }
    ];
    
    for (const conv of conversations) {
      const { error } = await supabase
        .from('conversations')
        .upsert(conv);
      
      if (error && !error.message.includes('duplicate')) {
        console.error(`Conversation error:`, error.message);
      }
    }
    console.log('✅ Conversations created');
    
    // 6. Create messages
    console.log('\nCreating messages...');
    const messages = [
      // Conversation 1
      {
        conversation_id: 'conv-real-1',
        role: 'user',
        content: 'Hi, I am looking for a 3-bedroom house in the downtown area.',
        created_at: new Date(Date.now() - 86400000).toISOString()
      },
      {
        conversation_id: 'conv-real-1',
        role: 'assistant',
        content: 'Great! I can help you find the perfect 3-bedroom house downtown. What is your budget range?',
        token_count: 150,
        created_at: new Date(Date.now() - 86300000).toISOString()
      },
      {
        conversation_id: 'conv-real-1',
        role: 'user',
        content: 'My budget is around $500,000 to $600,000.',
        created_at: new Date(Date.now() - 86200000).toISOString()
      },
      {
        conversation_id: 'conv-real-1',
        role: 'assistant',
        content: 'Perfect! That budget gives you excellent options in the downtown area. Are you the primary decision maker for this purchase?',
        token_count: 200,
        created_at: new Date(Date.now() - 86100000).toISOString()
      },
      // Conversation 2
      {
        conversation_id: 'conv-real-2',
        role: 'user',
        content: 'Do you have any commercial properties available?',
        created_at: new Date(Date.now() - 172800000).toISOString()
      },
      {
        conversation_id: 'conv-real-2',
        role: 'assistant',
        content: 'Yes, we have several commercial properties available. What type of commercial property are you interested in?',
        token_count: 180,
        created_at: new Date(Date.now() - 172700000).toISOString()
      }
    ];
    
    for (const msg of messages) {
      const { error } = await supabase
        .from('messages')
        .insert(msg);
      
      if (error && !error.message.includes('duplicate')) {
        console.error(`Message error:`, error.message);
      }
    }
    console.log('✅ Messages created');
    
    // 7. Create leads
    console.log('\nCreating leads...');
    const leads = [
      {
        organization_id: orgId,
        conversation_id: 'conv-real-1',
        name: 'Alice Johnson',
        email: 'alice@example.com',
        phone: '555-0101',
        status: 'qualified',
        score: 85,
        bant_budget: 90,
        bant_authority: 85,
        bant_need: 80,
        bant_timeline: 85,
        budget_range: '$500K-$600K',
        property_type: 'Residential',
        location_preference: 'Downtown',
        created_at: new Date(Date.now() - 86400000).toISOString()
      },
      {
        organization_id: orgId,
        conversation_id: 'conv-real-2',
        name: 'Bob Smith',
        email: 'bob@example.com',
        phone: '555-0102',
        status: 'contacted',
        score: 65,
        bant_budget: 70,
        bant_authority: 60,
        bant_need: 65,
        bant_timeline: 65,
        budget_range: '$1M-$2M',
        property_type: 'Commercial',
        location_preference: 'Business District',
        created_at: new Date(Date.now() - 172800000).toISOString()
      },
      {
        organization_id: orgId,
        name: 'David Wilson',
        email: 'david@example.com',
        phone: '555-0104',
        status: 'new',
        score: 45,
        bant_budget: 50,
        bant_authority: 40,
        bant_need: 45,
        bant_timeline: 45,
        created_at: new Date(Date.now() - 3600000).toISOString()
      },
      {
        organization_id: orgId,
        name: 'Emma Davis',
        email: 'emma@example.com',
        phone: '555-0105',
        status: 'nurturing',
        score: 55,
        bant_budget: 60,
        bant_authority: 50,
        bant_need: 55,
        bant_timeline: 55,
        created_at: new Date(Date.now() - 7200000).toISOString()
      }
    ];
    
    for (const lead of leads) {
      const { error } = await supabase
        .from('leads')
        .upsert(lead);
      
      if (error && !error.message.includes('duplicate')) {
        console.error(`Lead error for ${lead.name}:`, error.message);
      }
    }
    console.log('✅ Leads created');
    
    // 8. Create issues and feature requests
    console.log('\nCreating issues and feature requests...');
    const issues = [
      {
        organization_id: orgId,
        title: 'Chat widget not loading on mobile',
        description: 'The chat widget fails to load on mobile devices',
        status: 'open',
        priority: 'high',
        type: 'bug',
        created_by: userId,
        created_at: new Date(Date.now() - 86400000).toISOString()
      },
      {
        organization_id: orgId,
        title: 'Slow response time during peak hours',
        description: 'AI responses are taking longer than usual during business hours',
        status: 'in_progress',
        priority: 'medium',
        type: 'performance',
        created_by: userId,
        created_at: new Date(Date.now() - 172800000).toISOString()
      }
    ];
    
    const features = [
      {
        organization_id: orgId,
        title: 'Add WhatsApp integration',
        description: 'Support for WhatsApp Business API integration',
        status: 'open',
        priority: 'medium',
        type: 'enhancement',
        created_by: userId,
        created_at: new Date(Date.now() - 259200000).toISOString()
      },
      {
        organization_id: orgId,
        title: 'Export leads to CSV',
        description: 'Ability to export lead data in CSV format',
        status: 'planned',
        priority: 'low',
        type: 'feature',
        created_by: userId,
        created_at: new Date(Date.now() - 345600000).toISOString()
      }
    ];
    
    for (const issue of [...issues, ...features]) {
      const { error } = await supabase
        .from('issues')
        .insert(issue);
      
      if (error && !error.message.includes('duplicate')) {
        console.error(`Issue error:`, error.message);
      }
    }
    console.log('✅ Issues and features created');
    
    // 9. Add some analytics data (conversation metrics)
    console.log('\nAdding analytics data...');
    
    // Update conversation token counts
    await supabase
      .from('conversations')
      .update({
        message_count: 4,
        total_tokens: 530,
        estimated_cost: 0.0159
      })
      .eq('id', 'conv-real-1');
    
    await supabase
      .from('conversations')
      .update({
        message_count: 2,
        total_tokens: 180,
        estimated_cost: 0.0054
      })
      .eq('id', 'conv-real-2');
    
    console.log('✅ Analytics data added');
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 Test data population complete!');
    console.log('='.repeat(50));
    console.log('\nOrganization ID: 9a24d180-a1fe-4d22-91e2-066d55679888');
    console.log('Test User Email: test.real@example.com');
    console.log('\nCreated:');
    console.log('- 1 Organization');
    console.log('- 4 Members');
    console.log('- 2 AI Agents');
    console.log('- 3 Conversations');
    console.log('- 6 Messages');
    console.log('- 4 Leads');
    console.log('- 4 Issues/Features');
    console.log('\nYou can now run real backend tests with this data!');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the population script
populateTestData();