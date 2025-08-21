#!/usr/bin/env node

const { cleanTestData } = require('./clean-test-data-fixed');
const { createUsersAndOrganizations } = require('./create-users-orgs-fixed');
const { createAgents } = require('./create-agents');
const { createIssuesAndFeatures } = require('./create-issues-features');
const { simulateConversations } = require('./simulate-conversations');
const { verifyAllData } = require('./verify-all-data');

async function runCompleteTestDataGeneration() {
  console.log('🚀 STARTING COMPLETE TEST DATA GENERATION AND SIMULATION');
  console.log('=' .repeat(60));
  console.log('This process will:');
  console.log('1. Clean existing test data');
  console.log('2. Create 24 users (4 admins + 20 agents)');
  console.log('3. Create 4 organizations');
  console.log('4. Create 4 AI agents with different BANT configs');
  console.log('5. Create 8 issues and 4 feature requests');
  console.log('6. Simulate 80 conversations (20 per agent)');
  console.log('7. Verify all data was created successfully');
  console.log('=' .repeat(60));
  console.log('\n');
  
  const startTime = Date.now();
  
  try {
    // Phase 1: Clean existing data
    console.log('📋 PHASE 1: CLEANING EXISTING DATA');
    console.log('-'.repeat(40));
    await cleanTestData();
    console.log('✅ Phase 1 complete\n');
    
    // Phase 2: Create users and organizations
    console.log('📋 PHASE 2: CREATING USERS AND ORGANIZATIONS');
    console.log('-'.repeat(40));
    const { organizations, users } = await createUsersAndOrganizations();
    console.log('✅ Phase 2 complete\n');
    
    // Phase 3: Create AI agents
    console.log('📋 PHASE 3: CREATING AI AGENTS');
    console.log('-'.repeat(40));
    const agents = await createAgents();
    console.log('✅ Phase 3 complete\n');
    
    // Phase 4: Create issues and feature requests
    console.log('📋 PHASE 4: CREATING ISSUES AND FEATURE REQUESTS');
    console.log('-'.repeat(40));
    const { issues, features } = await createIssuesAndFeatures();
    console.log('✅ Phase 4 complete\n');
    
    // Phase 5: Simulate conversations
    console.log('📋 PHASE 5: SIMULATING CONVERSATIONS');
    console.log('-'.repeat(40));
    console.log('⚠️  This will open browser windows to simulate real user interactions');
    console.log('⚠️  This phase will take approximately 20-30 minutes');
    
    const simulateChoice = process.argv[2];
    if (simulateChoice === '--skip-simulation') {
      console.log('⏭️  Skipping conversation simulation (--skip-simulation flag)');
    } else if (simulateChoice === '--headless') {
      console.log('🎭 Running headless simulation (faster)...');
      await simulateConversations();
    } else {
      console.log('🎭 Running visible browser simulation...');
      await simulateConversations();
    }
    console.log('✅ Phase 5 complete\n');
    
    // Phase 6: Verify all data
    console.log('📋 PHASE 6: VERIFYING ALL DATA');
    console.log('-'.repeat(40));
    const verificationResults = await verifyAllData();
    
    // Calculate total time
    const totalTime = Math.round((Date.now() - startTime) / 1000);
    const minutes = Math.floor(totalTime / 60);
    const seconds = totalTime % 60;
    
    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 COMPLETE TEST DATA GENERATION FINISHED!');
    console.log('='.repeat(60));
    console.log(`⏱️  Total time: ${minutes}m ${seconds}s`);
    console.log('\n📊 Created:');
    console.log(`   • ${users.length} users`);
    console.log(`   • ${organizations.length} organizations`);
    console.log(`   • ${agents.length} AI agents`);
    console.log(`   • ${issues.length} issues`);
    console.log(`   • ${features.length} feature requests`);
    console.log(`   • ${verificationResults.conversations.actual} conversations`);
    console.log(`   • ${verificationResults.leads.total} leads`);
    
    console.log('\n🔑 Login Credentials:');
    console.log('   All users have password: TestPassword123!');
    console.log('\n   Admin accounts:');
    console.log('   • admin@primeresidential.com');
    console.log('   • admin@commercialproperty.com');
    console.log('   • admin@luxuryestates.com');
    console.log('   • admin@urbanrentals.com');
    
    console.log('\n   Sample agent accounts:');
    console.log('   • agent1@primeresidential.com');
    console.log('   • agent1@commercialproperty.com');
    console.log('   • agent1@luxuryestates.com');
    console.log('   • agent1@urbanrentals.com');
    
    console.log('\n✅ You can now test all features with realistic data!');
    console.log('=' .repeat(60));
    
  } catch (error) {
    console.error('\n❌ ERROR DURING TEST DATA GENERATION:', error);
    console.error('Please check the logs above for specific errors');
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('Usage: node run-complete-test-data-generation-fixed.js [options]');
  console.log('\nOptions:');
  console.log('  --skip-simulation   Skip the conversation simulation phase');
  console.log('  --headless         Run browser simulation in headless mode (faster)');
  console.log('  --help             Show this help message');
  process.exit(0);
}

// Run the complete process
runCompleteTestDataGeneration().then(() => {
  console.log('\n✨ All done! Happy testing!');
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});