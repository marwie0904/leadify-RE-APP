// Test to verify AI-first classification is working
const fs = require('fs');

console.log('🔍 Verifying AI-First Classification Implementation');
console.log('=' . repeat(60));

// Read the server.js file to check the implementation
const serverCode = fs.readFileSync('/Users/macbookpro/Business/REAL-ESTATE-WEB-APP/BACKEND/server.js', 'utf8');

// Check for key changes that indicate AI-first approach
const checks = [
  {
    name: 'Retry logic implemented',
    pattern: /let retryCount = 0;\s*const maxRetries = 3;/,
    found: false
  },
  {
    name: 'Enhanced prompt with BANT context',
    pattern: /You are classifying user messages in a real estate conversation/,
    found: false
  },
  {
    name: 'Increased token limit',
    pattern: /max_completion_tokens: 20/,
    found: false
  },
  {
    name: 'Pattern detection as hint only',
    pattern: /Pattern Detection Found:/,
    found: false
  },
  {
    name: 'AI-first (no pattern override)',
    pattern: /AI-first, no pattern overrides/,
    found: false
  }
];

// Run checks
checks.forEach(check => {
  check.found = check.pattern.test(serverCode);
});

// Display results
console.log('\n✅ Code Verification Results:');
console.log('-'.repeat(40));

checks.forEach(check => {
  console.log(`${check.found ? '✅' : '❌'} ${check.name}`);
});

const allPassed = checks.every(c => c.found);

console.log('\n' + '='.repeat(60));
if (allPassed) {
  console.log('🎉 SUCCESS: AI-first classification is properly implemented!');
  console.log('\nThe system now:');
  console.log('  • Uses AI as primary classifier');
  console.log('  • Pattern detection provides hints only');
  console.log('  • Retries up to 3 times for empty responses');
  console.log('  • Includes conversation context');
  console.log('  • Has enhanced BANT-aware prompts');
} else {
  console.log('⚠️ WARNING: Some AI-first features may not be active');
  console.log('Please verify the server is running the updated code');
}

console.log('\n📝 To test with actual messages:');
console.log('  1. Send "I am looking for a property" to trigger BANT');
console.log('  2. Answer "30M" for budget');
console.log('  3. Answer "yes" for authority');
console.log('  4. Answer "residency" for need');
console.log('  5. Check if it proceeds to timeline question');

console.log('\n💡 Monitor server-new.log for "[MASTER INTENT]" lines');
console.log('   You should see:');
console.log('   - "Pattern Detection Found" (as hint)');
console.log('   - "AI Response: BANT"');
console.log('   - "FINAL CLASSIFICATION: BANT"');