// test-agent-conversations.js
const fetch = require('node-fetch');
require('dotenv').config();

const API_URL = process.env.TEST_API_URL || 'http://localhost:3001';
const EMAIL = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;
const AGENT_ID = 'ce26a2fd-83d6-4ae4-a7d7-d167797c3a87';

const messages = [
  'Do you have any properties near makati?',
  '3-4M pesos',
  'Me and my wife will be deciding',
  'To live in so somewhere quiet',
  'Next month',
  'Jack Cole, 09765229475'
];

const testCases = [
  [
    'Do you have any properties near makati?',
    '3-4M pesos',
    'Me and my wife will be deciding',
    'To live in so somewhere quiet',
    'Next month',
    'Jack Cole, 09765229475'
  ],
  [
    'Do you have any properties near makati?',
    '10-15M pesos',
    'I will be deciding alone',
    'To live in so somewhere quiet so location',
    'this month',
    'Sam altman, 09765229475'
  ],
  [
    'Do you have any properties near makati?',
    '5M pesos',
    'I will be deciding with my family',
    'To live in so somewhere quiet so location',
    'in the next 3 months',
    'Mary Magdalene, 09765229475'
  ]
];

console.log('TEST_SUPABASE_URL:', process.env.TEST_SUPABASE_URL);
console.log('TEST_API_URL:', process.env.TEST_API_URL);

async function getAccessToken() {
  // Example: Supabase email/password login
  const res = await fetch(`${process.env.TEST_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': process.env.TEST_SUPABASE_KEY },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD })
  });
  const data = await res.json();
  if (!res.ok) throw new Error('Failed to authenticate: ' + (data.error_description || data.error));
  return data.access_token;
}

async function getAgentId(token) {
  const res = await fetch(`${API_URL}/api/agents`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const agents = await res.json();
  if (!agents.length) throw new Error('No agents found');
  return agents[0].id;
}

async function getLeadByConversationId(token, conversationId) {
  const res = await fetch(`${API_URL}/api/leads?conversationId=${conversationId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch lead by conversationId');
  return await res.json();
}

async function runTest(messages, label, token) {
  try {
    let history = [];
    let conversationId = null;
    // Generate a random string for userId to simulate an anonymous customer
    const userId = `anon-${Math.random().toString(36).substring(2, 12)}`;
    const messagesWithUnique = [...messages];
    messagesWithUnique[0] = messagesWithUnique[0] + ` [test-${Math.random().toString(36).substring(2, 10)}]`;
    for (const msg of messagesWithUnique) {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ agentId: AGENT_ID, message: msg, history, userId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Chat error');
      console.log(`[${label}] You: ${msg}`);
      console.log(`[${label}] Agent: ${data.response}`);
      history.push({ sender: 'user', content: msg });
      history.push({ sender: 'agent', content: data.response });
      if (data.conversationId) conversationId = data.conversationId;
    }

    // Fetch the resulting lead by conversationId to verify
    const leadRes = await fetch(`${API_URL}/api/leads?conversationId=${conversationId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const leadData = await leadRes.json();
    // The endpoint returns an array, so we'll log the first element if it exists
    if (leadData && leadData.length > 0) {
      console.log(`[Test ${label}] Resulting Lead:`, JSON.stringify(leadData[0], null, 2));
    } else {
      console.log(`[Test ${label}] Resulting Lead: Not Found`);
    }
    console.log(`[Test ${label}] Conversation ID:`, conversationId);

  } catch (error) {
    console.error(`[Test ${label}] Test failed:`, error);
  }
}

async function runAllTests() {
  const token = await getAccessToken();
  await Promise.all([
    runTest(testCases[0], 'Test 1', token),
    runTest(testCases[1], 'Test 2', token),
    runTest(testCases[2], 'Test 3', token)
  ]);
}

runAllTests(); 