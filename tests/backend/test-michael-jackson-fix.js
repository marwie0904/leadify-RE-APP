#!/usr/bin/env node

/**
 * Test the specific Michael Jackson lead creation fix
 */

const OpenAI = require('openai');
require('dotenv').config();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function testMichaelJacksonCase() {
  console.log('\nTESTING MICHAEL JACKSON LEAD NORMALIZATION FIX\n');
  console.log('='.repeat(80));
  
  const rawBant = {
    budget: '30-50M',
    authority: 'Yes I am',
    need: 'personal residence',
    timeline: 'Next month'
  };
  
  console.log('Raw BANT Data:');
  console.log('  Budget:', rawBant.budget);
  console.log('  Authority:', rawBant.authority);
  console.log('  Need:', rawBant.need);
  console.log('  Timeline:', rawBant.timeline);
  
  const systemPrompt = `You are a data normalizer. Map the following BANT fields to the EXACT allowed values for a database.

IMPORTANT: Return ONLY these exact values or null if unclear:

- authority: Map to EXACTLY one of these:
  * 'individual' - if sole decision maker, "yes", "I am", "just me", "myself"
  * 'shared' - if multiple decision makers, "no", "we", "spouse and I", "board", "committee"
  * null - if unclear

- need: Map to EXACTLY one of these:
  * 'residence' - for living, personal use, family home, primary residence
  * 'investment' - for rental, income, business, ROI, passive income, commercial
  * 'resale' - for flipping, reselling, trading
  * null - if unclear

- timeline: Map to EXACTLY one of these database codes:
  * '1m' - within 1 month, ASAP, immediate, this month, now
  * '1-3m' - 1-3 months, next month, 2 months, soon, 3 months
  * '3-6m' - 3-6 months, next quarter, Q2/Q3, 6 months
  * '6m+' - 6+ months, next year, later, flexible
  * null - if unclear

- budget_range: Map to EXACTLY one of these:
  * 'high' - for budgets above 30M PHP (if range given, use upper value)
  * 'medium' - for budgets 10M-30M PHP (if range given, use upper value)
  * 'low' - for budgets below 10M PHP
  * null - if unclear or no specific amount
  
  IMPORTANT: For budget ranges like "30-50M", use the UPPER value (50M) to classify as 'high'

Return a JSON object with these exact field names and values. Only output the JSON.`;
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Raw BANT: ${JSON.stringify(rawBant)}` }
      ],
      max_tokens: 100,
      temperature: 0
    });
    
    const normalized = JSON.parse(response.choices[0].message.content);
    
    console.log('\nNormalized BANT (for database):');
    console.log('  budget_range:', normalized.budget_range);
    console.log('  authority:', normalized.authority);
    console.log('  need:', normalized.need);
    console.log('  timeline:', normalized.timeline);
    
    // Verify these match database constraints
    const validAuthority = ['individual', 'shared'].includes(normalized.authority);
    const validNeed = ['residence', 'investment', 'resale'].includes(normalized.need);
    const validTimeline = ['1m', '1-3m', '3-6m', '6m+'].includes(normalized.timeline);
    const validBudget = ['high', 'medium', 'low'].includes(normalized.budget_range);
    
    console.log('\nDatabase Constraint Validation:');
    console.log(`  Authority: ${validAuthority ? '✅' : '❌'} ${normalized.authority} is ${validAuthority ? 'valid' : 'INVALID'}`);
    console.log(`  Need: ${validNeed ? '✅' : '❌'} ${normalized.need} is ${validNeed ? 'valid' : 'INVALID'}`);
    console.log(`  Timeline: ${validTimeline ? '✅' : '❌'} ${normalized.timeline} is ${validTimeline ? 'valid' : 'INVALID'}`);
    console.log(`  Budget: ${validBudget ? '✅' : '❌'} ${normalized.budget_range} is ${validBudget ? 'valid' : 'INVALID'}`);
    
    if (validAuthority && validNeed && validTimeline && validBudget) {
      console.log('\n✅ SUCCESS: All values will pass database constraints!');
      console.log('The lead creation should now work without check constraint violations.');
    } else {
      console.log('\n❌ FAILURE: Some values will violate database constraints!');
    }
    
    // Calculate scores
    console.log('\n' + '='.repeat(80));
    console.log('LEAD SCORING CALCULATION\n');
    
    const scores = {
      budget_score: normalized.budget_range === 'high' ? 30 : normalized.budget_range === 'medium' ? 20 : 10,
      authority_score: normalized.authority === 'individual' ? 30 : 20,
      need_score: normalized.need === 'investment' ? 30 : 25,
      timeline_score: normalized.timeline === '1m' ? 30 : normalized.timeline === '1-3m' ? 25 : normalized.timeline === '3-6m' ? 15 : 10
    };
    
    console.log('Individual Scores:');
    console.log(`  Budget: ${scores.budget_score} (${normalized.budget_range})`);
    console.log(`  Authority: ${scores.authority_score} (${normalized.authority})`);
    console.log(`  Need: ${scores.need_score} (${normalized.need})`);
    console.log(`  Timeline: ${scores.timeline_score} (${normalized.timeline})`);
    
    // Calculate weighted total (default weights: 25% each)
    const totalScore = (scores.budget_score * 25 + scores.authority_score * 25 + 
                       scores.need_score * 25 + scores.timeline_score * 25) / 100;
    
    console.log(`\nTotal Lead Score: ${totalScore}`);
    
    let classification = 'Cold';
    if (totalScore >= 22.5) {  // Adjusted threshold
      classification = 'Hot';
    } else if (totalScore >= 17.5) {  // Adjusted threshold
      classification = 'Warm';
    }
    
    console.log(`Lead Classification: ${classification}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  console.log('\n' + '='.repeat(80));
}

// Run test
testMichaelJacksonCase().catch(console.error);