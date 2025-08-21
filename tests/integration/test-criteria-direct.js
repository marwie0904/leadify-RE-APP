const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = 'https://kbmsygyawpiqegemzetp.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtibXN5Z3lhd3BpcWVnZW16ZXRwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTc3ODgyMiwiZXhwIjoyMDY3MzU0ODIyfQ.Ul6La44d01oi6GYep4fvFOGeP2rBUEh57kfWLDB4uBI';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// BANT configuration matching what the frontend sends
const bantConfiguration = {
  enabled: true,
  budgetWeight: 30,
  authorityWeight: 25,
  needWeight: 25,
  timelineWeight: 15,
  contactWeight: 5,
  budgetRanges: ['Under $500K', '$500K-$1M', '$1M-$2M', 'Over $2M'],
  authorityRoles: ['Decision Maker', 'Influencer', 'End User', 'Other'],
  needUrgency: ['Immediate', 'This Quarter', 'This Year', 'Exploring'],
  timelineOptions: ['Within 1 month', '1-3 months', '3-6 months', '6+ months'],
  thresholds: {
    hot: 80,
    warm: 60,
    cold: 40
  }
};

// Function to generate criteria_prompt from BANT configuration
function generateCriteriaPrompt(bantConfig) {
  const budgetWeight = bantConfig.budgetWeight || 25;
  const authorityWeight = bantConfig.authorityWeight || 25;
  const needWeight = bantConfig.needWeight || 25;
  const timelineWeight = bantConfig.timelineWeight || 20;
  const contactWeight = bantConfig.contactWeight || 5;
  
  return `You are an AI assistant that scores leads based on BANT criteria.

**Weight Distribution:**
- Budget: ${budgetWeight} points
- Authority: ${authorityWeight} points
- Need: ${needWeight} points
- Timeline: ${timelineWeight} points
- Contact: ${contactWeight} points

**Budget Criteria:**
${bantConfig.budgetRanges ? bantConfig.budgetRanges.join(', ') : 'Any budget'}

**Authority Criteria:**
${bantConfig.authorityRoles ? bantConfig.authorityRoles.join(', ') : 'Any role'}

**Need Criteria:**
${bantConfig.needUrgency ? bantConfig.needUrgency.join(', ') : 'Any urgency level'}

**Timeline Criteria:**
${bantConfig.timelineOptions ? bantConfig.timelineOptions.join(', ') : 'Any timeline'}

**Scoring Thresholds:**
- Hot Lead: ${bantConfig.thresholds?.hot || 80}+ points
- Warm Lead: ${bantConfig.thresholds?.warm || 60}-${(bantConfig.thresholds?.hot || 80) - 1} points
- Cold Lead: ${bantConfig.thresholds?.cold || 40}-${(bantConfig.thresholds?.warm || 60) - 1} points
- Not Qualified: Below ${bantConfig.thresholds?.cold || 40} points

Analyze the conversation and score the lead based on the information gathered.
Calculate the weighted score for each category and provide a total BANT score (0-100).`;
}

async function testDirectInsert() {
  console.log('====================================');
  console.log('🧪 DIRECT CRITERIA_PROMPT TEST');
  console.log('====================================');
  console.log('Testing criteria_prompt generation directly');
  console.log('====================================\n');
  
  try {
    // Generate the criteria_prompt
    const criteriaPrompt = generateCriteriaPrompt(bantConfiguration);
    
    console.log('📋 Generated criteria_prompt:');
    console.log('  Length:', criteriaPrompt.length, 'characters');
    console.log('  First 500 characters:');
    console.log('  ---');
    console.log(criteriaPrompt.substring(0, 500) + '...');
    console.log('  ---\n');
    
    // Check for expected elements
    const promptContent = criteriaPrompt.toLowerCase();
    const expectedElements = [
      'bant criteria',
      'budget',
      'authority',
      'need',
      'timeline',
      'contact',
      'weight distribution',
      'score'
    ];
    
    console.log('🔍 Checking for expected elements:');
    let allElementsFound = true;
    for (const element of expectedElements) {
      const found = promptContent.includes(element);
      console.log(`  ${found ? '✅' : '❌'} Contains "${element}"`);
      if (!found) allElementsFound = false;
    }
    
    console.log('\n🔍 Checking for specific weights:');
    const hasWeights = 
      criteriaPrompt.includes('30 points') && // Budget weight
      criteriaPrompt.includes('25 points') && // Authority weight
      criteriaPrompt.includes('15 points') && // Timeline weight
      criteriaPrompt.includes('5 points');    // Contact weight
    
    console.log(`  ${hasWeights ? '✅' : '❌'} Contains correct weight values`);
    
    console.log('\n🔍 Checking for budget ranges:');
    const hasBudgetRanges = bantConfiguration.budgetRanges.every(range => 
      criteriaPrompt.includes(range)
    );
    console.log(`  ${hasBudgetRanges ? '✅' : '❌'} Contains all budget ranges`);
    
    console.log('\n====================================');
    console.log('📊 TEST RESULTS');
    console.log('====================================');
    
    if (allElementsFound && hasWeights && hasBudgetRanges) {
      console.log('✅ SUCCESS: Criteria prompt is properly generated!');
      console.log('\n📝 This is the prompt that SHOULD be saved to the database');
      console.log('   when creating an agent with BANT configuration.');
      console.log('\n🎯 The backend fix should generate and save this prompt');
      console.log('   to the agent_configs table during agent creation.');
    } else {
      console.log('❌ FAILURE: Criteria prompt generation has issues');
    }
    
    console.log('====================================\n');
    
    // Now let's check an existing agent to see what's in the database
    console.log('🔍 Checking existing agents in database...');
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select(`
        id,
        name,
        organization_id,
        agent_configs!inner(
          criteria_prompt
        )
      `)
      .limit(5);
    
    if (agentsError) {
      console.log('❌ Error fetching agents:', agentsError.message);
    } else if (agents && agents.length > 0) {
      console.log(`\n📊 Found ${agents.length} agents in database:`);
      for (const agent of agents) {
        console.log(`\n  Agent: ${agent.name}`);
        console.log(`  ID: ${agent.id}`);
        console.log(`  Organization: ${agent.organization_id}`);
        
        if (agent.agent_configs && agent.agent_configs.length > 0) {
          const config = agent.agent_configs[0];
          if (config.criteria_prompt) {
            const isProperPrompt = config.criteria_prompt.length > 100 && 
                                  config.criteria_prompt.includes('BANT');
            console.log(`  Criteria Prompt: ${isProperPrompt ? '✅ Properly set' : '❌ Improperly set'}`);
            console.log(`    Length: ${config.criteria_prompt.length} characters`);
            console.log(`    First 100 chars: ${config.criteria_prompt.substring(0, 100)}...`);
          } else {
            console.log('  Criteria Prompt: ❌ Not set (NULL)');
          }
        } else {
          console.log('  Criteria Prompt: ❌ No agent_configs entry');
        }
      }
    } else {
      console.log('⚠️  No agents found in database');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error(error);
  }
}

// Run the test
testDirectInsert();