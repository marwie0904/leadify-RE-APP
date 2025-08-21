/**
 * Test Suite for AI-Based BANT Scoring System
 * Tests the scoreBANTWithAI function and integration with lead creation
 */

const assert = require('assert');
const { describe, it, before, after } = require('mocha');

// Mock OpenAI for testing
const mockOpenAI = {
  chat: {
    completions: {
      create: async ({ messages, model }) => {
        // Parse the user prompt to extract BANT values
        const userPrompt = messages[1].content;
        const budget = userPrompt.match(/Budget: (.+)/)?.[1] || 'Not provided';
        const authority = userPrompt.match(/Authority: (.+)/)?.[1] || 'Not provided';
        const need = userPrompt.match(/Need: (.+)/)?.[1] || 'Not provided';
        const timeline = userPrompt.match(/Timeline: (.+)/)?.[1] || 'Not provided';
        const contact = userPrompt.includes('Contact: Provided');

        // Simulate AI scoring based on extracted values
        const scores = {
          budget_score: budget.includes('50M') ? 25 : budget.includes('30M') ? 15 : 10,
          authority_score: authority.toLowerCase().includes('yes') || authority.includes('sole') ? 20 : 15,
          need_score: need.includes('residence') ? 20 : need.includes('investment') ? 25 : 0,
          timeline_score: timeline.includes('next month') || timeline.includes('1 month') ? 25 : 15,
          contact_score: contact ? 25 : 0
        };

        return {
          choices: [{
            message: {
              content: JSON.stringify(scores)
            }
          }]
        };
      }
    }
  }
};

describe('AI BANT Scoring System', () => {
  
  describe('scoreBANTWithAI Function', () => {
    
    it('should score high-value lead correctly', async () => {
      const rawBant = {
        budget: '50M',
        authority: 'Yes I am the sole decision maker',
        need: 'for residence',
        timeline: 'next month'
      };
      
      const contactInfo = {
        fullName: 'Michael Jackson',
        mobileNumber: '09214821241'
      };
      
      const criteriaPrompt = `You are an AI assistant that scores leads...`;
      
      // This would call the actual function
      const scores = await scoreBANTWithAI(rawBant, contactInfo, criteriaPrompt, mockOpenAI);
      
      assert.strictEqual(scores.budget_score, 25, 'Budget score should be 25 for 50M');
      assert.strictEqual(scores.authority_score, 20, 'Authority score should be 20 for sole decision maker');
      assert.strictEqual(scores.need_score, 20, 'Need score should be 20 for residence');
      assert.strictEqual(scores.timeline_score, 25, 'Timeline score should be 25 for next month');
      assert.strictEqual(scores.contact_score, 25, 'Contact score should be 25 when provided');
    });
    
    it('should handle missing BANT fields gracefully', async () => {
      const rawBant = {
        budget: null,
        authority: null,
        need: null,
        timeline: null
      };
      
      const contactInfo = null;
      const criteriaPrompt = `You are an AI assistant that scores leads...`;
      
      const scores = await scoreBANTWithAI(rawBant, contactInfo, criteriaPrompt, mockOpenAI);
      
      assert(scores.budget_score >= 0, 'Budget score should be non-negative');
      assert(scores.authority_score >= 0, 'Authority score should be non-negative');
      assert(scores.need_score >= 0, 'Need score should be non-negative');
      assert(scores.timeline_score >= 0, 'Timeline score should be non-negative');
      assert.strictEqual(scores.contact_score, 0, 'Contact score should be 0 when not provided');
    });
    
    it('should handle markdown in AI response', async () => {
      const mockOpenAIWithMarkdown = {
        chat: {
          completions: {
            create: async () => ({
              choices: [{
                message: {
                  content: '```json\n{"budget_score": 25, "authority_score": 20, "need_score": 20, "timeline_score": 25, "contact_score": 25}\n```'
                }
              }]
            })
          }
        }
      };
      
      const rawBant = { budget: '50M', authority: 'Yes', need: 'residence', timeline: 'next month' };
      const contactInfo = { mobileNumber: '1234567890' };
      const criteriaPrompt = `Test prompt`;
      
      const scores = await scoreBANTWithAI(rawBant, contactInfo, criteriaPrompt, mockOpenAIWithMarkdown);
      
      assert.strictEqual(scores.budget_score, 25, 'Should parse markdown-wrapped JSON correctly');
    });
    
    it('should handle API errors gracefully', async () => {
      const mockOpenAIWithError = {
        chat: {
          completions: {
            create: async () => {
              throw new Error('OpenAI API error');
            }
          }
        }
      };
      
      const rawBant = { budget: '50M', authority: 'Yes', need: 'residence', timeline: 'next month' };
      const contactInfo = { mobileNumber: '1234567890' };
      const criteriaPrompt = `Test prompt`;
      
      try {
        await scoreBANTWithAI(rawBant, contactInfo, criteriaPrompt, mockOpenAIWithError);
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert(error.fallbackToDefault, 'Should indicate fallback to default scoring');
      }
    });
  });
  
  describe('Total Score Calculation', () => {
    
    it('should calculate weighted total correctly', () => {
      const scores = {
        budget_score: 25,
        authority_score: 20,
        need_score: 10,
        timeline_score: 25,
        contact_score: 10
      };
      
      const weights = {
        budget: 30,
        authority: 20,
        need: 10,
        timeline: 30,
        contact: 10
      };
      
      const total = calculateWeightedTotal(scores, weights);
      
      // (25*30 + 20*20 + 10*10 + 25*30 + 10*10) / 100
      // (750 + 400 + 100 + 750 + 100) / 100 = 21
      assert.strictEqual(total, 21, 'Weighted total should be 21');
    });
    
    it('should handle zero weights correctly', () => {
      const scores = {
        budget_score: 25,
        authority_score: 20,
        need_score: 10,
        timeline_score: 25,
        contact_score: 10
      };
      
      const weights = {
        budget: 40,
        authority: 30,
        need: 30,
        timeline: 0,
        contact: 0
      };
      
      const total = calculateWeightedTotal(scores, weights);
      
      // (25*40 + 20*30 + 10*30 + 25*0 + 10*0) / 100
      // (1000 + 600 + 300 + 0 + 0) / 100 = 19
      assert.strictEqual(total, 19, 'Should handle zero weights correctly');
    });
  });
  
  describe('Lead Classification', () => {
    
    it('should classify as Priority for score >= 90', () => {
      const classification = classifyLead(92, { priority: 90, hot: 70, warm: 50 });
      assert.strictEqual(classification, 'Priority', 'Score 92 should be Priority');
    });
    
    it('should classify as Hot for score >= 70 and < 90', () => {
      const classification = classifyLead(75, { priority: 90, hot: 70, warm: 50 });
      assert.strictEqual(classification, 'Hot', 'Score 75 should be Hot');
    });
    
    it('should classify as Warm for score >= 50 and < 70', () => {
      const classification = classifyLead(55, { priority: 90, hot: 70, warm: 50 });
      assert.strictEqual(classification, 'Warm', 'Score 55 should be Warm');
    });
    
    it('should classify as Cold for score < 50', () => {
      const classification = classifyLead(30, { priority: 90, hot: 70, warm: 50 });
      assert.strictEqual(classification, 'Cold', 'Score 30 should be Cold');
    });
  });
});

// Helper functions that would be implemented in server.js
async function scoreBANTWithAI(rawBant, contactInfo, criteriaPrompt, openaiClient) {
  try {
    const userPrompt = `Score the following extracted BANT values:
- Budget: ${rawBant?.budget || 'Not provided'}
- Authority: ${rawBant?.authority || 'Not provided'}
- Need: ${rawBant?.need || 'Not provided'}
- Timeline: ${rawBant?.timeline || 'Not provided'}
- Contact: ${contactInfo?.mobileNumber || contactInfo?.email ? 'Provided' : 'Not provided'}

Return ONLY a JSON object with scores:
{
  "budget_score": <number>,
  "authority_score": <number>,
  "need_score": <number>,
  "timeline_score": <number>,
  "contact_score": <number>
}`;

    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4.1-mini-2025-04-14',
      messages: [
        { role: 'system', content: criteriaPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0
    });
    
    // Handle markdown wrapped responses
    let content = response.choices[0].message.content;
    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    return JSON.parse(content);
  } catch (error) {
    console.error('[AI SCORING] Error:', error);
    error.fallbackToDefault = true;
    throw error;
  }
}

function calculateWeightedTotal(scores, weights) {
  return (
    (scores.budget_score * weights.budget / 100) +
    (scores.authority_score * weights.authority / 100) +
    (scores.need_score * weights.need / 100) +
    (scores.timeline_score * weights.timeline / 100) +
    (scores.contact_score * weights.contact / 100)
  );
}

function classifyLead(totalScore, thresholds) {
  if (totalScore >= thresholds.priority) return 'Priority';
  if (totalScore >= thresholds.hot) return 'Hot';
  if (totalScore >= thresholds.warm) return 'Warm';
  return 'Cold';
}

// Export for use in actual implementation
if (typeof module !== 'undefined') {
  module.exports = {
    scoreBANTWithAI,
    calculateWeightedTotal,
    classifyLead,
    mockOpenAI
  };
}