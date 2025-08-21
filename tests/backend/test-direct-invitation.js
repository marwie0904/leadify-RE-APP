#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Create TWO clients - one with service role, one with anon key
const supabaseService = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const supabaseAnon = createClient(
  process.env.SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
);

async function testBothClients() {
  console.log('🔍 Testing Invitation Creation with Different Supabase Clients\n');
  console.log('=' .repeat(60));
  
  const testInvite = {
    email: 'test_' + Date.now() + '@example.com',
    organization_id: '74b8a0fd-4352-4526-bb9c-97e3af99adfb',
    token: 'test_token_' + Date.now(),
    status: 'pending',
    role: 'member',
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    invited_by: 'fcd02996-d83f-4b4b-ad35-5c98b0ad651e'
  };
  
  // Test 1: Service Role Client
  console.log('1️⃣ Testing with SERVICE ROLE client:');
  const { data: serviceData, error: serviceError } = await supabaseService
    .from('organization_invites')
    .insert(testInvite)
    .select();
  
  if (serviceError) {
    console.log('❌ Service role failed:', serviceError.message);
    console.log('   Error code:', serviceError.code);
  } else {
    console.log('✅ Service role SUCCESS!');
    console.log('   Created invitation:', serviceData[0].id);
    
    // Clean up
    await supabaseService
      .from('organization_invites')
      .delete()
      .eq('id', serviceData[0].id);
  }
  
  // Test 2: Anon Client (should fail due to RLS)
  console.log('\n2️⃣ Testing with ANON client (should fail):');
  const testInvite2 = { ...testInvite, token: 'test_token_anon_' + Date.now() };
  
  const { data: anonData, error: anonError } = await supabaseAnon
    .from('organization_invites')
    .insert(testInvite2)
    .select();
  
  if (anonError) {
    console.log('✅ Anon client failed as expected:', anonError.message);
    console.log('   Error code:', anonError.code);
  } else {
    console.log('⚠️ Anon client unexpectedly succeeded (RLS might be disabled)');
    // Clean up
    await supabaseService
      .from('organization_invites')
      .delete()
      .eq('id', anonData[0].id);
  }
  
  // Check which key the server.js is using
  console.log('\n3️⃣ Checking server.js configuration:');
  console.log('   SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Not set');
  console.log('   Key starts with:', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + '...');
  
  // Decode to check role
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (key) {
    const parts = key.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      console.log('   JWT Role:', payload.role === 'service_role' ? '✅ service_role' : `❌ ${payload.role}`);
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('\n📋 Summary:');
  if (serviceError) {
    console.log('❌ The service role client cannot insert invitations.');
    console.log('   This suggests RLS is blocking even the service role.');
    console.log('\n   Solutions:');
    console.log('   1. Go to Supabase Dashboard > Table Editor > organization_invites');
    console.log('   2. Click on the RLS button and temporarily disable it');
    console.log('   3. Or update RLS policies to allow service role');
  } else {
    console.log('✅ Service role client works correctly!');
    console.log('   The issue in the app might be:');
    console.log('   - Server using wrong Supabase client');
    console.log('   - Server needs restart after .env changes');
    console.log('   - Authentication middleware interfering');
  }
}

testBothClients();