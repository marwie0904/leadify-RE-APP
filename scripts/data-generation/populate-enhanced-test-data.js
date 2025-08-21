#!/usr/bin/env node

/**
 * Enhanced Test Data Population Script
 * Populates database with comprehensive test data after schema migration
 * 
 * This script creates:
 * - Organizations with proper status and plan
 * - Organization members with roles and timestamps
 * - AI agents with BANT configurations
 * - Conversations with token tracking
 * - Messages with token counts
 * - Leads with full BANT scores
 * - Issues and feature requests
 */

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

async function clearExistingData() {
  console.log('🧹 Clearing existing test data...');
  
  const testOrgId = '9a24d180-a1fe-4d22-91e2-066d55679888';
  
  // Delete in reverse dependency order
  await supabase.from('messages').delete().match({ conversation_id: 'conv-test-1' });
  await supabase.from('messages').delete().match({ conversation_id: 'conv-test-2' });
  await supabase.from('messages').delete().match({ conversation_id: 'conv-test-3' });
  
  await supabase.from('leads').delete().match({ organization_id: testOrgId });
  await supabase.from('issues').delete().match({ organization_id: testOrgId });
  await supabase.from('conversations').delete().match({ organization_id: testOrgId });
  await supabase.from('agents').delete().match({ organization_id: testOrgId });
  await supabase.from('organization_members').delete().match({ organization_id: testOrgId });
  await supabase.from('organizations').delete().match({ id: testOrgId });
  
  console.log('✅ Existing data cleared\n');
}

async function populateEnhancedTestData() {
  console.log('🚀 Starting enhanced test data population...\n');
  console.log('=' .repeat(60));
  
  try {
    // Clear existing test data first
    await clearExistingData();
    
    // 1. Create test user (if not exists)
    console.log('📱 Creating test user...');
    const testUserId = 'user-test-' + Date.now();
    const testUserEmail = 'test.admin@realestate.ai';
    
    // Note: In production, you'd create a real user via Supabase Auth
    // For testing, we'll use a static ID
    console.log(`✅ Using test user ID: ${testUserId}\n`);
    
    // 2. Create test organization with all required fields
    console.log('🏢 Creating test organization...');
    const orgData = {
      id: '9a24d180-a1fe-4d22-91e2-066d55679888',
      name: 'Leadify Real Estate AI',
      owner_id: testUserId,
      status: 'active',
      plan: 'enterprise',
      created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
      updated_at: new Date().toISOString()
    };
    
    const { error: orgError } = await supabase
      .from('organizations')
      .insert(orgData);
    
    if (orgError) {
      console.error('Organization error:', orgError);
    } else {
      console.log('✅ Organization created:', orgData.name);
    }
    
    // 3. Add organization members with proper roles and timestamps
    console.log('\n👥 Adding organization members...');
    const members = [
      {
        organization_id: orgData.id,
        user_id: testUserId,
        role: 'admin',
        status: 'active',
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        joined_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        organization_id: orgData.id,
        user_id: 'user-john-developer',
        role: 'member',
        status: 'active',
        created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
        joined_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        organization_id: orgData.id,
        user_id: 'user-jane-designer',
        role: 'member',
        status: 'active',
        created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        joined_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        organization_id: orgData.id,
        user_id: 'user-bob-viewer',
        role: 'viewer',
        status: 'active',
        created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        joined_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        organization_id: orgData.id,
        user_id: 'user-alice-sales',
        role: 'member',
        status: 'invited',
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        joined_at: null
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
    
    // 4. Create AI agents with full BANT configuration
    console.log('\n🤖 Creating AI agents with BANT configs...');
    const agents = [
      {
        id: 'agent-sales-expert',
        user_id: testUserId,
        organization_id: orgData.id,
        name: 'Elite Sales Pro',
        type: 'sales',
        tone: 'Professional',
        status: 'ready',
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
          criteria: {
            budget: {
              high: { min: 1000000, score: 100 },
              medium: { min: 500000, max: 999999, score: 70 },
              low: { max: 499999, score: 40 }
            },
            authority: {
              decision_maker: { score: 100 },
              influencer: { score: 70 },
              end_user: { score: 40 }
            },
            need: {
              immediate: { score: 100 },
              planned: { score: 70 },
              exploring: { score: 40 }
            },
            timeline: {
              within_month: { score: 100 },
              within_quarter: { score: 70 },
              within_year: { score: 50 },
              beyond_year: { score: 30 }
            }
          },
          questions: {
            budget: 'What is your budget range for this property investment?',
            authority: 'Are you the primary decision maker for this purchase?',
            need: 'What specific requirements are most important to you?',
            timeline: 'When are you planning to make this investment?'
          },
          scoring_strategy: 'weighted_average'
        },
        system_prompt: 'You are an elite real estate sales expert specializing in luxury properties and investment opportunities. Focus on understanding client needs and providing tailored solutions.',
        token_usage: 125000,
        conversation_count: 45,
        created_at: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'agent-support-specialist',
        user_id: testUserId,
        organization_id: orgData.id,
        name: 'Customer Success AI',
        type: 'support',
        tone: 'Friendly',
        status: 'ready',
        active: true,
        bant_enabled: false,
        bant_config: {},
        system_prompt: 'You are a helpful and friendly customer support specialist for real estate inquiries. Provide clear, concise answers and guide customers through their journey.',
        token_usage: 75000,
        conversation_count: 120,
        created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'agent-technical-advisor',
        user_id: testUserId,
        organization_id: orgData.id,
        name: 'Property Tech Advisor',
        type: 'technical',
        tone: 'Neutral',
        status: 'ready',
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
          },
          questions: {
            budget: 'What is your investment capacity?',
            authority: 'Who else is involved in this decision?',
            need: 'What are your primary property requirements?',
            timeline: 'What is your target closing date?'
          }
        },
        system_prompt: 'You are a technical property advisor specializing in market analysis, property valuation, and investment strategies.',
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
        console.error(`Agent error for ${agent.name}:`, error.message);
      }
    }
    console.log(`✅ Created ${agents.length} AI agents with BANT configurations`);
    
    // 5. Create conversations with proper metadata
    console.log('\n💬 Creating conversations with metadata...');
    const conversations = [
      {
        id: 'conv-test-1',
        agent_id: 'agent-sales-expert',
        organization_id: orgData.id,
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
        id: 'conv-test-2',
        agent_id: 'agent-sales-expert',
        organization_id: orgData.id,
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
        id: 'conv-test-3',
        agent_id: 'agent-support-specialist',
        organization_id: orgData.id,
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
    
    // 6. Create messages with token counts
    console.log('\n📨 Creating messages with token tracking...');
    const messages = [
      // Conversation 1 - Full BANT qualification flow
      {
        conversation_id: 'conv-test-1',
        role: 'user',
        content: 'Hi, I am looking for a luxury penthouse in Manhattan with a view of Central Park.',
        token_count: 0,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        conversation_id: 'conv-test-1',
        role: 'assistant',
        content: 'Excellent choice! Manhattan penthouses with Central Park views are truly exceptional properties. To help you find the perfect match, may I ask what is your budget range for this investment?',
        token_count: 320,
        model: 'gpt-4',
        cost: 0.0096,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 30000).toISOString()
      },
      {
        conversation_id: 'conv-test-1',
        role: 'user',
        content: 'My budget is between $5 million to $8 million.',
        token_count: 0,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 60000).toISOString()
      },
      {
        conversation_id: 'conv-test-1',
        role: 'assistant',
        content: 'Perfect! That budget opens up some stunning options in prime locations. Are you the primary decision maker for this purchase, or will others be involved in the decision?',
        token_count: 280,
        model: 'gpt-4',
        cost: 0.0084,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 90000).toISOString()
      },
      {
        conversation_id: 'conv-test-1',
        role: 'user',
        content: 'I am the primary decision maker, but I will consult with my financial advisor.',
        token_count: 0,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 120000).toISOString()
      },
      {
        conversation_id: 'conv-test-1',
        role: 'assistant',
        content: 'Understood. It\'s wise to involve your financial advisor in such an important investment. What specific requirements are most important to you beyond the Central Park view?',
        token_count: 290,
        model: 'gpt-4',
        cost: 0.0087,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 150000).toISOString()
      },
      {
        conversation_id: 'conv-test-1',
        role: 'user',
        content: 'I need at least 3 bedrooms, modern amenities, and preferably a building with a gym and concierge service.',
        token_count: 0,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 180000).toISOString()
      },
      {
        conversation_id: 'conv-test-1',
        role: 'assistant',
        content: 'Excellent requirements! Full-service luxury buildings with those amenities are available. When are you planning to make this investment? This will help me prioritize available properties.',
        token_count: 310,
        model: 'gpt-4',
        cost: 0.0093,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 210000).toISOString()
      },
      
      // Conversation 2 - Partial BANT
      {
        conversation_id: 'conv-test-2',
        role: 'user',
        content: 'Do you have any commercial properties in the financial district?',
        token_count: 0,
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        conversation_id: 'conv-test-2',
        role: 'assistant',
        content: 'Yes, we have several excellent commercial properties in the financial district! These range from office spaces to retail locations. What type of commercial property are you interested in, and what\'s your intended use?',
        token_count: 350,
        model: 'gpt-4',
        cost: 0.0105,
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 30000).toISOString()
      },
      {
        conversation_id: 'conv-test-2',
        role: 'user',
        content: 'Office space for my tech startup. We need room for about 50 employees.',
        token_count: 0,
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 60000).toISOString()
      },
      {
        conversation_id: 'conv-test-2',
        role: 'assistant',
        content: 'Great! For a 50-person tech startup, you\'ll need approximately 7,500-10,000 sq ft depending on your layout preferences. What\'s your budget range for monthly rent or are you looking to purchase?',
        token_count: 380,
        model: 'gpt-4',
        cost: 0.0114,
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 90000).toISOString()
      },
      
      // Conversation 3 - Support conversation
      {
        conversation_id: 'conv-test-3',
        role: 'user',
        content: 'How do I schedule a property viewing?',
        token_count: 0,
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        conversation_id: 'conv-test-3',
        role: 'assistant',
        content: 'I\'d be happy to help you schedule a property viewing! You can either select a property from our listings and click "Schedule Viewing", or I can assist you directly. Which property are you interested in viewing?',
        token_count: 340,
        model: 'gpt-4',
        cost: 0.0102,
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 30000).toISOString()
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
    console.log(`✅ Created ${messages.length} messages with token tracking`);
    
    // 7. Create leads with full BANT scores
    console.log('\n🎯 Creating leads with BANT scores...');
    const leads = [
      {
        organization_id: orgData.id,
        conversation_id: 'conv-test-1',
        name: 'Alice Johnson',
        email: 'alice.johnson@example.com',
        phone: '+1-555-0101',
        status: 'qualified',
        score: 88,
        bant_budget: 95,
        bant_authority: 85,
        bant_need: 90,
        bant_timeline: 82,
        bant_completion: 100,
        budget_range: '$5M-$8M',
        property_type: 'Luxury Residential',
        location_preference: 'Manhattan - Central Park',
        notes: 'High-value prospect, ready to move forward',
        source: 'web',
        lead_score: 88,
        lead_classification: 'Hot',
        lead_score_justification: 'High budget, decision maker, clear requirements, ready to purchase within 3 months',
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        organization_id: orgData.id,
        conversation_id: 'conv-test-2',
        name: 'Bob Smith',
        email: 'bob.smith@example.com',
        phone: '+1-555-0102',
        status: 'contacted',
        score: 65,
        bant_budget: 70,
        bant_authority: 60,
        bant_need: 75,
        bant_timeline: 55,
        bant_completion: 50,
        budget_range: '$30K-$50K/month',
        property_type: 'Commercial Office',
        location_preference: 'Financial District',
        notes: 'Tech startup founder, exploring options',
        source: 'facebook',
        lead_score: 65,
        lead_classification: 'Warm',
        lead_score_justification: 'Good budget, some authority, clear need but timeline uncertain',
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        organization_id: orgData.id,
        name: 'David Wilson',
        email: 'david.wilson@example.com',
        phone: '+1-555-0104',
        status: 'new',
        score: 45,
        bant_budget: 50,
        bant_authority: 40,
        bant_need: 45,
        bant_timeline: 45,
        bant_completion: 25,
        budget_range: 'Under $1M',
        property_type: 'Residential',
        location_preference: 'Brooklyn',
        notes: 'Early stage, needs nurturing',
        source: 'web',
        lead_score: 45,
        lead_classification: 'Cold',
        lead_score_justification: 'Limited budget, not decision maker, exploring options',
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        organization_id: orgData.id,
        name: 'Emma Davis',
        email: 'emma.davis@example.com',
        phone: '+1-555-0105',
        status: 'nurturing',
        score: 72,
        bant_budget: 80,
        bant_authority: 70,
        bant_need: 65,
        bant_timeline: 73,
        bant_completion: 75,
        budget_range: '$2M-$3M',
        property_type: 'Investment Property',
        location_preference: 'Multiple Locations',
        notes: 'Investor looking for rental properties',
        source: 'web',
        lead_score: 72,
        lead_classification: 'Warm',
        lead_score_justification: 'Good budget, decision maker, investment focus, 6-month timeline',
        created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    
    for (const lead of leads) {
      const { error } = await supabase
        .from('leads')
        .insert(lead);
      
      if (error) {
        console.error(`Lead error for ${lead.name}:`, error.message);
      }
    }
    console.log(`✅ Created ${leads.length} leads with BANT scores`);
    
    // 8. Create issues and feature requests
    console.log('\n🐛 Creating issues and feature requests...');
    const issues = [
      {
        organization_id: orgData.id,
        title: 'Chat widget not loading on mobile Safari',
        description: 'The chat widget fails to initialize on iOS devices running Safari. Console shows WebSocket connection errors.',
        status: 'open',
        priority: 'high',
        type: 'bug',
        created_by: testUserId,
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        organization_id: orgData.id,
        title: 'Slow AI response during peak hours',
        description: 'Response times increase from 2s to 8s during business hours (9am-5pm EST)',
        status: 'in_progress',
        priority: 'medium',
        type: 'performance',
        created_by: testUserId,
        assigned_to: 'user-john-developer',
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        organization_id: orgData.id,
        title: 'Add WhatsApp Business integration',
        description: 'Clients requesting WhatsApp as a communication channel for international customers',
        status: 'planned',
        priority: 'medium',
        type: 'feature',
        created_by: testUserId,
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        organization_id: orgData.id,
        title: 'Export leads to CSV/Excel',
        description: 'Need ability to export lead data with BANT scores for offline analysis and CRM import',
        status: 'open',
        priority: 'low',
        type: 'enhancement',
        created_by: testUserId,
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        organization_id: orgData.id,
        title: 'Security audit findings',
        description: 'Implement rate limiting on API endpoints to prevent abuse',
        status: 'resolved',
        priority: 'critical',
        type: 'security',
        created_by: testUserId,
        assigned_to: 'user-john-developer',
        resolved_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
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
    console.log(`✅ Created ${issues.length} issues and feature requests`);
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 Enhanced test data population complete!');
    console.log('='.repeat(60));
    console.log('\n📊 Summary:');
    console.log('• Organization: Leadify Real Estate AI (Enterprise)');
    console.log('• Organization ID: 9a24d180-a1fe-4d22-91e2-066d55679888');
    console.log('• Members: 5 (1 admin, 3 members, 1 viewer)');
    console.log('• AI Agents: 3 (2 with BANT, 1 support)');
    console.log('• Conversations: 3 (with token tracking)');
    console.log('• Messages: 14 (with token counts)');
    console.log('• Leads: 4 (with full BANT scores)');
    console.log('• Issues: 5 (bugs, features, enhancements)');
    console.log('\n✅ Database is ready for comprehensive testing!');
    console.log('Run test-real-backend-final.js to verify everything works.');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the population script
populateEnhancedTestData();