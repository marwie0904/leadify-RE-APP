#!/usr/bin/env node

/**
 * Run the custom BANT questions migration
 */

require('dotenv').config({ path: './BACKEND/.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  console.log('🚀 Running Custom BANT Questions Migration...\n');
  
  try {
    // Read migration file
    const migrationPath = path.join(__dirname, 'BACKEND', 'migrations', 'add-custom-bant-questions.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📝 Migration SQL loaded from:', migrationPath);
    console.log('📊 Executing migration...\n');
    
    // Split SQL statements and execute them
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      console.log('Executing:', statement.substring(0, 50) + '...');
      
      // For table creation, we need to use raw SQL
      const { error } = await supabase.rpc('exec_sql', { 
        sql_query: statement + ';' 
      }).catch(async (err) => {
        // If exec_sql doesn't exist, try direct query
        if (statement.includes('CREATE TABLE')) {
          // Can't directly execute DDL, need to check if table exists
          const { data, error: checkError } = await supabase
            .from('agent_bant_questions')
            .select('count')
            .limit(1);
          
          if (checkError && checkError.message.includes('does not exist')) {
            console.log('⚠️  Table does not exist. Please run migration manually in Supabase dashboard.');
            return { error: checkError };
          }
          return { error: null };
        }
        return { error: err };
      });
      
      if (error) {
        if (error.message?.includes('already exists')) {
          console.log('✅ Already exists, skipping...');
        } else if (error.message?.includes('exec_sql')) {
          console.log('⚠️  exec_sql function not available. Trying alternative approach...');
          
          // Try to check if table exists
          const { data, error: checkError } = await supabase
            .from('agent_bant_questions')
            .select('id')
            .limit(1);
          
          if (!checkError) {
            console.log('✅ Table already exists');
          } else if (checkError.message.includes('does not exist')) {
            console.log('\n❌ Table does not exist. Please run the following SQL in your Supabase dashboard:\n');
            console.log('=' .repeat(60));
            console.log(migrationSQL);
            console.log('=' .repeat(60));
            return;
          }
        } else {
          console.error('❌ Error:', error.message);
        }
      } else {
        console.log('✅ Success');
      }
    }
    
    // Check if default questions exist
    console.log('\n📋 Checking for default questions...');
    const { data: defaultQuestions, error: defaultError } = await supabase
      .from('agent_bant_questions')
      .select('*')
      .eq('agent_id', '00000000-0000-0000-0000-000000000000');
    
    if (defaultError) {
      console.log('⚠️  Could not check default questions:', defaultError.message);
    } else if (!defaultQuestions || defaultQuestions.length === 0) {
      console.log('📝 Inserting default questions...');
      
      const defaults = [
        { agent_id: '00000000-0000-0000-0000-000000000000', category: 'budget', question_text: 'What is your budget range for this property?', question_order: 1 },
        { agent_id: '00000000-0000-0000-0000-000000000000', category: 'budget', question_text: 'Have you been pre-approved for financing?', question_order: 2 },
        { agent_id: '00000000-0000-0000-0000-000000000000', category: 'authority', question_text: 'Are you the sole decision maker for this purchase?', question_order: 1 },
        { agent_id: '00000000-0000-0000-0000-000000000000', category: 'authority', question_text: 'Who else will be involved in making this decision?', question_order: 2 },
        { agent_id: '00000000-0000-0000-0000-000000000000', category: 'need', question_text: 'What is the primary purpose for this property?', question_order: 1 },
        { agent_id: '00000000-0000-0000-0000-000000000000', category: 'need', question_text: 'What specific features are you looking for?', question_order: 2 },
        { agent_id: '00000000-0000-0000-0000-000000000000', category: 'timeline', question_text: 'When are you planning to make a purchase?', question_order: 1 },
        { agent_id: '00000000-0000-0000-0000-000000000000', category: 'timeline', question_text: 'Do you have any specific deadlines or constraints?', question_order: 2 }
      ];
      
      const { error: insertError } = await supabase
        .from('agent_bant_questions')
        .insert(defaults);
      
      if (insertError) {
        console.log('❌ Failed to insert default questions:', insertError.message);
      } else {
        console.log('✅ Default questions inserted successfully');
      }
    } else {
      console.log(`✅ Found ${defaultQuestions.length} default questions`);
    }
    
    console.log('\n✨ Migration complete!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();