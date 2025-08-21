/**
 * Test Supabase Tables for Admin Dashboard
 */

require('dotenv').config({ path: './BACKEND/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testSupabaseTables() {
  console.log('=======================================');
  console.log('    SUPABASE TABLES TEST');
  console.log('=======================================\n');

  try {
    // 1. Check issues table
    console.log('1. Checking issues table...');
    const { data: issues, error: issuesError, count: issuesCount } = await supabase
      .from('issues')
      .select('*', { count: 'exact' })
      .limit(5);

    if (issuesError) {
      if (issuesError.message.includes('does not exist')) {
        console.log('   ❌ Table "issues" does not exist');
        console.log('   Creating table...\n');
        
        // Create issues table
        const createIssuesSQL = `
CREATE TABLE IF NOT EXISTS issues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  category TEXT,
  user_id UUID,
  organization_id UUID,
  assigned_to UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Insert sample data
INSERT INTO issues (title, description, status, priority, category, organization_id) VALUES
('Login button not working', 'Users unable to login on mobile devices', 'open', 'high', 'bug', '770257fa-dc41-4529-9cb3-43b47072c271'),
('Slow response times', 'API responses taking over 5 seconds', 'in_progress', 'critical', 'performance', '770257fa-dc41-4529-9cb3-43b47072c271'),
('Missing translations', 'Spanish translations missing for dashboard', 'open', 'low', 'feature', '770257fa-dc41-4529-9cb3-43b47072c271');
        `;
        console.log(createIssuesSQL);
      } else {
        console.log('   ❌ Error:', issuesError.message);
      }
    } else {
      console.log(`   ✅ Issues table exists with ${issuesCount || 0} records`);
      if (issues && issues.length > 0) {
        console.log('   Sample issues:');
        issues.forEach(issue => {
          console.log(`   - ${issue.title} (${issue.status}, ${issue.priority})`);
        });
      }
    }

    // 2. Check feature_requests table
    console.log('\n2. Checking feature_requests table...');
    const { data: features, error: featuresError, count: featuresCount } = await supabase
      .from('feature_requests')
      .select('*', { count: 'exact' })
      .limit(5);

    if (featuresError) {
      if (featuresError.message.includes('does not exist')) {
        console.log('   ❌ Table "feature_requests" does not exist');
        console.log('   Creating table...\n');
        
        // Create feature_requests table
        const createFeaturesSQL = `
CREATE TABLE IF NOT EXISTS feature_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'approved', 'in_development', 'completed', 'rejected')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  category TEXT,
  user_id UUID,
  organization_id UUID,
  votes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Insert sample data
INSERT INTO feature_requests (title, description, status, priority, category, organization_id, votes) VALUES
('Dark mode support', 'Add dark mode theme to the dashboard', 'reviewing', 'high', 'ui/ux', '770257fa-dc41-4529-9cb3-43b47072c271', 45),
('Export to PDF', 'Allow exporting reports as PDF files', 'approved', 'medium', 'feature', '770257fa-dc41-4529-9cb3-43b47072c271', 23),
('Bulk import leads', 'Import multiple leads from CSV file', 'in_development', 'high', 'feature', '770257fa-dc41-4529-9cb3-43b47072c271', 67),
('Mobile app', 'Native mobile application for iOS and Android', 'pending', 'low', 'feature', '770257fa-dc41-4529-9cb3-43b47072c271', 12);
        `;
        console.log(createFeaturesSQL);
      } else {
        console.log('   ❌ Error:', featuresError.message);
      }
    } else {
      console.log(`   ✅ Feature requests table exists with ${featuresCount || 0} records`);
      if (features && features.length > 0) {
        console.log('   Sample feature requests:');
        features.forEach(feature => {
          console.log(`   - ${feature.title} (${feature.status}, votes: ${feature.votes || 0})`);
        });
      }
    }

    // 3. Check dev_members table (for AI Analytics access)
    console.log('\n3. Checking dev_members table...');
    const { data: devMembers, error: devError, count: devCount } = await supabase
      .from('dev_members')
      .select('*', { count: 'exact' })
      .limit(5);

    if (devError) {
      console.log('   ❌ Error:', devError.message);
    } else {
      console.log(`   ✅ Dev members table exists with ${devCount || 0} records`);
      if (devMembers && devMembers.length > 0) {
        console.log('   Dev members:');
        devMembers.forEach(member => {
          console.log(`   - ${member.email} (${member.role}, active: ${member.is_active})`);
        });
      }
    }

    // 4. Check ai_token_usage table
    console.log('\n4. Checking ai_token_usage table...');
    const { data: tokenUsage, error: tokenError, count: tokenCount } = await supabase
      .from('ai_token_usage')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(3);

    if (tokenError) {
      console.log('   ❌ Error:', tokenError.message);
    } else {
      console.log(`   ✅ AI token usage table exists with ${tokenCount || 0} records`);
      if (tokenUsage && tokenUsage.length > 0) {
        let totalTokens = 0;
        let totalCost = 0;
        tokenUsage.forEach(usage => {
          totalTokens += usage.total_tokens || 0;
          totalCost += parseFloat(usage.cost) || 0;
        });
        console.log(`   Recent usage: ${totalTokens} tokens, $${totalCost.toFixed(2)} cost`);
      }
    }

    // 5. Summary
    console.log('\n=======================================');
    console.log('    SUMMARY');
    console.log('=======================================');
    console.log('\nTables Status:');
    console.log(`- Issues: ${issuesError ? '❌ Missing/Error' : `✅ ${issuesCount} records`}`);
    console.log(`- Feature Requests: ${featuresError ? '❌ Missing/Error' : `✅ ${featuresCount} records`}`);
    console.log(`- Dev Members: ${devError ? '❌ Error' : `✅ ${devCount} records`}`);
    console.log(`- AI Token Usage: ${tokenError ? '❌ Error' : `✅ ${tokenCount} records`}`);

    if (issuesError?.message.includes('does not exist') || featuresError?.message.includes('does not exist')) {
      console.log('\n⚠️  Some tables are missing. Run the SQL commands above to create them.');
    }

  } catch (error) {
    console.error('Fatal error:', error);
  }
}

// Run the test
testSupabaseTables();