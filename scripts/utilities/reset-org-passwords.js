#!/usr/bin/env node

/**
 * Reset passwords for organization admin users
 * Sets all passwords to: Admin123!
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ORG_ADMINS = [
  { email: 'admin@primeresidential.com', name: 'Prime Residential Admin' },
  { email: 'admin@commercialproperty.com', name: 'Commercial Property Admin' },
  { email: 'admin@luxuryestates.com', name: 'Luxury Estate Admin' },
  { email: 'admin@urbanrentals.com', name: 'Urban Rental Admin' }
];

const NEW_PASSWORD = 'Admin123!';

async function resetPasswords() {
  console.log('🔐 Resetting passwords for organization admin users...\n');
  
  for (const admin of ORG_ADMINS) {
    console.log(`Processing: ${admin.email}`);
    
    try {
      // Update password using admin API
      const { data, error } = await supabase.auth.admin.updateUserById(
        await getUserId(admin.email),
        { password: NEW_PASSWORD }
      );
      
      if (error) {
        console.log(`  ❌ Error: ${error.message}`);
      } else {
        console.log(`  ✅ Password reset successfully`);
      }
    } catch (err) {
      console.log(`  ❌ Error: ${err.message}`);
    }
  }
  
  console.log('\n✨ Password reset complete!');
  console.log(`All passwords set to: ${NEW_PASSWORD}`);
}

async function getUserId(email) {
  const { data, error } = await supabase
    .from('auth.users')
    .select('id')
    .eq('email', email)
    .single();
  
  if (error || !data) {
    // Try direct auth query
    const { data: users } = await supabase.auth.admin.listUsers();
    const user = users?.users?.find(u => u.email === email);
    if (user) return user.id;
    throw new Error(`User not found: ${email}`);
  }
  
  return data.id;
}

// Run the reset
resetPasswords().catch(console.error);