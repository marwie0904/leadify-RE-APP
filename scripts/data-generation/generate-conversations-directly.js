const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Conversation templates
const templates = {
  hot: [
    { score: 90, messages: ["I need to buy a home urgently", "My budget is $800,000", "I'm the decision maker", "Need 4 bedrooms", "Must move in 30 days"] },
    { score: 88, messages: ["Cash buyer here", "$1.5 million budget", "Looking for investment property", "Ready to close immediately"] },
    { score: 92, messages: ["Pre-approved for $600k", "First time buyer", "Need to move next month", "Looking for good schools"] },
    { score: 85, messages: ["Relocating for work", "Company is paying", "$900k budget", "Need home by next month"] }
  ],
  warm: [
    { score: 65, messages: ["Interested in buying", "Budget around $400k", "Need to discuss with spouse", "Looking for 3 bedrooms", "Maybe in 3 months"] },
    { score: 70, messages: ["Exploring options", "$500k budget possibly", "Just started looking", "Want a nice neighborhood"] },
    { score: 68, messages: ["Thinking about investing", "Have some savings", "Not in a rush", "Want good ROI"] },
    { score: 72, messages: ["Might buy this year", "Decent budget", "Still comparing areas", "Family of four"] }
  ],
  cold: [
    { score: 35, messages: ["Just browsing", "Not sure about budget", "Maybe next year", "Just curious"] },
    { score: 30, messages: ["Window shopping", "Can't afford much", "Dreams of owning", "Long term goal"] },
    { score: 38, messages: ["Checking prices", "No timeline", "Just researching", "Not ready yet"] },
    { score: 32, messages: ["Market research", "Academic interest", "Writing a report", "Not buying"] }
  ],
  nonResponsive: [
    { score: 15, messages: ["Hi", "Ok", "Thanks", "Bye"] },
    { score: 10, messages: ["Hello", "Yes", "No", "Maybe"] },
    { score: 12, messages: ["Hey", "...", "Not sure", "Later"] },
    { score: 18, messages: ["Hi there", "Hmm", "I see", "Got it"] }
  ],
  handoff: [
    { score: 0, handoff: true, messages: ["I need legal advice", "Can I speak to a human?", "This is too complex", "I have special circumstances", "Need expert help"] },
    { score: 0, handoff: true, messages: ["Tax question", "Estate planning", "Inheritance issue", "Legal matter", "Speak to agent please"] },
    { score: 0, handoff: true, messages: ["Corporate purchase", "1031 exchange", "Complex financing", "Multiple properties", "Need human agent"] },
    { score: 0, handoff: true, messages: ["Confidential matter", "Special requirements", "Off-market deal", "Discrete transaction", "Human only please"] }
  ]
};

async function generateConversations() {
  console.log('💬 Generating conversations directly in database...');
  
  try {
    // Get agents
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('id, name, organization_id');
    
    if (agentsError) throw agentsError;
    
    console.log(`Found ${agents.length} agents`);
    
    let totalCreated = 0;
    
    for (const agent of agents) {
      console.log(`\n🤖 Creating conversations for ${agent.name}...`);
      
      // Create 20 conversations per agent (4 of each type)
      const types = ['hot', 'warm', 'cold', 'nonResponsive', 'handoff'];
      
      for (const type of types) {
        for (let i = 0; i < 4; i++) {
          const template = templates[type][i % templates[type].length];
          const conversationId = uuidv4();
          
          // Create conversation
          const { data: conv, error: convError } = await supabase
            .from('conversations')
            .insert({
              id: conversationId,
              agent_id: agent.id,
              organization_id: agent.organization_id,
              status: template.handoff ? 'handoff_requested' : 'active',
              source: 'web',
              metadata: { type: type, template_index: i },
              created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(), // Random time in last 7 days
              updated_at: new Date().toISOString()
            })
            .select()
            .single();
          
          if (convError) {
            console.error(`  ❌ Error creating conversation:`, convError);
            continue;
          }
          
          // Create messages
          let messageTime = new Date(conv.created_at);
          for (const message of template.messages) {
            // User message
            await supabase
              .from('messages')
              .insert({
                conversation_id: conversationId,
                content: message,
                role: 'user',
                created_at: messageTime.toISOString()
              });
            
            messageTime = new Date(messageTime.getTime() + 30000); // Add 30 seconds
            
            // AI response
            const aiResponse = type === 'handoff' 
              ? "I understand you need specialized assistance. Let me connect you with a human agent who can better help with your specific needs."
              : `Thank you for your message. Based on what you've shared about "${message}", I can help you find the perfect property. What specific features are most important to you?`;
            
            await supabase
              .from('messages')
              .insert({
                conversation_id: conversationId,
                content: aiResponse,
                role: 'assistant',
                created_at: messageTime.toISOString()
              });
            
            messageTime = new Date(messageTime.getTime() + 45000); // Add 45 seconds
          }
          
          // Create lead if not handoff
          if (!template.handoff && template.score > 0) {
            const leadData = {
              conversation_id: conversationId,
              organization_id: agent.organization_id,
              agent_id: agent.id,
              name: `Test Lead ${type} ${i + 1}`,
              email: `lead_${type}_${i}@test.com`,
              phone: `555-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
              bant_score: template.score,
              bant_budget: template.score > 70 ? 'Qualified' : template.score > 40 ? 'Moderate' : 'Low',
              bant_authority: template.score > 60 ? 'Decision Maker' : 'Influencer',
              bant_need: template.score > 50 ? 'Immediate' : 'Future',
              bant_timeline: template.score > 70 ? '< 1 month' : template.score > 40 ? '1-3 months' : '> 3 months',
              status: template.score > 70 ? 'hot' : template.score > 40 ? 'warm' : 'cold',
              source: 'web',
              created_at: conv.created_at,
              updated_at: new Date().toISOString()
            };
            
            const { error: leadError } = await supabase
              .from('leads')
              .insert(leadData);
            
            if (leadError) {
              console.error(`  ❌ Error creating lead:`, leadError);
            }
          }
          
          // Create handoff record if needed
          if (template.handoff) {
            await supabase
              .from('conversation_handoffs')
              .insert({
                conversation_id: conversationId,
                agent_id: agent.id,
                reason: 'User requested human agent for complex query',
                status: 'pending',
                created_at: new Date().toISOString()
              });
          }
          
          totalCreated++;
          console.log(`  ✅ Created ${type} conversation #${i + 1}`);
        }
      }
    }
    
    // Create some AI token usage records
    for (const agent of agents) {
      const tokenUsage = {
        organization_id: agent.organization_id,
        agent_id: agent.id,
        model: 'gpt-4-turbo-preview',
        prompt_tokens: Math.floor(Math.random() * 5000) + 1000,
        completion_tokens: Math.floor(Math.random() * 2000) + 500,
        total_tokens: 0,
        cost: 0,
        created_at: new Date().toISOString()
      };
      tokenUsage.total_tokens = tokenUsage.prompt_tokens + tokenUsage.completion_tokens;
      tokenUsage.cost = (tokenUsage.prompt_tokens * 0.01 + tokenUsage.completion_tokens * 0.03) / 1000;
      
      await supabase
        .from('ai_token_usage')
        .insert(tokenUsage);
    }
    
    console.log(`\n📊 Total conversations created: ${totalCreated}`);
    console.log(`   Expected: 80 (20 per agent × 4 agents)`);
    
    return totalCreated;
    
  } catch (error) {
    console.error('❌ Error generating conversations:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  generateConversations().then((count) => {
    console.log(`\n🎉 Successfully generated ${count} conversations!`);
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Process failed:', error);
    process.exit(1);
  });
}

module.exports = { generateConversations };