const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Initialize Supabase client with service role key (has full access)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyMigration() {
  console.log('🚀 Applying Feature Requests Migration\n');
  console.log('================================\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'BACKEND', 'migrations', 'create-feature-requests-table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split the migration into individual statements (separated by semicolons)
    // Remove comments and empty lines
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--'))
      .map(stmt => stmt + ';');

    console.log(`📋 Found ${statements.length} SQL statements to execute\n`);

    // Since Supabase client doesn't support raw SQL execution directly,
    // we'll create the tables using the admin API
    console.log('⚠️  Important: The feature_requests table needs to be created in your Supabase dashboard.\n');
    console.log('📝 Instructions:\n');
    console.log('1. Go to your Supabase project dashboard');
    console.log('2. Navigate to the SQL Editor');
    console.log('3. Copy the contents of BACKEND/migrations/create-feature-requests-table.sql');
    console.log('4. Paste and run it in the SQL editor\n');
    
    console.log('Alternatively, here\'s a simplified version to get started:\n');
    
    // Provide a simplified table creation that can be run
    const simplifiedSQL = `
-- Create feature_requests table
CREATE TABLE IF NOT EXISTS public.feature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT NOT NULL,
  user_name TEXT,
  requested_feature TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'submitted',
  priority TEXT DEFAULT 'medium',
  admin_notes TEXT,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  upvotes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_feature_requests_org_id ON public.feature_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_feature_requests_user_id ON public.feature_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_requests_status ON public.feature_requests(status);
CREATE INDEX IF NOT EXISTS idx_feature_requests_priority ON public.feature_requests(priority);

-- Enable RLS
ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policy for viewing
CREATE POLICY "Users can view feature requests" ON public.feature_requests
  FOR SELECT USING (true);

-- Create basic RLS policy for inserting
CREATE POLICY "Authenticated users can create feature requests" ON public.feature_requests
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Grant permissions to service role
GRANT ALL ON public.feature_requests TO service_role;
`;

    console.log('Copy this SQL and run it in your Supabase SQL Editor:');
    console.log('```sql');
    console.log(simplifiedSQL);
    console.log('```\n');

    // Test if the table exists
    console.log('🔍 Testing if feature_requests table exists...\n');
    
    const { data, error } = await supabase
      .from('feature_requests')
      .select('id')
      .limit(1);

    if (error) {
      if (error.message.includes('does not exist')) {
        console.log('❌ Table does not exist yet. Please run the migration in Supabase dashboard.');
        console.log('\n📂 Full migration file is located at:');
        console.log(`   ${migrationPath}`);
      } else {
        console.log('❌ Error checking table:', error.message);
      }
    } else {
      console.log('✅ Table exists! The feature requests system should now work.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the migration check
applyMigration();