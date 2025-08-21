/**
 * Test Urgent Issue Classification
 * Run with: node scripts/test-urgent-issue.js
 */

require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const jwt = require('jsonwebtoken');

async function testUrgentIssue() {
  console.log('Testing URGENT issue classification...\n');

  const token = jwt.sign(
    { 
      id: 'test-user-id', 
      email: 'test@example.com',
      sub: 'test-user-id'
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const urgentIssue = {
    subject: "URGENT: Payment system is down",
    description: "The payment processing is completely broken and customers cannot complete purchases. This is critical and needs emergency attention!",
    posthogSessionId: "test-urgent-123"
  };

  const response = await fetch('http://localhost:3001/api/issues/report', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(urgentIssue)
  });

  const data = await response.json();
  
  if (data.success) {
    console.log('✅ Issue created successfully!');
    console.log(`Priority: ${data.data.priority} (Expected: urgent)`);
    console.log(`Category: ${data.data.aiClassification.category}`);
    console.log(`Score: ${data.data.aiClassification.priorityScore}`);
    
    if (data.data.priority === 'urgent') {
      console.log('\n✅ URGENT classification working correctly!');
    } else {
      console.log('\n❌ URGENT classification failed - got:', data.data.priority);
    }
  } else {
    console.log('❌ Failed to create issue:', data);
  }
}

testUrgentIssue().catch(console.error);