require('dotenv').config();

async function simulateChatAPIFlow() {
  console.log('🧪 Simulating Chat API Flow for BANT Extraction');
  console.log('=' .repeat(80));
  
  // Simulate the exact conversation from the database
  const conversationId = '38e427e6-dd1e-46d5-ab7a-8bfdee33ab62';
  const agentId = '2b51a1a2-e10b-43a0-8501-ca28cf767cca';
  
  console.log('📝 Testing with:');
  console.log('  Conversation ID:', conversationId);
  console.log('  Agent ID:', agentId);
  console.log('  Message: "35M"');
  
  // Make the API call directly
  const response = await fetch('http://localhost:3001/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Add a simple auth header if needed
      'x-user-id': '8ad6ed68-ac60-4483-b22d-e6747727971b'
    },
    body: JSON.stringify({
      conversationId: conversationId,
      message: '35M',
      agentId: agentId,
      source: 'web'
    })
  });
  
  console.log('\n📊 Response Status:', response.status);
  console.log('Response Headers:', Object.fromEntries(response.headers));
  
  const result = await response.json();
  console.log('\n📦 Response Body:');
  console.log(JSON.stringify(result, null, 2));
  
  if (result.success) {
    console.log('\n✅ API call succeeded');
    console.log('Message ID:', result.messageId);
    console.log('Conversation ID:', result.conversationId);
    
    // Wait for AI response
    console.log('\n⏳ Waiting 5 seconds for AI response...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check messages via Supabase
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('sent_at', { ascending: false })
      .limit(2);
    
    console.log('\n📬 Latest messages:');
    messages?.forEach(msg => {
      console.log(`  [${msg.sender}]: "${msg.content}"`);
    });
    
    // Check if AI asked about budget again or moved to authority
    const aiMessage = messages?.find(msg => msg.sender === 'ai');
    if (aiMessage) {
      const content = aiMessage.content.toLowerCase();
      if (content.includes('budget')) {
        console.log('\n❌ BANT EXTRACTION FAILED - AI asked about budget again!');
      } else if (content.includes('decision') || content.includes('authority') || content.includes('sole')) {
        console.log('\n✅ BANT EXTRACTION WORKED - AI moved to authority question!');
      } else {
        console.log('\n🤔 Unclear response - check the AI message above');
      }
    }
  } else {
    console.log('\n❌ API call failed:', result.error);
  }
}

// Run the test
simulateChatAPIFlow().then(() => {
  console.log('\n✅ Test complete');
  console.log('\n📋 Check server logs for:');
  console.log('  - [EXTRACT BANT] Chat history for AI analysis');
  console.log('  - [EXTRACT BANT] 🚀 Calling AI with model');
  console.log('  - [EXTRACT BANT] Raw response');
  console.log('  - [BANT PROMPT] Current BANT state after synchronous extraction');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});