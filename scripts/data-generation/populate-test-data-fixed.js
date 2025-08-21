#!/usr/bin/env node

/**
 * Fixed Test Data Population Script with Proper UUIDs
 * Populates database with comprehensive test data using valid UUID format
 */

require('dotenv').config({ path: './BACKEND/.env' });
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

// Initialize Supabase client
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

// Generate proper UUIDs for all entities
const TEST_ORG_ID = '9a24d180-a1fe-4d22-91e2-066d55679888';
const TEST_USER_ID = uuidv4();
const MEMBER_IDS = {
  john: uuidv4(),
  jane: uuidv4(),
  bob: uuidv4(),
  alice: uuidv4()
};
const AGENT_IDS = {
  sales: uuidv4(),
  support: uuidv4(),
  technical: uuidv4()
};
const CONV_IDS = {
  conv1: uuidv4(),
  conv2: uuidv4(),
  conv3: uuidv4()
};

async function clearExistingData() {
  console.log('🧹 Clearing existing test data...');
  
  // Delete in reverse dependency order
  await supabase.from('messages').delete().eq('conversation_id', CONV_IDS.conv1);
  await supabase.from('messages').delete().eq('conversation_id', CONV_IDS.conv2);
  await supabase.from('messages').delete().eq('conversation_id', CONV_IDS.conv3);
  
  await supabase.from('leads').delete().eq('organization_id', TEST_ORG_ID);
  await supabase.from('issues').delete().eq('organization_id', TEST_ORG_ID);
  await supabase.from('conversations').delete().eq('organization_id', TEST_ORG_ID);
  await supabase.from('agents').delete().eq('organization_id', TEST_ORG_ID);
  await supabase.from('organization_members').delete().eq('organization_id', TEST_ORG_ID);
  await supabase.from('organizations').delete().eq('id', TEST_ORG_ID);
  
  console.log('✅ Existing data cleared\n');
}

async function populateTestData() {
  console.log('🚀 Starting test data population with proper UUIDs...\n');
  console.log('=' .repeat(60));
  
  try {
    await clearExistingData();
    
    // 1. Create test organization
    console.log('🏢 Creating test organization...');
    const { error: orgError } = await supabase
      .from('organizations')
      .insert({
        id: TEST_ORG_ID,
        name: 'Leadify Real Estate AI',
        owner_id: TEST_USER_ID,
        status: 'active',
        plan: 'enterprise',
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString()
      });
    
    if (orgError) {
      console.error('Organization error:', orgError);
    } else {
      console.log('✅ Organization created: Leadify Real Estate AI');
    }
    
    // 2. Add organization members
    console.log('\n👥 Adding organization members...');
    const members = [
      {
        organization_id: TEST_ORG_ID,
        user_id: TEST_USER_ID,
        role: 'admin',
        status: 'active',
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        joined_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        organization_id: TEST_ORG_ID,
        user_id: MEMBER_IDS.john,
        role: 'member',
        status: 'active',
        created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
        joined_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        organization_id: TEST_ORG_ID,
        user_id: MEMBER_IDS.jane,
        role: 'member',
        status: 'active',
        created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        joined_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        organization_id: TEST_ORG_ID,
        user_id: MEMBER_IDS.bob,
        role: 'viewer',
        status: 'active',
        created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        joined_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        organization_id: TEST_ORG_ID,
        user_id: MEMBER_IDS.alice,
        role: 'member',
        status: 'invited',
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    
    for (const member of members) {
      const { error } = await supabase
        .from('organization_members')
        .insert(member);
      
      if (error) {
        console.error(`Member error:`, error.message);
      }
    }
    console.log(`✅ Added ${members.length} organization members`);
    
    // 3. Create AI agents
    console.log('\n🤖 Creating AI agents with BANT configs...');
    const agents = [
      {
        id: AGENT_IDS.sales,
        user_id: TEST_USER_ID,
        organization_id: TEST_ORG_ID,
        name: 'Elite Sales Pro',
        tone: 'Professional',
        status: 'ready',
        type: 'sales',
        active: true,
        bant_enabled: true,
        bant_config: {
          enabled: true,
          weights: {
            budget: 0.30,
            authority: 0.25,
            need: 0.25,
            timeline: 0.20
          },
          thresholds: {
            hot: 80,
            warm: 60,
            cold: 40,
            qualification: 70
          },
          questions: {
            budget: 'What is your budget range for this property?',
            authority: 'Are you the primary decision maker?',
            need: 'What are your main requirements?',
            timeline: 'When are you planning to make a purchase?'
          }
        },
        system_prompt: 'You are an elite real estate sales expert.',
        token_usage: 125000,
        conversation_count: 45,
        created_at: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: AGENT_IDS.support,
        user_id: TEST_USER_ID,
        organization_id: TEST_ORG_ID,
        name: 'Customer Success AI',
        tone: 'Friendly',
        status: 'ready',
        type: 'support',
        active: true,
        bant_enabled: false,
        bant_config: {},
        system_prompt: 'You are a helpful customer support specialist.',
        token_usage: 75000,
        conversation_count: 120,
        created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: AGENT_IDS.technical,
        user_id: TEST_USER_ID,
        organization_id: TEST_ORG_ID,
        name: 'Property Tech Advisor',
        tone: 'Neutral',
        status: 'ready',
        type: 'technical',
        active: true,
        bant_enabled: true,
        bant_config: {
          enabled: true,
          weights: {
            budget: 0.35,
            authority: 0.20,
            need: 0.30,
            timeline: 0.15
          },
          thresholds: {
            hot: 75,
            warm: 55,
            cold: 35,
            qualification: 65
          }
        },
        system_prompt: 'You are a technical property advisor.',
        token_usage: 50000,
        conversation_count: 30,
        created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    
    for (const agent of agents) {
      const { error } = await supabase
        .from('agents')
        .insert(agent);
      
      if (error) {
        console.error(`Agent error:`, error.message);
      }
    }
    console.log(`✅ Created ${agents.length} AI agents with BANT configurations`);
    
    // 4. Create conversations
    console.log('\n💬 Creating conversations...');
    const conversations = [
      {
        id: CONV_IDS.conv1,
        agent_id: AGENT_IDS.sales,
        organization_id: TEST_ORG_ID,
        source: 'web',
        status: 'active',
        user_name: 'Alice Johnson',
        user_email: 'alice.johnson@example.com',
        user_phone: '+1-555-0101',
        message_count: 8,
        total_tokens: 2450,
        estimated_cost: 0.0735,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: CONV_IDS.conv2,
        agent_id: AGENT_IDS.sales,
        organization_id: TEST_ORG_ID,
        source: 'facebook',
        status: 'active',
        user_name: 'Bob Smith',
        user_email: 'bob.smith@example.com',
        user_phone: '+1-555-0102',
        message_count: 6,
        total_tokens: 1800,
        estimated_cost: 0.054,
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: CONV_IDS.conv3,
        agent_id: AGENT_IDS.support,
        organization_id: TEST_ORG_ID,
        source: 'embed',
        status: 'closed',
        user_name: 'Charlie Brown',
        user_email: 'charlie.brown@example.com',
        user_phone: '+1-555-0103',
        message_count: 4,
        total_tokens: 950,
        estimated_cost: 0.0285,
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    
    for (const conv of conversations) {
      const { error } = await supabase
        .from('conversations')
        .insert(conv);
      
      if (error) {
        console.error(`Conversation error:`, error.message);
      }
    }
    console.log(`✅ Created ${conversations.length} conversations`);
    
    // 5. Create messages
    console.log('\n📨 Creating messages...');
    const messages = [
      {
        conversation_id: CONV_IDS.conv1,
        role: 'user',
        content: 'Hi, I am looking for a luxury penthouse in Manhattan.',
        token_count: 0,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        conversation_id: CONV_IDS.conv1,
        role: 'assistant',
        content: 'I can help you find the perfect penthouse. What is your budget?',
        token_count: 150,
        model: 'gpt-4',
        cost: 0.0045,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 30000).toISOString()
      },
      {
        conversation_id: CONV_IDS.conv2,
        role: 'user',
        content: 'Do you have commercial properties?',
        token_count: 0,
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        conversation_id: CONV_IDS.conv2,
        role: 'assistant',
        content: 'Yes, we have several commercial properties available.',
        token_count: 120,
        model: 'gpt-4',
        cost: 0.0036,
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 30000).toISOString()
      }
    ];
    
    for (const msg of messages) {
      const { error } = await supabase
        .from('messages')
        .insert(msg);
      
      if (error) {
        console.error(`Message error:`, error.message);
      }
    }
    console.log(`✅ Created ${messages.length} messages`);
    
    // 6. Create leads
    console.log('\n🎯 Creating leads...');
    const leads = [
      {
        organization_id: TEST_ORG_ID,
        conversation_id: CONV_IDS.conv1,
        name: 'Alice Johnson',
        email: 'alice.johnson@example.com',
        phone: '+1-555-0101',
        mobile_number: '+1-555-0101',
        full_name: 'Alice Johnson',
        status: 'qualified',
        score: 88,
        lead_score: 88,
        lead_classification: 'Hot',
        bant_budget: 95,
        bant_authority: 85,
        bant_need: 90,
        bant_timeline: 82,
        bant_completion: 100,
        budget_range: 'high',
        budget_details: '$5M-$8M',
        timeline: '1-3m',
        timeline_readable: 'Within 3 months',
        authority: 'individual',
        authority_details: 'Primary decision maker',
        need: 'residence',
        need_details: 'Luxury penthouse in Manhattan',
        property_type: 'Luxury Residential',
        location_preference: 'Manhattan',
        notes: 'High-value prospect',
        source: 'web',
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        organization_id: TEST_ORG_ID,
        conversation_id: CONV_IDS.conv2,
        name: 'Bob Smith',
        email: 'bob.smith@example.com',
        phone: '+1-555-0102',
        mobile_number: '+1-555-0102',
        full_name: 'Bob Smith',
        status: 'contacted',
        score: 65,
        lead_score: 65,
        lead_classification: 'Warm',
        bant_budget: 70,
        bant_authority: 60,
        bant_need: 75,
        bant_timeline: 55,
        bant_completion: 50,
        budget_range: 'medium',
        budget_details: '$30K-$50K/month',
        timeline: '3-6m',
        timeline_readable: 'Within 6 months',
        authority: 'shared',
        authority_details: 'Needs board approval',
        need: 'investment',
        need_details: 'Commercial office space',
        property_type: 'Commercial',
        location_preference: 'Financial District',
        notes: 'Tech startup founder',
        source: 'facebook',
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    
    for (const lead of leads) {
      const { error } = await supabase
        .from('leads')
        .insert(lead);
      
      if (error) {
        console.error(`Lead error:`, error.message);
      }
    }
    console.log(`✅ Created ${leads.length} leads with BANT scores`);
    
    // 7. Create issues
    console.log('\n🐛 Creating issues and features...');
    const issues = [
      {
        organization_id: TEST_ORG_ID,
        title: 'Chat widget not loading on mobile',
        description: 'The chat widget fails to load on mobile devices',
        status: 'open',
        priority: 'high',
        type: 'bug',
        created_by: TEST_USER_ID,
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        organization_id: TEST_ORG_ID,
        title: 'Add WhatsApp integration',
        description: 'Support for WhatsApp Business API',
        status: 'planned',
        priority: 'medium',
        type: 'feature',
        created_by: TEST_USER_ID,
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        organization_id: TEST_ORG_ID,
        title: 'Improve response time',
        description: 'AI responses are slow during peak hours',
        status: 'in_progress',
        priority: 'medium',
        type: 'performance',
        created_by: TEST_USER_ID,
        assigned_to: MEMBER_IDS.john,
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    
    for (const issue of issues) {
      const { error } = await supabase
        .from('issues')
        .insert(issue);
      
      if (error) {
        console.error(`Issue error:`, error.message);
      }
    }
    console.log(`✅ Created ${issues.length} issues and features`);
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 Test data population complete!');
    console.log('='.repeat(60));
    console.log('\n📊 Summary:');
    console.log('• Organization: Leadify Real Estate AI (Enterprise)');
    console.log(`• Organization ID: ${TEST_ORG_ID}`);
    console.log('• Members: 5 (1 admin, 3 members, 1 viewer)');
    console.log('• AI Agents: 3 (2 with BANT, 1 support)');
    console.log('• Conversations: 3');
    console.log('• Messages: 4');
    console.log('• Leads: 2 (with full BANT scores)');
    console.log('• Issues: 3 (bug, feature, performance)');
    console.log('\n✅ Database is ready for testing!');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
populateTestData();