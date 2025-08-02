// Script to fix missing handoff_completed_at column
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './BACKEND/.env' });

const supabaseUrl = process.env.SUPABASE_URL || 'https://kbmsygyawpiqegemzetp.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtibXN5Z3lhd3BpcWVnZW16ZXRwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTc3ODgyMiwiZXhwIjoyMDY3MzU0ODIyfQ.Ul6La44d01oi6GYep4fvFOGeP2rBUEh57kfWLDB4uBI';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function fixHandoffColumn() {
  try {
    console.log('Adding handoff_completed_at column to conversations table...');
    
    // Add the missing column
    const { error } = await supabase.rpc('execute_sql', {
      query: `
        ALTER TABLE conversations 
        ADD COLUMN IF NOT EXISTS handoff_completed_at TIMESTAMP WITH TIME ZONE;
      `
    }).single();

    if (error) {
      // Try a different approach if RPC doesn't work
      console.log('RPC approach failed, trying direct query...');
      
      // Check if column exists first
      const { data: columns, error: checkError } = await supabase
        .from('conversations')
        .select('*')
        .limit(0);
      
      console.log('Current table structure check completed');
      
      // Since we can't directly alter the table through Supabase client,
      // we'll provide the SQL that needs to be run
      console.log('\nPlease run the following SQL in your Supabase SQL editor:');
      console.log('------------------------------------------------------');
      console.log(`
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS handoff_completed_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN conversations.handoff_completed_at IS 'Timestamp when handoff was completed or transferred back to AI';
      `);
      console.log('------------------------------------------------------');
      
      console.log('\nAlternatively, run the migration file:');
      console.log('BACKEND/migrations/003_human_handoff_system.sql');
    } else {
      console.log('✅ Column added successfully!');
    }

  } catch (error) {
    console.error('Error:', error);
    
    console.log('\n❌ Could not add column automatically.');
    console.log('Please run this SQL manually in Supabase:');
    console.log('------------------------------------------------------');
    console.log(`
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS handoff_completed_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN conversations.handoff_completed_at IS 'Timestamp when handoff was completed or transferred back to AI';
    `);
    console.log('------------------------------------------------------');
  }
}

// Run the fix
fixHandoffColumn();