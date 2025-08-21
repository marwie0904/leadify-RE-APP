// Script to verify all AI functions are properly tracking tokens
const fs = require('fs');
const path = require('path');

// Read server.js
const serverPath = path.join(__dirname, 'BACKEND', 'server.js');
const serverCode = fs.readFileSync(serverPath, 'utf8');

// List of all 16 AI functions and their operation types
const aiFunctions = [
  { name: 'masterIntentClassifier', operationType: 'intent_classification' },
  { name: 'scoreLead', operationType: 'bant_scoring' },
  { name: 'extractContactInfoAI', operationType: 'contact_extraction' },
  { name: 'extractBANTExactAI', operationType: 'bant_extraction' },
  { name: 'normalizeBANTAI', operationType: 'bant_normalization' },
  { name: 'extractPropertyInfo', operationType: 'property_extraction' },
  { name: 'extractPaymentPlan', operationType: 'payment_plan_extraction' },
  { name: 'scoreBANTWithAI', operationType: 'lead_scoring' },
  { name: 'determineEstimationStep', operationType: 'estimation' },
  { name: 'handleEstimationStep1', operationType: 'estimation' },
  { name: 'handleEstimationStep2', operationType: 'estimation_step2' },
  { name: 'handleEstimationStep3', operationType: 'estimation_step3' },
  { name: 'Main Chat (Regular)', operationType: 'chat_reply' },
  { name: 'Main Chat (Embeddings)', operationType: 'chat_reply' },
  { name: 'Main Chat (BANT Completion)', operationType: 'bant_response' },
  { name: 'Main Chat (BANT Extraction)', operationType: 'bant_extraction' }
];

console.log('🔍 Verifying Token Tracking for All 16 AI Functions\n');
console.log('=' .repeat(80));

let allTracked = true;
let trackingDetails = [];

aiFunctions.forEach((func, index) => {
  console.log(`\n${index + 1}. ${func.name}`);
  console.log('-'.repeat(40));
  
  // Check if operationType exists
  const hasOperationType = serverCode.includes(`operationType: '${func.operationType}'`);
  
  // Check for tracking components near the operation type
  const operationIndex = serverCode.indexOf(`operationType: '${func.operationType}'`);
  
  if (operationIndex !== -1) {
    // Get surrounding code (500 chars before and after)
    const start = Math.max(0, operationIndex - 500);
    const end = Math.min(serverCode.length, operationIndex + 500);
    const context = serverCode.substring(start, end);
    
    // Check for tracking components
    const checks = {
      hasOperationType: true,
      hasAgentId: context.includes('agentId:'),
      hasOrganizationId: context.includes('organizationId:'),
      hasConversationId: context.includes('conversationId:'),
      hasUserId: context.includes('userId:'),
      hasModel: context.includes('model:'),
      hasTokenTracking: context.includes('trackTokenUsage') || context.includes('promptTokens:'),
      callsAIWithFallback: context.includes('callAIWithFallback')
    };
    
    const isFullyTracked = Object.values(checks).every(v => v);
    
    console.log(`  ✓ Operation Type: '${func.operationType}'`);
    console.log(`  ${checks.hasAgentId ? '✓' : '✗'} Agent ID tracking`);
    console.log(`  ${checks.hasOrganizationId ? '✓' : '✗'} Organization ID tracking`);
    console.log(`  ${checks.hasConversationId ? '✓' : '✗'} Conversation ID tracking`);
    console.log(`  ${checks.hasUserId ? '✓' : '✗'} User ID tracking`);
    console.log(`  ${checks.hasModel ? '✓' : '✗'} Model tracking`);
    console.log(`  ${checks.hasTokenTracking ? '✓' : '✗'} Token usage tracking`);
    console.log(`  ${checks.callsAIWithFallback ? '✓' : '✗'} Uses callAIWithFallback`);
    
    if (isFullyTracked) {
      console.log(`  ✅ FULLY TRACKED`);
    } else {
      console.log(`  ⚠️  PARTIALLY TRACKED - Missing some metadata`);
      allTracked = false;
    }
    
    trackingDetails.push({
      function: func.name,
      operationType: func.operationType,
      ...checks,
      fullyTracked: isFullyTracked
    });
  } else {
    console.log(`  ❌ Operation type '${func.operationType}' NOT FOUND`);
    allTracked = false;
    trackingDetails.push({
      function: func.name,
      operationType: func.operationType,
      hasOperationType: false,
      fullyTracked: false
    });
  }
});

// Check for trackTokenUsage function calls
console.log('\n' + '='.repeat(80));
console.log('\n📊 Token Usage Tracking Summary\n');

const trackTokenUsageCount = (serverCode.match(/trackTokenUsage\(/g) || []).length;
const callAIWithFallbackCount = (serverCode.match(/callAIWithFallback\(/g) || []).length;

console.log(`Total trackTokenUsage calls: ${trackTokenUsageCount}`);
console.log(`Total callAIWithFallback calls: ${callAIWithFallbackCount}`);

// Check for direct OpenAI calls that might bypass tracking
const directOpenAICalls = (serverCode.match(/openai\.chat\.completions\.create/g) || []).length;
console.log(`Direct OpenAI API calls (potential tracking bypass): ${directOpenAICalls}`);

// Summary
console.log('\n' + '='.repeat(80));
console.log('\n📈 FINAL VERIFICATION RESULTS\n');

const fullyTracked = trackingDetails.filter(d => d.fullyTracked).length;
const partiallyTracked = trackingDetails.filter(d => d.hasOperationType && !d.fullyTracked).length;
const notTracked = trackingDetails.filter(d => !d.hasOperationType).length;

console.log(`✅ Fully Tracked: ${fullyTracked}/16 functions`);
console.log(`⚠️  Partially Tracked: ${partiallyTracked}/16 functions`);
console.log(`❌ Not Tracked: ${notTracked}/16 functions`);

if (allTracked) {
  console.log('\n🎉 SUCCESS: All 16 AI functions are properly tracking tokens!');
} else {
  console.log('\n⚠️  WARNING: Some AI functions may not be fully tracking tokens.');
  console.log('\nFunctions needing attention:');
  trackingDetails
    .filter(d => !d.fullyTracked)
    .forEach(d => {
      console.log(`  - ${d.function}: ${d.hasOperationType ? 'Missing metadata' : 'Operation type not found'}`);
    });
}

// Export results for documentation
fs.writeFileSync(
  'token-tracking-verification.json',
  JSON.stringify(trackingDetails, null, 2)
);

console.log('\n📄 Detailed results saved to token-tracking-verification.json');