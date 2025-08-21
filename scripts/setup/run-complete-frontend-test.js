#!/usr/bin/env node

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function checkServers() {
  console.log('🔍 Checking if servers are running...\n');
  
  // Check backend
  try {
    const response = await fetch('http://localhost:3001/api/health');
    if (response.ok) {
      console.log('✅ Backend server is running on port 3001');
    }
  } catch (error) {
    console.log('❌ Backend server is not running');
    console.log('   Please start it with: cd BACKEND && npm run server\n');
    return false;
  }
  
  // Check frontend
  try {
    const response = await fetch('http://localhost:3000');
    if (response.ok) {
      console.log('✅ Frontend server is running on port 3000');
    }
  } catch (error) {
    console.log('❌ Frontend server is not running');
    console.log('   Please start it with: cd FRONTEND/financial-dashboard-2 && npm run dev\n');
    return false;
  }
  
  return true;
}

async function installDependencies() {
  console.log('\n📦 Checking dependencies...');
  
  try {
    require('playwright');
    require('@supabase/supabase-js');
    console.log('✅ All dependencies installed\n');
  } catch (error) {
    console.log('📦 Installing missing dependencies...');
    await execAsync('npm install playwright @supabase/supabase-js dotenv uuid');
    console.log('✅ Dependencies installed\n');
  }
}

async function runTests() {
  console.log('🚀 STARTING COMPLETE FRONTEND TESTING SUITE');
  console.log('=' .repeat(60));
  console.log('This will:');
  console.log('  1. Test login for all created accounts');
  console.log('  2. Simulate real conversations with AI agents');
  console.log('  3. Test BANT scoring (hot, warm, cold leads)');
  console.log('  4. Test handoff requests');
  console.log('  5. Verify token tracking');
  console.log('  6. Verify lead management');
  console.log('  7. Check conversation history');
  console.log('=' .repeat(60));
  console.log('');
  
  // Check if servers are running
  const serversReady = await checkServers();
  if (!serversReady) {
    console.log('\n⚠️  Please start both servers before running tests');
    process.exit(1);
  }
  
  // Install dependencies if needed
  await installDependencies();
  
  console.log('🎬 Starting Playwright tests...\n');
  
  // Run the comprehensive test
  try {
    const { stdout, stderr } = await execAsync('node test-frontend-simulation-complete.js');
    console.log(stdout);
    if (stderr) console.error(stderr);
  } catch (error) {
    console.error('Test execution failed:', error.message);
    process.exit(1);
  }
}

// Interactive menu
async function showMenu() {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const question = (prompt) => new Promise(resolve => readline.question(prompt, resolve));
  
  console.log('\n🏠 Real Estate AI Agent - Test Suite');
  console.log('=' .repeat(40));
  console.log('1. Run complete frontend test (recommended)');
  console.log('2. Run quick validation test');
  console.log('3. Generate test data only');
  console.log('4. Clean all test data');
  console.log('5. Exit');
  console.log('=' .repeat(40));
  
  const choice = await question('\nSelect option (1-5): ');
  
  switch (choice) {
    case '1':
      readline.close();
      await runTests();
      break;
    case '2':
      readline.close();
      console.log('\nRunning quick validation...');
      await execAsync('node test-frontend-with-playwright.js');
      break;
    case '3':
      readline.close();
      console.log('\nGenerating test data...');
      await execAsync('node generate-conversations-directly.js');
      break;
    case '4':
      readline.close();
      console.log('\nCleaning test data...');
      await execAsync('node clean-test-data-fixed.js');
      break;
    case '5':
      readline.close();
      console.log('\nGoodbye! 👋');
      process.exit(0);
      break;
    default:
      console.log('\nInvalid option');
      readline.close();
      process.exit(1);
  }
}

// Main execution
if (require.main === module) {
  // Check for command line arguments
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node run-complete-frontend-test.js [options]');
    console.log('Options:');
    console.log('  --auto    Run tests automatically without menu');
    console.log('  --help    Show this help message');
    process.exit(0);
  }
  
  if (args.includes('--auto')) {
    runTests().catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
  } else {
    showMenu().catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
  }
}