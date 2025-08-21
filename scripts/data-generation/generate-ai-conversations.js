#!/usr/bin/env node

/**
 * Generate AI Conversations by Direct Interaction
 * Creates 80 conversations (20 per organization) by directly calling the /api/chat endpoint
 * Tracks token usage and creates realistic lead distributions
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const {
  hotLeadTemplates,
  warmLeadTemplates,
  coldLeadTemplates,
  nonConvertingTemplates,
  getRandomTemplate,
  generateUserName,
  generateEmail,
  generatePhone
} = require('./conversation-templates');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Distribution per organization (total 20 conversations each)
const DISTRIBUTION = {
  hot: 5,      // 5-6 hot leads
  warm: 6,     // 5-6 warm leads
  cold: 5,     // 4-5 cold leads
  nonConverting: 4  // 3-4 non-converting
};

// Track statistics
const stats = {
  totalConversations: 0,
  totalMessages: 0,
  totalLeads: 0,
  tokenUsage: {
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0
  },
  byOrganization: {},
  errors: []
};

/**
 * Send a message to the AI chat endpoint
 */
async function sendChatMessage(message, agentId, conversationId = null, userId = null) {
  try {
    const payload = {
      message,
      agentId,
      ...(conversationId && { conversationId }),
      ...(userId && { userId })
    };

    console.log(`    → Sending: "${message.substring(0, 50)}..."`);

    const response = await axios.post(`${API_URL}/api/chat`, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });

    // The API returns the response directly without a success field
    if (response.data && response.data.conversationId) {
      // The response includes conversationId and the AI's message is saved automatically
      return {
        success: true,
        conversationId: response.data.conversationId,
        response: response.data.response || 'Message received'
      };
    } else if (response.data && response.data.error) {
      throw new Error(response.data.error);
    } else {
      throw new Error('Unexpected response format');
    }
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.message;
    console.error(`    ❌ Error sending message:`, errorMsg);
    return {
      success: false,
      error: errorMsg
    };
  }
}

/**
 * Wait for a random delay to simulate natural conversation timing
 */
function simulateTypingDelay() {
  const delay = Math.floor(Math.random() * 500) + 300; // 0.3-0.8 seconds
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Create a single conversation with the AI
 */
async function createConversation(agent, template, leadType, userName, userEmail, userPhone) {
  console.log(`\n  📝 Creating ${leadType} conversation: "${template.name}"`);
  console.log(`     Agent: ${agent.name} (${agent.id})`);
  console.log(`     User: ${userName}`);

  let conversationId = null;
  let messageCount = 0;
  let leadCreated = false;
  
  // Generate a unique user ID for this conversation
  const userId = uuidv4();

  try {
    // Send each message in the template
    for (const message of template.messages) {
      await simulateTypingDelay();

      // Replace placeholders in message with actual user data
      let content = message.content
        .replace(/John Smith|Sarah Williams|David Chen|Michael Torres|Robert and Linda Johnson/gi, userName)
        .replace(/555-\d{4}/g, userPhone)
        .replace(/[a-z]+\.?[a-z]*@[a-z]+\.com/gi, userEmail);

      const result = await sendChatMessage(content, agent.id, conversationId, userId);

      if (result.success) {
        if (!conversationId) {
          conversationId = result.conversationId;
          console.log(`     ✓ Conversation created: ${conversationId}`);
        }
        messageCount++;
        stats.totalMessages++;

        // Check if the AI response indicates lead creation
        if (result.response && result.response.toLowerCase().includes('lead')) {
          leadCreated = true;
        }
      } else {
        console.error(`     ❌ Failed to send message: ${result.error}`);
        stats.errors.push({
          conversation: template.name,
          error: result.error
        });
        break;
      }
    }

    // Update conversation metadata
    if (conversationId) {
      const { error: updateError } = await supabase
        .from('conversations')
        .update({
          status: leadType === 'nonConverting' ? 'closed' : 'active',
          metadata: {
            generated: true,
            template: template.name,
            leadType,
            priority: leadType === 'hot' ? 'hot' : leadType === 'warm' ? 'warm' : 'cold',
            userName,
            userEmail,
            userPhone
          }
        })
        .eq('id', conversationId);

      if (updateError) {
        console.error(`     ⚠️ Failed to update conversation metadata:`, updateError.message);
      }
    }

    // Check if a lead was created
    if (conversationId && (leadType === 'hot' || leadType === 'warm')) {
      const { data: lead } = await supabase
        .from('leads')
        .select('id')
        .eq('conversation_id', conversationId)
        .single();

      if (lead) {
        leadCreated = true;
        console.log(`     💰 Lead created!`);
      }
    }

    console.log(`     ✅ Conversation complete: ${messageCount} messages sent`);

    return {
      success: true,
      conversationId,
      messageCount,
      leadCreated
    };

  } catch (error) {
    console.error(`     ❌ Error creating conversation:`, error.message);
    stats.errors.push({
      conversation: template.name,
      error: error.message
    });
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate conversations for an organization
 */
async function generateConversationsForOrganization(organization, agents) {
  console.log(`\n🏢 Generating conversations for: ${organization.name}`);
  console.log(`   Agents available: ${agents.length}`);

  const orgStats = {
    total: 0,
    leads: 0,
    hot: 0,
    warm: 0,
    cold: 0,
    nonConverting: 0
  };

  // Select a random agent for each conversation
  const getRandomAgent = () => agents[Math.floor(Math.random() * agents.length)];

  // Generate hot leads
  for (let i = 0; i < DISTRIBUTION.hot; i++) {
    const template = getRandomTemplate(hotLeadTemplates);
    const userName = generateUserName();
    const userEmail = generateEmail(userName);
    const userPhone = generatePhone();
    
    const result = await createConversation(
      getRandomAgent(),
      template,
      'hot',
      userName,
      userEmail,
      userPhone
    );

    if (result.success) {
      orgStats.total++;
      orgStats.hot++;
      if (result.leadCreated) orgStats.leads++;
      stats.totalConversations++;
      if (result.leadCreated) stats.totalLeads++;
    }
  }

  // Generate warm leads
  for (let i = 0; i < DISTRIBUTION.warm; i++) {
    const template = getRandomTemplate(warmLeadTemplates);
    const userName = generateUserName();
    const userEmail = generateEmail(userName);
    const userPhone = generatePhone();
    
    const result = await createConversation(
      getRandomAgent(),
      template,
      'warm',
      userName,
      userEmail,
      userPhone
    );

    if (result.success) {
      orgStats.total++;
      orgStats.warm++;
      if (result.leadCreated) orgStats.leads++;
      stats.totalConversations++;
      if (result.leadCreated) stats.totalLeads++;
    }
  }

  // Generate cold leads
  for (let i = 0; i < DISTRIBUTION.cold; i++) {
    const template = getRandomTemplate(coldLeadTemplates);
    const userName = generateUserName();
    const userEmail = generateEmail(userName);
    const userPhone = generatePhone();
    
    const result = await createConversation(
      getRandomAgent(),
      template,
      'cold',
      userName,
      userEmail,
      userPhone
    );

    if (result.success) {
      orgStats.total++;
      orgStats.cold++;
      if (result.leadCreated) orgStats.leads++;
      stats.totalConversations++;
      if (result.leadCreated) stats.totalLeads++;
    }
  }

  // Generate non-converting conversations
  for (let i = 0; i < DISTRIBUTION.nonConverting; i++) {
    const template = getRandomTemplate(nonConvertingTemplates);
    const userName = generateUserName();
    const userEmail = generateEmail(userName);
    const userPhone = generatePhone();
    
    const result = await createConversation(
      getRandomAgent(),
      template,
      'nonConverting',
      userName,
      userEmail,
      userPhone
    );

    if (result.success) {
      orgStats.total++;
      orgStats.nonConverting++;
      stats.totalConversations++;
    }
  }

  stats.byOrganization[organization.name] = orgStats;
  
  console.log(`\n   📊 Organization Summary:`);
  console.log(`      Total Conversations: ${orgStats.total}`);
  console.log(`      Leads Generated: ${orgStats.leads}`);
  console.log(`      Hot: ${orgStats.hot}, Warm: ${orgStats.warm}, Cold: ${orgStats.cold}, Non-Converting: ${orgStats.nonConverting}`);
}

/**
 * Main function to generate all conversations
 */
async function generateAIConversations() {
  console.log('🚀 Starting AI Conversation Generation');
  console.log('=====================================\n');
  console.log('Target: 80 conversations (20 per organization)');
  console.log('Distribution per org: 5 hot, 6 warm, 5 cold, 4 non-converting\n');

  try {
    // Clean database first
    console.log('🧹 Cleaning existing data...');
    
    const { error: deleteMessagesError } = await supabase
      .from('messages')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (deleteMessagesError) {
      console.error('Failed to delete messages:', deleteMessagesError);
    }

    const { error: deleteConversationsError } = await supabase
      .from('conversations')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (deleteConversationsError) {
      console.error('Failed to delete conversations:', deleteConversationsError);
    }

    console.log('✅ Database cleaned\n');

    // Fetch organizations
    console.log('📊 Fetching organizations...');
    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at')
      .limit(4);

    if (orgError) throw orgError;
    console.log(`✅ Found ${organizations.length} organizations\n`);

    // Generate conversations for each organization
    for (const org of organizations) {
      // Fetch agents for this organization
      const { data: agents, error: agentError } = await supabase
        .from('agents')
        .select('*')
        .eq('organization_id', org.id);

      if (agentError) {
        console.error(`❌ Error fetching agents for ${org.name}:`, agentError);
        continue;
      }

      if (!agents || agents.length === 0) {
        console.log(`⚠️ No agents found for ${org.name}, skipping...`);
        continue;
      }

      await generateConversationsForOrganization(org, agents);
    }

    // Fetch token usage from database
    console.log('\n📊 Fetching token usage data...');
    const { data: tokenData, error: tokenError } = await supabase
      .from('ai_token_usage')
      .select('prompt_tokens, completion_tokens, total_tokens')
      .gte('created_at', new Date(Date.now() - 3600000).toISOString()); // Last hour

    if (!tokenError && tokenData) {
      tokenData.forEach(usage => {
        stats.tokenUsage.prompt_tokens += usage.prompt_tokens || 0;
        stats.tokenUsage.completion_tokens += usage.completion_tokens || 0;
        stats.tokenUsage.total_tokens += usage.total_tokens || 0;
      });
    }

    // Generate final report
    console.log('\n\n📈 FINAL REPORT');
    console.log('=====================================');
    console.log(`Total Conversations Created: ${stats.totalConversations}`);
    console.log(`Total Messages Sent: ${stats.totalMessages}`);
    console.log(`Total Leads Generated: ${stats.totalLeads}`);
    console.log(`Lead Conversion Rate: ${((stats.totalLeads / stats.totalConversations) * 100).toFixed(1)}%`);
    
    console.log('\n📊 Token Usage:');
    console.log(`  Prompt Tokens: ${stats.tokenUsage.prompt_tokens.toLocaleString()}`);
    console.log(`  Completion Tokens: ${stats.tokenUsage.completion_tokens.toLocaleString()}`);
    console.log(`  Total Tokens: ${stats.tokenUsage.total_tokens.toLocaleString()}`);
    
    console.log('\n🏢 By Organization:');
    for (const [orgName, orgStats] of Object.entries(stats.byOrganization)) {
      console.log(`\n  ${orgName}:`);
      console.log(`    Conversations: ${orgStats.total}`);
      console.log(`    Leads: ${orgStats.leads} (${((orgStats.leads / orgStats.total) * 100).toFixed(1)}%)`);
      console.log(`    Distribution: Hot(${orgStats.hot}) Warm(${orgStats.warm}) Cold(${orgStats.cold}) NC(${orgStats.nonConverting})`);
    }

    if (stats.errors.length > 0) {
      console.log('\n⚠️ Errors Encountered:');
      stats.errors.forEach(err => {
        console.log(`  - ${err.conversation}: ${err.error}`);
      });
    }

    console.log('\n✅ AI Conversation Generation Complete!');

  } catch (error) {
    console.error('❌ Fatal Error:', error);
    process.exit(1);
  }
}

// Run the script
console.log('Starting in 3 seconds...\n');
setTimeout(() => {
  generateAIConversations().catch(console.error);
}, 3000);