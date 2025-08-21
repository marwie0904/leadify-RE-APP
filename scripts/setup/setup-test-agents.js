#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupTestAgents() {
  console.log('🔧 SETTING UP TEST AGENTS');
  console.log('=' .repeat(60));
  
  try {
    // 1. Get user ID
    const { data: userData, error: userError } = await supabase.auth.admin
      .listUsers();
    
    if (userError) throw userError;
    
    const testUser = userData.users.find(u => u.email === 'marwie.ang.0904@gmail.com');
    
    if (!testUser) {
      console.error('❌ Test user not found');
      return;
    }
    
    console.log('✅ Found test user:', testUser.email);
    const userId = testUser.id;
    
    // 2. Create organization
    console.log('\n📢 Creating organization...');
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: 'Test Real Estate Agency',
        domain: 'testrealestate.com',
        settings: {
          features: {
            ai_agents: true,
            lead_management: true,
            conversation_tracking: true
          }
        }
      })
      .select()
      .single();
    
    if (orgError) {
      // Check if organization already exists
      const { data: existingOrg } = await supabase
        .from('organizations')
        .select('*')
        .eq('name', 'Test Real Estate Agency')
        .single();
      
      if (existingOrg) {
        console.log('  Organization already exists');
        var organizationId = existingOrg.id;
      } else {
        throw orgError;
      }
    } else {
      var organizationId = orgData.id;
      console.log('  ✅ Created organization:', orgData.name);
    }
    
    // 3. Add user as member
    console.log('\n👥 Adding user to organization...');
    const { error: memberError } = await supabase
      .from('organization_members')
      .upsert({
        organization_id: organizationId,
        user_id: userId,
        role: 'admin'
      }, {
        onConflict: 'organization_id,user_id'
      });
    
    if (memberError && !memberError.message.includes('duplicate')) {
      throw memberError;
    }
    console.log('  ✅ User added as admin');
    
    // 4. Create AI agents
    console.log('\n🤖 Creating AI agents...');
    
    const agents = [
      {
        name: 'ResidentialBot',
        type: 'residential',
        tone: 'professional',
        system_prompt: 'You are ResidentialBot, a professional real estate AI agent specializing in residential properties. Help users find their dream home.',
        welcome_message: 'Hello! I\'m ResidentialBot, your residential property specialist. How can I help you find your perfect home today?',
        bant_enabled: true,
        bant_config: {
          budget_threshold: 100000,
          timeline_hot: 30,
          timeline_warm: 90,
          scoring_weights: {
            budget: 0.3,
            authority: 0.3,
            need: 0.2,
            timeline: 0.2
          }
        }
      },
      {
        name: 'CommercialAssist',
        type: 'commercial',
        tone: 'business',
        system_prompt: 'You are CommercialAssist, a business-focused AI agent specializing in commercial real estate. Help businesses find ideal commercial properties.',
        welcome_message: 'Welcome! I\'m CommercialAssist, your commercial property expert. Let\'s discuss your business real estate needs.',
        bant_enabled: true,
        bant_config: {
          budget_threshold: 500000,
          timeline_hot: 30,
          timeline_warm: 90,
          scoring_weights: {
            budget: 0.35,
            authority: 0.35,
            need: 0.15,
            timeline: 0.15
          }
        }
      },
      {
        name: 'LuxuryAdvisor',
        type: 'luxury',
        tone: 'sophisticated',
        system_prompt: 'You are LuxuryAdvisor, an exclusive AI agent specializing in luxury real estate. Provide premium service for high-end property seekers.',
        welcome_message: 'Greetings! I\'m LuxuryAdvisor, specializing in exclusive luxury properties. How may I assist you with your premium real estate needs?',
        bant_enabled: true,
        bant_config: {
          budget_threshold: 1000000,
          timeline_hot: 60,
          timeline_warm: 120,
          scoring_weights: {
            budget: 0.4,
            authority: 0.3,
            need: 0.15,
            timeline: 0.15
          }
        }
      },
      {
        name: 'RentalHelper',
        type: 'rental',
        tone: 'friendly',
        system_prompt: 'You are RentalHelper, a friendly AI agent specializing in rental properties. Help tenants find perfect rental homes and apartments.',
        welcome_message: 'Hi there! I\'m RentalHelper, here to help you find the perfect rental property. What are you looking for?',
        bant_enabled: true,
        bant_config: {
          budget_threshold: 1000,
          timeline_hot: 14,
          timeline_warm: 30,
          scoring_weights: {
            budget: 0.25,
            authority: 0.25,
            need: 0.25,
            timeline: 0.25
          }
        }
      }
    ];
    
    for (const agent of agents) {
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .insert({
          ...agent,
          user_id: userId,
          organization_id: organizationId,
          status: 'active',
          active: true,
          language: 'en',
          token_usage: 0,
          conversation_count: 0
        })
        .select()
        .single();
      
      if (agentError) {
        // Check if agent already exists
        const { data: existingAgent } = await supabase
          .from('agents')
          .select('*')
          .eq('name', agent.name)
          .eq('organization_id', organizationId)
          .single();
        
        if (existingAgent) {
          console.log(`  ⚠️  ${agent.name} already exists`);
        } else {
          console.error(`  ❌ Failed to create ${agent.name}:`, agentError.message);
        }
      } else {
        console.log(`  ✅ Created ${agentData.name}`);
      }
    }
    
    // 5. Verify setup
    console.log('\n📊 Verifying setup...');
    const { data: verifyAgents, error: verifyError } = await supabase
      .from('agents')
      .select('id, name, type, status')
      .eq('organization_id', organizationId);
    
    if (verifyError) throw verifyError;
    
    console.log(`  ✅ Found ${verifyAgents.length} agents:`);
    verifyAgents.forEach(agent => {
      console.log(`    - ${agent.name} (${agent.type}) - ${agent.status}`);
    });
    
    console.log('\n' + '=' .repeat(60));
    console.log('✅ SETUP COMPLETE');
    console.log('You can now run the 80 conversations test!');
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.error('\n❌ Setup error:', error.message);
    console.error(error);
  }
}

// Execute
if (require.main === module) {
  setupTestAgents()
    .then(() => {
      console.log('\n✨ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    });
}