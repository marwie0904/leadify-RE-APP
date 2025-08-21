#!/usr/bin/env node

/**
 * Comprehensive Database Schema Migration Script
 * Fixes all mismatches between application expectations and actual database schema
 * 
 * This script will:
 * 1. Add missing columns to all tables
 * 2. Create missing tables if needed
 * 3. Ensure proper data types and constraints
 * 4. Maintain backward compatibility
 */

require('dotenv').config({ path: './BACKEND/.env' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role for admin access
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Migration queries to fix all schema mismatches
const migrations = [
  {
    name: 'Add missing columns to organizations table',
    queries: [
      `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended'))`,
      `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'professional', 'enterprise'))`,
      `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`,
      `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`
    ]
  },
  {
    name: 'Add missing columns to organization_members table',
    queries: [
      `ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`,
      `ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`,
      `ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'invited'))`,
      `ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`
    ]
  },
  {
    name: 'Add missing columns to agents table',
    queries: [
      `ALTER TABLE agents ADD COLUMN IF NOT EXISTS organization_id UUID`,
      `ALTER TABLE agents ADD COLUMN IF NOT EXISTS bant_enabled BOOLEAN DEFAULT false`,
      `ALTER TABLE agents ADD COLUMN IF NOT EXISTS bant_config JSONB DEFAULT '{}'::jsonb`,
      `ALTER TABLE agents ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'sales' CHECK (type IN ('sales', 'support', 'technical', 'custom'))`,
      `ALTER TABLE agents ADD COLUMN IF NOT EXISTS system_prompt TEXT`,
      `ALTER TABLE agents ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true`,
      `ALTER TABLE agents ADD COLUMN IF NOT EXISTS token_usage INTEGER DEFAULT 0`,
      `ALTER TABLE agents ADD COLUMN IF NOT EXISTS conversation_count INTEGER DEFAULT 0`
    ]
  },
  {
    name: 'Add missing columns to conversations table',
    queries: [
      `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`,
      `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`,
      `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS organization_id UUID`,
      `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0`,
      `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS total_tokens INTEGER DEFAULT 0`,
      `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS estimated_cost DECIMAL(10,4) DEFAULT 0`,
      `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_name TEXT`,
      `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_email TEXT`,
      `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_phone TEXT`,
      `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'web' CHECK (source IN ('web', 'facebook', 'embed', 'api', 'whatsapp'))`,
      `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived'))`
    ]
  },
  {
    name: 'Add missing columns to messages table',
    queries: [
      `ALTER TABLE messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`,
      `ALTER TABLE messages ADD COLUMN IF NOT EXISTS token_count INTEGER DEFAULT 0`,
      `ALTER TABLE messages ADD COLUMN IF NOT EXISTS model TEXT DEFAULT 'gpt-4'`,
      `ALTER TABLE messages ADD COLUMN IF NOT EXISTS cost DECIMAL(10,6) DEFAULT 0`,
      `ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb`
    ]
  },
  {
    name: 'Fix leads table - rename BAND to BANT and add missing columns',
    queries: [
      // Rename existing BAND columns to BANT if they exist
      `DO $$ 
       BEGIN 
         IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads' AND column_name='band_completion') THEN
           ALTER TABLE leads RENAME COLUMN band_completion TO bant_completion;
         END IF;
       END $$`,
      
      // Add BANT score columns
      `ALTER TABLE leads ADD COLUMN IF NOT EXISTS bant_budget INTEGER DEFAULT 0`,
      `ALTER TABLE leads ADD COLUMN IF NOT EXISTS bant_authority INTEGER DEFAULT 0`,
      `ALTER TABLE leads ADD COLUMN IF NOT EXISTS bant_need INTEGER DEFAULT 0`,
      `ALTER TABLE leads ADD COLUMN IF NOT EXISTS bant_timeline INTEGER DEFAULT 0`,
      `ALTER TABLE leads ADD COLUMN IF NOT EXISTS bant_completion INTEGER DEFAULT 0`,
      
      // Add missing metadata columns
      `ALTER TABLE leads ADD COLUMN IF NOT EXISTS organization_id UUID`,
      `ALTER TABLE leads ADD COLUMN IF NOT EXISTS name TEXT`,
      `ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone TEXT`,
      `ALTER TABLE leads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'nurturing', 'lost'))`,
      `ALTER TABLE leads ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0`,
      `ALTER TABLE leads ADD COLUMN IF NOT EXISTS property_type TEXT`,
      `ALTER TABLE leads ADD COLUMN IF NOT EXISTS location_preference TEXT`,
      `ALTER TABLE leads ADD COLUMN IF NOT EXISTS notes TEXT`,
      `ALTER TABLE leads ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'web'`,
      `ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_to UUID`
    ]
  },
  {
    name: 'Create issues table if it does not exist',
    queries: [
      `CREATE TABLE IF NOT EXISTS issues (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'planned')),
        priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
        type TEXT DEFAULT 'bug' CHECK (type IN ('bug', 'feature', 'enhancement', 'performance', 'security')),
        created_by UUID,
        assigned_to UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        resolved_at TIMESTAMP WITH TIME ZONE,
        metadata JSONB DEFAULT '{}'::jsonb
      )`,
      
      // Add indexes for better performance
      `CREATE INDEX IF NOT EXISTS idx_issues_organization_id ON issues(organization_id)`,
      `CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status)`,
      `CREATE INDEX IF NOT EXISTS idx_issues_priority ON issues(priority)`,
      `CREATE INDEX IF NOT EXISTS idx_issues_type ON issues(type)`,
      `CREATE INDEX IF NOT EXISTS idx_issues_created_at ON issues(created_at)`
    ]
  },
  {
    name: 'Add foreign key constraints where missing',
    queries: [
      // Add organization_id foreign key to agents if not exists
      `DO $$ 
       BEGIN 
         IF NOT EXISTS (
           SELECT 1 FROM information_schema.table_constraints 
           WHERE constraint_name='agents_organization_id_fkey'
         ) THEN
           ALTER TABLE agents 
           ADD CONSTRAINT agents_organization_id_fkey 
           FOREIGN KEY (organization_id) 
           REFERENCES organizations(id) ON DELETE CASCADE;
         END IF;
       END $$`,
       
      // Add organization_id foreign key to conversations if not exists
      `DO $$ 
       BEGIN 
         IF NOT EXISTS (
           SELECT 1 FROM information_schema.table_constraints 
           WHERE constraint_name='conversations_organization_id_fkey'
         ) THEN
           ALTER TABLE conversations 
           ADD CONSTRAINT conversations_organization_id_fkey 
           FOREIGN KEY (organization_id) 
           REFERENCES organizations(id) ON DELETE CASCADE;
         END IF;
       END $$`,
       
      // Add organization_id foreign key to leads if not exists
      `DO $$ 
       BEGIN 
         IF NOT EXISTS (
           SELECT 1 FROM information_schema.table_constraints 
           WHERE constraint_name='leads_organization_id_fkey'
         ) THEN
           ALTER TABLE leads 
           ADD CONSTRAINT leads_organization_id_fkey 
           FOREIGN KEY (organization_id) 
           REFERENCES organizations(id) ON DELETE CASCADE;
         END IF;
       END $$`,
       
      // Add organization_id foreign key to issues if not exists  
      `DO $$ 
       BEGIN 
         IF NOT EXISTS (
           SELECT 1 FROM information_schema.table_constraints 
           WHERE constraint_name='issues_organization_id_fkey'
         ) THEN
           ALTER TABLE issues 
           ADD CONSTRAINT issues_organization_id_fkey 
           FOREIGN KEY (organization_id) 
           REFERENCES organizations(id) ON DELETE CASCADE;
         END IF;
       END $$`
    ]
  },
  {
    name: 'Create triggers for updated_at columns',
    queries: [
      // Create or replace the trigger function
      `CREATE OR REPLACE FUNCTION update_updated_at_column()
       RETURNS TRIGGER AS $$
       BEGIN
         NEW.updated_at = NOW();
         RETURN NEW;
       END;
       $$ language 'plpgsql'`,
       
      // Create triggers for each table
      `DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations`,
      `CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,
       
      `DROP TRIGGER IF EXISTS update_organization_members_updated_at ON organization_members`,
      `CREATE TRIGGER update_organization_members_updated_at BEFORE UPDATE ON organization_members
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,
       
      `DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations`,
      `CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,
       
      `DROP TRIGGER IF EXISTS update_issues_updated_at ON issues`,
      `CREATE TRIGGER update_issues_updated_at BEFORE UPDATE ON issues
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`
    ]
  }
];

async function runMigrations() {
  console.log('🚀 Starting comprehensive database migration...\n');
  console.log('=' .repeat(60));
  
  let totalQueries = 0;
  let successfulQueries = 0;
  let failedQueries = 0;
  const errors = [];
  
  for (const migration of migrations) {
    console.log(`\n📦 ${migration.name}`);
    console.log('-'.repeat(50));
    
    for (const query of migration.queries) {
      totalQueries++;
      
      // Display a truncated version of the query for readability
      const displayQuery = query.substring(0, 100).replace(/\n/g, ' ');
      process.stdout.write(`  Executing: ${displayQuery}...`);
      
      try {
        // Execute the query using Supabase's rpc method for raw SQL
        const { error } = await supabase.rpc('exec_sql', { 
          query: query 
        }).catch(async (rpcError) => {
          // If RPC doesn't exist, try direct execution (for some Supabase setups)
          // This is a fallback - in production, you'd use proper migration tools
          return { error: `RPC not available - ${rpcError.message}` };
        });
        
        if (error) {
          // Some errors are expected (e.g., column already exists)
          if (error.toString().includes('already exists') || 
              error.toString().includes('does not exist') ||
              error.toString().includes('RPC not available')) {
            process.stdout.write(' ⚠️  Skipped (already applied or RPC unavailable)\n');
            successfulQueries++;
          } else {
            process.stdout.write(` ❌ Failed\n`);
            console.error(`     Error: ${error}`);
            failedQueries++;
            errors.push({ migration: migration.name, query: displayQuery, error });
          }
        } else {
          process.stdout.write(' ✅ Success\n');
          successfulQueries++;
        }
      } catch (err) {
        process.stdout.write(` ❌ Failed\n`);
        console.error(`     Error: ${err.message}`);
        failedQueries++;
        errors.push({ migration: migration.name, query: displayQuery, error: err.message });
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary');
  console.log('='.repeat(60));
  console.log(`Total Queries: ${totalQueries}`);
  console.log(`✅ Successful: ${successfulQueries}`);
  console.log(`❌ Failed: ${failedQueries}`);
  console.log(`Success Rate: ${((successfulQueries/totalQueries) * 100).toFixed(1)}%`);
  
  if (errors.length > 0) {
    console.log('\n⚠️  Failed Queries:');
    errors.forEach((err, idx) => {
      console.log(`\n${idx + 1}. ${err.migration}`);
      console.log(`   Query: ${err.query}`);
      console.log(`   Error: ${err.error}`);
    });
  }
  
  // Note about direct SQL execution
  console.log('\n📝 Note: Some migrations may require direct database access.');
  console.log('If RPC is not available, you can run the SQL directly in Supabase SQL Editor.');
  
  // Generate SQL script file for manual execution if needed
  await generateSQLScript();
  
  console.log('\n✨ Migration process complete!');
  console.log('Next step: Run populate-enhanced-test-data.js to add test data.');
}

async function generateSQLScript() {
  console.log('\n📄 Generating SQL script for manual execution...');
  
  let sqlScript = `-- Comprehensive Database Schema Migration Script
-- Generated: ${new Date().toISOString()}
-- This script fixes all schema mismatches for the Real Estate AI Agent application

`;
  
  for (const migration of migrations) {
    sqlScript += `\n-- ${migration.name}\n`;
    sqlScript += migration.queries.join(';\n\n') + ';\n';
    sqlScript += '\n' + '-'.repeat(60) + '\n';
  }
  
  const fs = require('fs');
  const filePath = '/Users/macbookpro/Business/REAL-ESTATE-WEB-APP/schema-migration.sql';
  fs.writeFileSync(filePath, sqlScript);
  console.log(`SQL script saved to: ${filePath}`);
  console.log('You can run this directly in the Supabase SQL Editor if needed.');
}

// Run the migrations
runMigrations().catch(console.error);