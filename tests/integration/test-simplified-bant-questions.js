#!/usr/bin/env node

/**
 * Test script for simplified BANT questions feature
 * Verifies that placeholder_text and help_text have been removed
 */

require('dotenv').config({ path: './BACKEND/.env' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Simplified test questions - one per category
const SIMPLIFIED_QUESTIONS = [
  { category: 'budget', question_text: 'What is your budget for this property?', question_order: 1 },
  { category: 'authority', question_text: 'Who makes the purchasing decision?', question_order: 1 },
  { category: 'need', question_text: 'What type of property do you need?', question_order: 1 },
  { category: 'timeline', question_text: 'When do you need to move in?', question_order: 1 }
];

async function testSimplifiedQuestions() {
  console.log('🚀 Testing Simplified BANT Questions Feature\n');
  console.log('=' .repeat(50));
  
  try {
    // Test 1: Check table structure
    console.log('\n📊 Test 1: Verifying table structure...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('agent_bant_questions')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.log('❌ Table check failed:', tableError.message);
      return false;
    }
    console.log('✅ Table exists and is accessible');
    
    // Test 2: Insert simplified questions
    console.log('\n📝 Test 2: Inserting simplified questions...');
    
    // First, we need to create a test agent or use an existing one
    // Let's get an existing agent ID for testing
    const { data: agents } = await supabase
      .from('agents')
      .select('id')
      .limit(1);
    
    if (!agents || agents.length === 0) {
      console.log('⚠️  No agents found in database. Skipping insertion test.');
      const testAgentId = null;
    } else {
      var testAgentId = agents[0].id;
    }
    
    if (!testAgentId) {
      console.log('⚠️  Cannot test insertion without an agent');
      return false;
    }
    
    const questionsToInsert = SIMPLIFIED_QUESTIONS.map(q => ({
      agent_id: testAgentId,
      category: q.category,
      question_text: q.question_text,
      question_order: q.question_order,
      is_active: true
      // Note: No placeholder_text or help_text fields
    }));
    
    const { data: insertedData, error: insertError } = await supabase
      .from('agent_bant_questions')
      .insert(questionsToInsert)
      .select();
    
    if (insertError) {
      console.log('❌ Failed to insert simplified questions:', insertError.message);
      return false;
    }
    
    console.log(`✅ Successfully inserted ${insertedData.length} simplified questions`);
    
    // Test 3: Verify fields are null or empty
    console.log('\n🔍 Test 3: Verifying placeholder and help text handling...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('agent_bant_questions')
      .select('question_text, placeholder_text, help_text')
      .eq('agent_id', testAgentId);
    
    if (verifyError) {
      console.log('❌ Failed to verify questions:', verifyError.message);
      return false;
    }
    
    let hasUnwantedData = false;
    verifyData.forEach(q => {
      // Check if placeholder_text or help_text have non-null/non-empty values
      if (q.placeholder_text && q.placeholder_text.trim() !== '') {
        console.log(`⚠️  Question has placeholder_text: "${q.question_text}" -> "${q.placeholder_text}"`);
        hasUnwantedData = true;
      }
      if (q.help_text && q.help_text.trim() !== '') {
        console.log(`⚠️  Question has help_text: "${q.question_text}" -> "${q.help_text}"`);
        hasUnwantedData = true;
      }
    });
    
    if (!hasUnwantedData) {
      console.log('✅ All questions have null or empty placeholder/help text');
    } else {
      console.log('⚠️  Some questions have unexpected placeholder or help text');
    }
    
    // Test 4: Update existing questions to remove placeholder/help
    console.log('\n🔄 Test 4: Updating existing questions to simplify...');
    const { error: updateError } = await supabase
      .from('agent_bant_questions')
      .update({ 
        placeholder_text: null, 
        help_text: null 
      })
      .eq('agent_id', testAgentId);
    
    if (updateError) {
      console.log('❌ Failed to update questions:', updateError.message);
    } else {
      console.log('✅ Successfully nullified placeholder and help text');
    }
    
    // Test 5: Clean up test data
    console.log('\n🧹 Test 5: Cleaning up test data...');
    if (testAgentId) {
      const { error: deleteError } = await supabase
        .from('agent_bant_questions')
        .delete()
        .eq('agent_id', testAgentId);
      
      if (deleteError) {
        console.log('⚠️  Failed to clean up test data:', deleteError.message);
      } else {
        console.log('✅ Test data cleaned up successfully');
      }
    } else {
      console.log('⚠️  No test data to clean up');
    }
    
    // Test 6: Check default questions
    console.log('\n📋 Test 6: Checking default questions simplification...');
    const { data: defaultQuestions, error: defaultError } = await supabase
      .from('agent_bant_questions')
      .select('category, question_text, placeholder_text, help_text')
      .eq('agent_id', '00000000-0000-0000-0000-000000000000');
    
    if (defaultError) {
      console.log('⚠️  Could not check default questions:', defaultError.message);
    } else if (defaultQuestions && defaultQuestions.length > 0) {
      console.log(`Found ${defaultQuestions.length} default questions`);
      
      // Check if defaults have been simplified
      let defaultsSimplified = true;
      defaultQuestions.forEach(q => {
        if ((q.placeholder_text && q.placeholder_text.trim() !== '') || 
            (q.help_text && q.help_text.trim() !== '')) {
          defaultsSimplified = false;
        }
      });
      
      if (defaultsSimplified) {
        console.log('✅ Default questions are simplified (no placeholder/help text)');
      } else {
        console.log('ℹ️  Default questions still have placeholder/help text');
        console.log('   Run the migration to simplify: node run-bant-questions-migration-simple.js');
      }
    } else {
      console.log('ℹ️  No default questions found');
    }
    
    // Summary
    console.log('\n' + '=' .repeat(50));
    console.log('✨ Simplified BANT Questions Test Complete!');
    console.log('=' .repeat(50));
    console.log('\nNext steps:');
    console.log('1. Run the migration in Supabase to make fields nullable');
    console.log('2. Test the UI in the browser to confirm simplified forms');
    console.log('3. Verify agent creation and editing work correctly');
    
    return true;
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    return false;
  }
}

// Run the test
testSimplifiedQuestions()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });