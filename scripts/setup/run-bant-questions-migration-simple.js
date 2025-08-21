#!/usr/bin/env node

/**
 * Simple check and insert default BANT questions
 */

require('dotenv').config({ path: './BACKEND/.env' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  console.log('🚀 Checking Custom BANT Questions Table...\n');
  
  try {
    // Try to query the table
    console.log('📊 Checking if agent_bant_questions table exists...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('agent_bant_questions')
      .select('id')
      .limit(1);
    
    if (tableError) {
      if (tableError.message.includes('does not exist')) {
        console.log('\n❌ Table agent_bant_questions does not exist.');
        console.log('Please run the following SQL in your Supabase dashboard:\n');
        console.log('=' .repeat(60));
        console.log(`
CREATE TABLE IF NOT EXISTS agent_bant_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('budget', 'authority', 'need', 'timeline')),
    question_text TEXT NOT NULL,
    question_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    placeholder_text TEXT,
    help_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_bant_questions_agent_id ON agent_bant_questions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_bant_questions_category ON agent_bant_questions(category);
        `);
        console.log('=' .repeat(60));
        return;
      }
      throw tableError;
    }
    
    console.log('✅ Table agent_bant_questions exists');
    
    // Check for default questions
    console.log('\n📋 Checking for default questions...');
    const { data: defaultQuestions, error: defaultError } = await supabase
      .from('agent_bant_questions')
      .select('*')
      .eq('agent_id', '00000000-0000-0000-0000-000000000000');
    
    if (defaultError) {
      console.log('⚠️  Error checking default questions:', defaultError.message);
    } else if (!defaultQuestions || defaultQuestions.length === 0) {
      console.log('📝 Inserting default questions...');
      
      const defaults = [
        { agent_id: '00000000-0000-0000-0000-000000000000', category: 'budget', question_text: 'What is your budget range for this property?', question_order: 1 },
        { agent_id: '00000000-0000-0000-0000-000000000000', category: 'authority', question_text: 'Are you the sole decision maker for this purchase?', question_order: 1 },
        { agent_id: '00000000-0000-0000-0000-000000000000', category: 'need', question_text: 'What is the primary purpose for this property?', question_order: 1 },
        { agent_id: '00000000-0000-0000-0000-000000000000', category: 'timeline', question_text: 'When are you planning to make a purchase?', question_order: 1 }
      ];
      
      const { data: insertedData, error: insertError } = await supabase
        .from('agent_bant_questions')
        .insert(defaults)
        .select();
      
      if (insertError) {
        console.log('❌ Failed to insert default questions:', insertError.message);
      } else {
        console.log(`✅ Successfully inserted ${insertedData.length} default questions`);
      }
    } else {
      console.log(`✅ Found ${defaultQuestions.length} default questions already in database`);
    }
    
    // Show summary
    console.log('\n📊 Summary:');
    const { data: allQuestions, count } = await supabase
      .from('agent_bant_questions')
      .select('category', { count: 'exact' })
      .eq('agent_id', '00000000-0000-0000-0000-000000000000');
    
    if (allQuestions) {
      const categories = ['budget', 'authority', 'need', 'timeline'];
      categories.forEach(cat => {
        const catQuestions = allQuestions.filter(q => q.category === cat);
        console.log(`  ${cat.padEnd(10)}: ${catQuestions.length} questions`);
      });
    }
    
    console.log('\n✨ Setup complete! The custom BANT questions feature is ready to use.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

runMigration();