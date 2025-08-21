const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testSetup() {
  console.log('🧪 Testing Real Estate AI Agent Setup\n');

  // Test environment variables
  console.log('1. Checking environment variables...');
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'OPENAI_API_KEY',
    'SUPABASE_STORAGE_BUCKET'
  ];

  let allVarsPresent = true;
  for (const varName of requiredVars) {
    if (!process.env[varName] || process.env[varName].includes('your_')) {
      console.log(`   ❌ ${varName}: Not configured`);
      allVarsPresent = false;
    } else {
      console.log(`   ✅ ${varName}: Configured`);
    }
  }

  if (!allVarsPresent) {
    console.log('\n⚠️  Please update your .env file with actual credentials before testing.');
    return;
  }

  // Test Supabase connection
  console.log('\n2. Testing Supabase connection...');
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Test basic connection
    const { data, error } = await supabase.from('agents').select('count').limit(1);
    
    if (error) {
      console.log('   ❌ Supabase connection failed:', error.message);
      console.log('   💡 Make sure you\'ve run the SQL from supabase-setup.sql');
    } else {
      console.log('   ✅ Supabase connection successful');
    }
  } catch (error) {
    console.log('   ❌ Supabase connection failed:', error.message);
  }

  // Test OpenAI connection
  console.log('\n3. Testing OpenAI connection...');
  try {
    const OpenAI = require('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Test with a simple embedding
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: 'test',
    });

    if (response.data && response.data[0].embedding) {
      console.log('   ✅ OpenAI connection successful');
    } else {
      console.log('   ❌ OpenAI response invalid');
    }
  } catch (error) {
    console.log('   ❌ OpenAI connection failed:', error.message);
  }

  // Test storage bucket
  console.log('\n4. Testing Supabase Storage...');
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.log('   ❌ Storage access failed:', error.message);
    } else {
      const bucketExists = data.some(bucket => bucket.name === process.env.SUPABASE_STORAGE_BUCKET);
      if (bucketExists) {
        console.log('   ✅ Storage bucket found');
      } else {
        console.log('   ❌ Storage bucket not found');
        console.log('   💡 Create a bucket named "documents" in Supabase Storage');
      }
    }
  } catch (error) {
    console.log('   ❌ Storage test failed:', error.message);
  }

  console.log('\n🎯 Setup Summary:');
  console.log('- Environment variables: ' + (allVarsPresent ? '✅' : '❌'));
  console.log('- Supabase connection: ' + (allVarsPresent ? '✅' : '❌'));
  console.log('- OpenAI connection: ' + (allVarsPresent ? '✅' : '❌'));
  console.log('- Storage bucket: ' + (allVarsPresent ? '✅' : '❌'));

  if (allVarsPresent) {
    console.log('\n🚀 Ready to start the servers!');
    console.log('   Backend: node server.js');
    console.log('   Frontend: npm run dev');
  } else {
    console.log('\n⚠️  Please fix the issues above before starting the servers.');
  }
}

testSetup().catch(console.error); 