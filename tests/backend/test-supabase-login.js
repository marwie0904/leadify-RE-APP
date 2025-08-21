/**
 * Test Supabase login
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testLogin() {
  console.log('Testing Supabase login...\n');
  
  const passwords = ['ayokonga123', 'abcd', 'Marw1234', '123456'];
  
  for (const password of passwords) {
    console.log(`Trying password: ${password}`);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'marwryyyy@gmail.com',
      password: password
    });
    
    if (!error && data.session) {
      console.log(`✅ SUCCESS with password: ${password}`);
      console.log(`   User ID: ${data.user.id}`);
      console.log(`   Email: ${data.user.email}`);
      console.log(`   Token: ${data.session.access_token.substring(0, 50)}...`);
      
      // Sign out
      await supabase.auth.signOut();
      return;
    } else {
      console.log(`❌ Failed: ${error?.message}`);
    }
  }
  
  console.log('\nNone of the passwords worked. Please check the correct password.');
}

testLogin();