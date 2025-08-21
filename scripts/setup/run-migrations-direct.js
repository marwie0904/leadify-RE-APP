#!/usr/bin/env node

/**
 * Direct SQL Migration Execution
 * Runs database migrations using Supabase client
 */

require('dotenv').config({ path: './BACKEND/.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Initialize Supabase client with service role for DDL operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    }
  }
);

// Read the migration SQL file
const migrationSQL = fs.readFileSync('./schema-migration.sql', 'utf8');

// Split migrations into individual statements
const migrations = migrationSQL
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('=='))
  .map(s => s + ';');

async function runMigrations() {
  console.log('🚀 Running Database Migrations Directly');
  console.log('=' .repeat(60));
  console.log(`Total statements to execute: ${migrations.length}`);
  console.log('=' .repeat(60) + '\n');
  
  let successful = 0;
  let failed = 0;
  const errors = [];
  
  for (let i = 0; i < migrations.length; i++) {
    const migration = migrations[i];
    const displaySQL = migration.substring(0, 80).replace(/\n/g, ' ');
    
    process.stdout.write(`[${i + 1}/${migrations.length}] ${displaySQL}...`);
    
    try {
      // For Supabase, we need to use the REST API directly for DDL statements
      const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ query: migration })
      });
      
      if (response.ok) {
        process.stdout.write(' ✅\n');
        successful++;
      } else {
        const error = await response.text();
        if (error.includes('already exists')) {
          process.stdout.write(' ⚠️  Already exists\n');
          successful++;
        } else {
          process.stdout.write(' ❌\n');
          console.error(`  Error: ${error}`);
          failed++;
          errors.push({ statement: displaySQL, error });
        }
      }
    } catch (err) {
      // Try alternative approach using direct connection
      try {
        // Since direct SQL execution isn't available via client library,
        // we'll track what needs to be done manually
        if (migration.includes('ALTER TABLE') || migration.includes('CREATE')) {
          process.stdout.write(' ⚠️  Needs manual execution\n');
          errors.push({ 
            statement: displaySQL, 
            error: 'Direct DDL execution not available - run in Supabase SQL Editor' 
          });
        }
      } catch (e) {
        process.stdout.write(' ❌\n');
        failed++;
        errors.push({ statement: displaySQL, error: e.message });
      }
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('📊 Migration Summary');
  console.log('=' .repeat(60));
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Manual execution needed: ${errors.length}`);
  
  if (errors.length > 0) {
    console.log('\n⚠️  The following statements need manual execution:');
    console.log('=' .repeat(60));
    console.log('\n📝 Instructions:');
    console.log('1. Open Supabase Dashboard (https://app.supabase.com)');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy the contents of schema-migration.sql');
    console.log('4. Paste and execute in SQL Editor');
    console.log('5. Run: node populate-enhanced-test-data.js');
    console.log('6. Run: node test-real-backend-final.js');
  }
  
  // Create a simplified migration script for manual execution
  console.log('\n📄 Creating simplified migration script...');
  const simplifiedSQL = `-- Simplified Migration Script for Supabase SQL Editor
-- Run this script to add all missing columns

-- Organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'enterprise';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Organization Members table  
ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Agents table
ALTER TABLE agents ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS bant_enabled BOOLEAN DEFAULT false;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS bant_config JSONB DEFAULT '{}'::jsonb;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'sales';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS system_prompt TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS token_usage INTEGER DEFAULT 0;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS conversation_count INTEGER DEFAULT 0;

-- Conversations table
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS total_tokens INTEGER DEFAULT 0;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS estimated_cost DECIMAL(10,4) DEFAULT 0;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_phone TEXT;

-- Messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE messages ADD COLUMN IF NOT EXISTS token_count INTEGER DEFAULT 0;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS model TEXT DEFAULT 'gpt-4';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS cost DECIMAL(10,6) DEFAULT 0;

-- Leads table - Add BANT columns
ALTER TABLE leads ADD COLUMN IF NOT EXISTS bant_budget INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS bant_authority INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS bant_need INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS bant_timeline INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;

-- Create issues table if not exists
CREATE TABLE IF NOT EXISTS issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open',
  priority TEXT DEFAULT 'medium',
  type TEXT DEFAULT 'bug',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`;
  
  fs.writeFileSync('./simplified-migration.sql', simplifiedSQL);
  console.log('Saved to: simplified-migration.sql');
  
  console.log('\n✨ Migration preparation complete!');
  console.log('Please run the SQL script manually in Supabase SQL Editor.');
}

// Run the migrations
runMigrations().catch(console.error);