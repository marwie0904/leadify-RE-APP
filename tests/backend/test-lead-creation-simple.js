#!/usr/bin/env node

/**
 * Simple test to verify lead creation works
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testLeadCreation() {
  console.log('\nTESTING LEAD CREATION\n');
  console.log('='.repeat(50));
  
  // First, get a valid conversation ID
  const { data: conversation } = await supabase
    .from('conversations')
    .select('id')
    .limit(1)
    .single();
  
  const conversationId = conversation?.id || 'test-conv-' + Date.now();
  
  // Create lead with normalized values that match database constraints
  const leadData = {
    conversation_id: conversationId,
    full_name: 'Test User ' + Date.now(),
    mobile_number: '09171234567',
    email: 'test@example.com',
    
    // BANT fields with exact database values
    budget_range: 'high',        // Must be: 'high', 'medium', or 'low'
    authority: 'individual',     // Must be: 'individual' or 'shared'
    need: 'residence',           // Must be: 'residence', 'investment', or 'resale'
    timeline: '1-3m',            // Must be: '1m', '1-3m', '3-6m', or '6m+'
    
    // Scores
    budget_score: 30,
    authority_score: 30,
    need_score: 25,
    timeline_score: 25,
    contact_score: 25,
    lead_score: 28,  // Must be integer
    
    // Classification
    lead_classification: 'Hot',   // Must be: 'Hot', 'Warm', or 'Cold'
    
    created_at: new Date().toISOString()
  };
  
  console.log('Creating lead with values:');
  console.log('  Budget Range:', leadData.budget_range);
  console.log('  Authority:', leadData.authority);
  console.log('  Need:', leadData.need);
  console.log('  Timeline:', leadData.timeline);
  console.log('  Lead Score:', leadData.lead_score);
  console.log('  Classification:', leadData.lead_classification);
  
  const { data: lead, error } = await supabase
    .from('leads')
    .insert([leadData])
    .select()
    .single();
  
  if (error) {
    console.log('\n❌ FAILED: Lead creation error');
    console.log('Error:', error.message);
    console.log('Details:', error);
    
    // Diagnose the specific issue
    if (error.message.includes('authority_check')) {
      console.log('\n⚠️  Authority value issue');
      console.log('  Provided:', leadData.authority);
      console.log('  Required: "individual" or "shared"');
    } else if (error.message.includes('timeline')) {
      console.log('\n⚠️  Timeline value issue');
      console.log('  Provided:', leadData.timeline);
      console.log('  Required: "1m", "1-3m", "3-6m", or "6m+"');
    } else if (error.message.includes('budget_range')) {
      console.log('\n⚠️  Budget range value issue');
      console.log('  Provided:', leadData.budget_range);
      console.log('  Required: "high", "medium", or "low"');
    } else if (error.message.includes('need')) {
      console.log('\n⚠️  Need value issue');
      console.log('  Provided:', leadData.need);
      console.log('  Required: "residence", "investment", or "resale"');
    } else if (error.message.includes('lead_classification')) {
      console.log('\n⚠️  Classification value issue');
      console.log('  Provided:', leadData.lead_classification);
      console.log('  Required: "Hot", "Warm", or "Cold"');
    }
  } else {
    console.log('\n✅ SUCCESS: Lead created!');
    console.log('  Lead ID:', lead.id);
    console.log('  Full Name:', lead.full_name);
    console.log('  Score:', lead.lead_score);
    console.log('  Classification:', lead.lead_classification);
  }
  
  console.log('\n' + '='.repeat(50));
}

// Run test
testLeadCreation().catch(console.error);