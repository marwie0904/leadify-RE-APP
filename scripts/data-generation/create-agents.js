const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// AI Agent configurations for each organization
const agentConfigs = [
  {
    org_name: 'Prime Residential Realty',
    agent: {
      name: 'ResidentialBot',
      greeting_message: 'Hello! Welcome to Prime Residential Realty. I\'m here to help you find your dream home. How can I assist you today?',
      system_prompt: 'You are a helpful real estate assistant specializing in residential properties. Focus on single-family homes, condos, and townhouses.',
      bant_questions: {
        budget: 'What is your budget range for purchasing a home?',
        authority: 'Are you the primary decision-maker for this purchase, or will others be involved?',
        need: 'What specific features are you looking for in your new home?',
        timeline: 'When are you looking to move into your new home?'
      },
      bant_weights: {
        budget: 35,
        authority: 20,
        need: 25,
        timeline: 20
      },
      bant_criteria: {
        budget: 'Has realistic budget for local market',
        authority: 'Is decision maker or key influencer',
        need: 'Has clear requirements and preferences',
        timeline: 'Plans to buy within 6 months'
      },
      bant_thresholds: {
        hot: 85,
        warm: 60,
        cold: 40
      }
    }
  },
  {
    org_name: 'Commercial Property Experts',
    agent: {
      name: 'CommercialAssist',
      greeting_message: 'Welcome to Commercial Property Experts! I specialize in helping businesses find the perfect commercial space. What type of property are you interested in?',
      system_prompt: 'You are a commercial real estate expert. Focus on office spaces, retail locations, warehouses, and industrial properties.',
      bant_questions: {
        budget: 'What is your monthly budget for leasing or your investment budget for purchasing?',
        authority: 'Are you authorized to make real estate decisions for your company?',
        need: 'What type of commercial space does your business require?',
        timeline: 'When do you need to occupy the new space?'
      },
      bant_weights: {
        budget: 30,
        authority: 30,
        need: 20,
        timeline: 20
      },
      bant_criteria: {
        budget: 'Has approved commercial budget',
        authority: 'Has corporate authorization',
        need: 'Has specific business requirements',
        timeline: 'Needs space within 3 months'
      },
      bant_thresholds: {
        hot: 80,
        warm: 55,
        cold: 35
      }
    }
  },
  {
    org_name: 'Luxury Estate Partners',
    agent: {
      name: 'LuxuryAdvisor',
      greeting_message: 'Greetings and welcome to Luxury Estate Partners. I\'m here to help you discover exceptional luxury properties. How may I assist you in finding your perfect estate?',
      system_prompt: 'You are a luxury real estate specialist dealing with high-end properties, estates, and exclusive listings. Maintain a sophisticated and professional tone.',
      bant_questions: {
        budget: 'What is your investment range for a luxury property?',
        authority: 'Will you be the sole purchaser or are there other stakeholders?',
        need: 'What amenities and features are essential for your luxury home?',
        timeline: 'What is your preferred timeline for acquiring the property?'
      },
      bant_weights: {
        budget: 40,
        authority: 15,
        need: 30,
        timeline: 15
      },
      bant_criteria: {
        budget: 'Qualified for luxury market segment',
        authority: 'Primary decision maker identified',
        need: 'Specific luxury requirements defined',
        timeline: 'Flexible but committed buyer'
      },
      bant_thresholds: {
        hot: 90,
        warm: 70,
        cold: 45
      }
    }
  },
  {
    org_name: 'Urban Rental Solutions',
    agent: {
      name: 'RentalHelper',
      greeting_message: 'Hi there! Welcome to Urban Rental Solutions. I\'m here to help you find the perfect rental property. What brings you here today?',
      system_prompt: 'You are a rental property specialist focusing on apartments, rental homes, and short-term rentals. Be friendly and helpful.',
      bant_questions: {
        budget: 'What is your monthly rental budget?',
        authority: 'Will you be the primary tenant on the lease?',
        need: 'What are your must-have features in a rental property?',
        timeline: 'When do you need to move in?'
      },
      bant_weights: {
        budget: 25,
        authority: 25,
        need: 20,
        timeline: 30
      },
      bant_criteria: {
        budget: 'Can afford market rental rates',
        authority: 'Can sign lease agreement',
        need: 'Clear rental requirements',
        timeline: 'Needs housing within 30 days'
      },
      bant_thresholds: {
        hot: 75,
        warm: 50,
        cold: 30
      }
    }
  }
];

async function createAgents() {
  console.log('🤖 Starting AI agent creation...');
  const createdAgents = [];
  
  try {
    // Get all organizations
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('*');
    
    if (orgsError) {
      throw orgsError;
    }
    
    for (const config of agentConfigs) {
      const org = orgs.find(o => o.name === config.org_name);
      
      if (!org) {
        console.error(`❌ Organization not found: ${config.org_name}`);
        continue;
      }
      
      console.log(`\n🤖 Creating agent for: ${org.name}`);
      
      // Get the admin user for this organization
      const { data: adminMember, error: memberError } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', org.id)
        .eq('role', 'admin')
        .single();
      
      if (memberError || !adminMember) {
        console.error(`❌ Admin not found for ${org.name}`);
        continue;
      }
      
      // Create the agent
      const agentData = {
        user_id: adminMember.user_id,
        organization_id: org.id,
        name: config.agent.name,
        greeting_message: config.agent.greeting_message,
        system_prompt: config.agent.system_prompt,
        language: 'English',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        
        // BANT configuration
        bant_questions: config.agent.bant_questions,
        bant_weights: config.agent.bant_weights,
        bant_criteria: config.agent.bant_criteria,
        bant_thresholds: config.agent.bant_thresholds,
        
        // Additional settings
        max_tokens: 500,
        temperature: 0.7,
        model: 'gpt-4-turbo-preview'
      };
      
      const { data: newAgent, error: agentError } = await supabase
        .from('agents')
        .insert(agentData)
        .select()
        .single();
      
      if (agentError) {
        console.error(`❌ Error creating agent for ${org.name}:`, agentError);
        continue;
      }
      
      createdAgents.push(newAgent);
      console.log(`✅ Created agent: ${newAgent.name}`);
      console.log(`   - BANT Thresholds: Hot>${config.agent.bant_thresholds.hot}, Warm>${config.agent.bant_thresholds.warm}, Cold>${config.agent.bant_thresholds.cold}`);
      console.log(`   - BANT Weights: B:${config.agent.bant_weights.budget}%, A:${config.agent.bant_weights.authority}%, N:${config.agent.bant_weights.need}%, T:${config.agent.bant_weights.timeline}%`);
    }
    
    console.log(`\n📊 Summary: Created ${createdAgents.length} AI agents`);
    return createdAgents;
    
  } catch (error) {
    console.error('❌ Error creating agents:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  createAgents().then((agents) => {
    console.log('\n🎉 AI agent creation completed!');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Process failed:', error);
    process.exit(1);
  });
}

module.exports = { createAgents, agentConfigs };