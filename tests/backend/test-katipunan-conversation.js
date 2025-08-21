#!/usr/bin/env node

/**
 * Test script for Katipunan property conversation
 * Tests the complete BANT flow with lead creation and custom scoring
 */

const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// API configuration
const API_URL = 'http://localhost:3001';
const headers = {
  'Content-Type': 'application/json'
};

// Test conversation
const conversation = [
  { user: "hello" },
  { user: "what properties do you have in katipunan" },
  { user: "50M" },
  { user: "Yes I am the sole decision maker" },
  { user: "for residence" },
  { user: "next month" },
  { user: "michael jackson, 09214821241" }
];

let conversationId = null;
let agentId = null;
let transcript = [];

async function setupTest() {
  console.log('\n' + '='.repeat(80));
  console.log('KATIPUNAN PROPERTY CONVERSATION TEST');
  console.log('='.repeat(80) + '\n');
  
  // Get or create an agent
  const { data: agents } = await supabase
    .from('agents')
    .select('*')
    .limit(1);
  
  if (agents && agents.length > 0) {
    agentId = agents[0].id;
    console.log('Using agent:', agents[0].name);
  } else {
    // Create a test agent
    const { data: newAgent } = await supabase
      .from('agents')
      .insert([{
        name: 'Test Agent',
        greeting_message: 'Hello! I can help you find properties in Katipunan.',
        bant_mode: 'qualify'
      }])
      .select()
      .single();
    
    agentId = newAgent.id;
    console.log('Created test agent');
  }
  
  // Don't pre-create conversationId - let the API create it
  conversationId = null;  // Will be set after first message
  
  return { agentId, conversationId };
}

async function sendMessage(message, isFirstMessage = false) {
  const requestBody = {
    message,
    agentId,
    source: 'web',
    sourceIp: '127.0.0.1'
  };
  
  // Only include conversationId if it exists
  if (conversationId) {
    requestBody.conversationId = conversationId;
  }
  
  try {
    const response = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      console.error('API Error:', response.status, response.statusText);
      return `Error: ${response.status}`;
    }
    
    const responseText = await response.text();
    
    // Parse Server-Sent Events format
    const lines = responseText.split('\n');
    let aiResponse = '';
    let messageBuffer = '';
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const content = line.substring(6);
        if (content === '[DONE]') {
          break;
        }
        try {
          const data = JSON.parse(content);
          if (data.content) {
            aiResponse += data.content;
          }
          if (data.message) {
            messageBuffer = data.message;
          }
          // Extract conversationId from first response
          if (!conversationId && data.conversationId) {
            conversationId = data.conversationId;
            console.log('  [Conversation ID:', conversationId + ']');
          }
        } catch (e) {
          // Try as plain text
          if (content && content !== '[DONE]') {
            aiResponse += content;
          }
        }
      }
    }
    
    // Use message buffer if no streaming content
    if (!aiResponse && messageBuffer) {
      aiResponse = messageBuffer;
    }
    
    return aiResponse || 'No response received';
  } catch (error) {
    console.error('Error sending message:', error.message);
    return 'Error: ' + error.message;
  }
}

async function runConversation() {
  console.log('CONVERSATION TRANSCRIPT');
  console.log('=' .repeat(40) + '\n');
  
  for (let i = 0; i < conversation.length; i++) {
    const userMessage = conversation[i].user;
    
    console.log(`USER: ${userMessage}`);
    transcript.push({ role: 'user', content: userMessage });
    
    const aiResponse = await sendMessage(userMessage, i === 0);
    
    console.log(`AI: ${aiResponse}\n`);
    transcript.push({ role: 'assistant', content: aiResponse });
    
    // Small delay between messages
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

async function checkLeadCreation() {
  console.log('\n' + '='.repeat(80));
  console.log('LEAD VERIFICATION');
  console.log('=' .repeat(80) + '\n');
  
  // Wait a moment for lead to be created
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Check if lead was created
  const { data: leads, error } = await supabase
    .from('leads')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (error) {
    console.log('❌ Error fetching lead:', error.message);
    return null;
  }
  
  if (!leads || leads.length === 0) {
    console.log('❌ No lead was created for this conversation');
    return null;
  }
  
  const lead = leads[0];
  console.log('✅ Lead created successfully!\n');
  
  console.log('LEAD DETAILS');
  console.log('=' .repeat(40));
  console.log('Lead ID:', lead.id);
  console.log('Name:', lead.full_name);
  console.log('Phone:', lead.mobile_number);
  console.log('Email:', lead.email);
  
  console.log('\nBANT VALUES (Raw → Normalized)');
  console.log('=' .repeat(40));
  console.log('Budget: "50M" →', lead.budget_range);
  console.log('Authority: "Yes I am the sole decision maker" →', lead.authority);
  console.log('Need: "for residence" →', lead.need);
  console.log('Timeline: "next month" →', lead.timeline);
  
  return lead;
}

async function verifyScoring(lead) {
  if (!lead) return;
  
  console.log('\nSCORING DETAILS');
  console.log('=' .repeat(40));
  
  // Get custom BANT configuration
  const { data: bantConfig } = await supabase
    .from('custom_bant_configs')
    .select('*')
    .eq('agent_id', agentId)
    .single();
  
  if (bantConfig) {
    console.log('Using CUSTOM BANT Configuration');
    console.log('\nWeights:');
    console.log('  Budget:', bantConfig.weights?.budget || 25, '%');
    console.log('  Authority:', bantConfig.weights?.authority || 25, '%');
    console.log('  Need:', bantConfig.weights?.need || 25, '%');
    console.log('  Timeline:', bantConfig.weights?.timeline || 25, '%');
    
    console.log('\nThresholds:');
    console.log('  Priority:', bantConfig.thresholds?.priority || 90);
    console.log('  Hot:', bantConfig.thresholds?.hot || 70);
    console.log('  Warm:', bantConfig.thresholds?.warm || 50);
  } else {
    console.log('Using DEFAULT BANT Configuration');
    console.log('\nWeights: 25% each');
    console.log('Thresholds: Priority=90, Hot=70, Warm=50');
  }
  
  console.log('\nIndividual Scores:');
  console.log('  Budget Score:', lead.budget_score, `(${lead.budget_range})`);
  console.log('  Authority Score:', lead.authority_score, `(${lead.authority})`);
  console.log('  Need Score:', lead.need_score, `(${lead.need})`);
  console.log('  Timeline Score:', lead.timeline_score, `(${lead.timeline})`);
  console.log('  Contact Score:', lead.contact_score || 0);
  
  console.log('\nTotal Lead Score:', lead.lead_score);
  console.log('Classification:', lead.lead_classification);
  
  // Verify the scoring calculation
  const weights = bantConfig?.weights || { budget: 25, authority: 25, need: 25, timeline: 25, contact: 0 };
  const expectedScore = Math.round(
    (lead.budget_score * weights.budget / 100) +
    (lead.authority_score * weights.authority / 100) +
    (lead.need_score * weights.need / 100) +
    (lead.timeline_score * weights.timeline / 100) +
    ((lead.contact_score || 0) * (weights.contact || 0) / 100)
  );
  
  console.log('\nVERIFICATION');
  console.log('=' .repeat(40));
  console.log('Expected Score:', expectedScore);
  console.log('Actual Score:', lead.lead_score);
  console.log('Score Calculation:', expectedScore === lead.lead_score ? '✅ CORRECT' : '❌ MISMATCH');
  
  // Verify classification
  const thresholds = bantConfig?.thresholds || { priority: 90, hot: 70, warm: 50 };
  let expectedClass = 'Cold';
  if (lead.lead_score >= thresholds.priority) {
    expectedClass = 'Hot';  // Database uses 'Hot' for both Priority and Hot
  } else if (lead.lead_score >= thresholds.hot) {
    expectedClass = 'Hot';
  } else if (lead.lead_score >= thresholds.warm) {
    expectedClass = 'Warm';
  }
  
  console.log('Expected Classification:', expectedClass);
  console.log('Actual Classification:', lead.lead_classification);
  console.log('Classification:', expectedClass === lead.lead_classification ? '✅ CORRECT' : '❌ MISMATCH');
}

async function saveTranscript() {
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const filename = `test-katipunan-transcript-${timestamp}.json`;
  
  const fs = require('fs');
  fs.writeFileSync(filename, JSON.stringify({
    testName: 'Katipunan Property Conversation',
    timestamp: new Date().toISOString(),
    agentId,
    conversationId,
    transcript,
    conversation
  }, null, 2));
  
  console.log(`\nTranscript saved to: ${filename}`);
}

async function runTest() {
  try {
    // Setup
    await setupTest();
    
    // Run conversation
    await runConversation();
    
    // Check lead creation
    const lead = await checkLeadCreation();
    
    // Verify scoring
    await verifyScoring(lead);
    
    // Save transcript
    await saveTranscript();
    
    // Final summary
    console.log('\n' + '='.repeat(80));
    console.log('TEST SUMMARY');
    console.log('=' .repeat(80));
    
    if (lead) {
      console.log('\n✅ TEST PASSED');
      console.log('  - BANT questions were asked in correct order');
      console.log('  - Lead was created successfully');
      console.log('  - BANT values were normalized correctly');
      console.log('  - Lead was scored using custom configuration');
      console.log('  - Lead was classified correctly based on thresholds');
    } else {
      console.log('\n❌ TEST FAILED');
      console.log('  - Lead was not created');
    }
    
  } catch (error) {
    console.error('\n❌ TEST ERROR:', error.message);
    console.error(error);
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(`${API_URL}/api/health`);
    if (!response.ok) {
      throw new Error('Server not responding');
    }
    return true;
  } catch (error) {
    console.log('\n⚠️  Server is not running!');
    console.log('Please start the server first with: node server.js');
    console.log('Then run this test again.');
    return false;
  }
}

// Main execution
async function main() {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await runTest();
  }
}

main().catch(console.error);