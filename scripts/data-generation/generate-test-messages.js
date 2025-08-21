#!/usr/bin/env node

/**
 * Generate Test Messages for Conversations
 * Creates realistic messages for all existing conversations
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const messageTemplates = {
  user: [
    "Hi, I'm interested in buying a property in the area",
    "What's the current market like for 3-bedroom homes?",
    "Can you help me estimate my property value?",
    "I'm looking for investment properties under $500k",
    "What areas do you recommend for first-time buyers?",
    "I need help selling my current home",
    "Are there any new developments coming up?",
    "What's the average price per square foot in downtown?",
    "I'm interested in rental properties",
    "Can you show me properties with good schools nearby?"
  ],
  assistant: [
    "I'd be happy to help you find the perfect property! What specific features are you looking for?",
    "The market for 3-bedroom homes is quite competitive right now. Prices range from $400k to $650k depending on the area.",
    "I can definitely help with that! To provide an accurate estimate, could you tell me more about your property?",
    "I have several great investment opportunities under $500k. Would you prefer residential or commercial properties?",
    "For first-time buyers, I recommend looking at Oakwood Heights or Riverside. Both offer great value and amenities.",
    "I can assist with selling your home. Let's start with a market analysis to determine the best listing price.",
    "Yes! There are 3 new developments planned for next year. Would you like details on pre-construction opportunities?",
    "Downtown averages $250-$350 per square foot depending on the building and floor level.",
    "Rental properties are a great investment! I have several multi-family units that could provide excellent returns.",
    "Education is important! I can show you properties in the top-rated school districts. What grade levels are you interested in?"
  ]
};

async function generateMessagesForConversation(conversation, messageCount = 5) {
  const messages = [];
  
  for (let i = 0; i < messageCount; i++) {
    const isUserMessage = i % 2 === 0;
    const templates = isUserMessage ? messageTemplates.user : messageTemplates.assistant;
    const content = templates[Math.floor(Math.random() * templates.length)];
    
    messages.push({
      conversation_id: conversation.id,
      role: isUserMessage ? 'user' : 'assistant',
      content,
      created_at: new Date(Date.now() - (messageCount - i) * 60000).toISOString(), // Messages 1 minute apart
      metadata: {
        source: conversation.source || 'web',
        generated: true
      }
    });
  }
  
  return messages;
}

async function generateTestMessages() {
  console.log('🚀 Starting Test Message Generation');
  console.log('=====================================\n');
  
  try {
    // Fetch all conversations
    console.log('📊 Fetching conversations...');
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (convError) throw convError;
    
    console.log(`✅ Found ${conversations.length} conversations\n`);
    
    // Generate messages for each conversation
    let totalMessages = 0;
    const allMessages = [];
    
    for (const conversation of conversations) {
      // Generate 3-7 messages per conversation
      const messageCount = Math.floor(Math.random() * 5) + 3;
      const messages = await generateMessagesForConversation(conversation, messageCount);
      allMessages.push(...messages);
      totalMessages += messages.length;
    }
    
    console.log(`📝 Generated ${totalMessages} messages for ${conversations.length} conversations`);
    
    // Insert messages in batches
    console.log('\n💾 Inserting messages into database...');
    const batchSize = 100;
    let inserted = 0;
    
    for (let i = 0; i < allMessages.length; i += batchSize) {
      const batch = allMessages.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('messages')
        .insert(batch);
      
      if (insertError) {
        console.error('❌ Error inserting batch:', insertError);
      } else {
        inserted += batch.length;
        console.log(`  ✓ Inserted ${inserted}/${totalMessages} messages`);
      }
    }
    
    // Update conversation titles based on first message
    console.log('\n📝 Updating conversation titles...');
    for (const conversation of conversations) {
      const conversationMessages = allMessages.filter(m => m.conversation_id === conversation.id);
      if (conversationMessages.length > 0) {
        const firstUserMessage = conversationMessages.find(m => m.role === 'user');
        if (firstUserMessage) {
          // Use first 50 chars of first user message as title
          const title = firstUserMessage.content.substring(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '');
          
          const { error: updateError } = await supabase
            .from('conversations')
            .update({ title })
            .eq('id', conversation.id);
          
          if (updateError) {
            console.error(`❌ Error updating conversation ${conversation.id}:`, updateError);
          }
        }
      }
    }
    
    console.log('✅ Conversation titles updated');
    
    // Verify the results
    console.log('\n📊 Verification:');
    const { count: messageCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true });
    
    console.log(`  Total messages in database: ${messageCount}`);
    
    // Sample a few conversations to show their messages
    console.log('\n📋 Sample Conversations:');
    const sampleConvs = conversations.slice(0, 3);
    
    for (const conv of sampleConvs) {
      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: true })
        .limit(3);
      
      console.log(`\n  Conversation: ${conv.title || 'Untitled'}`);
      console.log(`  Organization: ${conv.organization_id}`);
      if (messages && messages.length > 0) {
        messages.forEach(msg => {
          console.log(`    ${msg.role}: ${msg.content.substring(0, 60)}...`);
        });
      }
    }
    
    console.log('\n✅ Test message generation complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
generateTestMessages().catch(console.error);