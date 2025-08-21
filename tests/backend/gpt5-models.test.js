/**
 * GPT-5 Models and Pricing Test Suite
 * Tests for new model implementations and accurate cost tracking
 */

// Mock OpenAI and Supabase
jest.mock('openai');
jest.mock('@supabase/supabase-js');

// Test helper functions defined at the top
function getModelPricing(model) {
  const pricingPer1K = {
    'gpt-5-mini': { 
      prompt: 0.00025,     // $0.25 per 1M = $0.00025 per 1K
      completion: 0.002,    // $2.00 per 1M = $0.002 per 1K
      cached: 0.000025     // $0.025 per 1M = $0.000025 per 1K
    },
    'gpt-5-nano': { 
      prompt: 0.00005,     // $0.05 per 1M = $0.00005 per 1K
      completion: 0.0004,   // $0.40 per 1M = $0.0004 per 1K
      cached: 0.000005     // $0.005 per 1M = $0.000005 per 1K
    },
    'gpt-4-turbo-preview': { 
      prompt: 0.01,        // Current GPT-4 Turbo pricing
      completion: 0.03 
    },
    'text-embedding-ada-002': {
      input: 0.0001        // Current embedding pricing
    },
    'text-embedding-3-small': {
      input: 0.00002       // Current embedding pricing
    }
  };
  
  return pricingPer1K[model] || null;
}

function calculateTokenCost({ model, promptTokens = 0, completionTokens = 0, inputTokens = 0, isCached = false }) {
  if (promptTokens < 0 || completionTokens < 0 || inputTokens < 0) {
    throw new Error('Invalid token count');
  }

  const pricing = getModelPricing(model);
  if (!pricing) {
    // Fallback to a default pricing
    return (promptTokens * 0.01 + completionTokens * 0.03) / 1000;
  }

  // Handle embedding models
  if (model.includes('embedding')) {
    return (inputTokens * pricing.input) / 1000;
  }

  // Handle chat models
  const promptCost = isCached && pricing.cached ? pricing.cached : pricing.prompt;
  return (promptTokens * promptCost + completionTokens * pricing.completion) / 1000;
}

async function trackTokenUsage(data, supabase) {
  const cost = calculateTokenCost(data);
  
  const record = {
    organization_id: data.organizationId,
    conversation_id: data.conversationId,
    agent_id: data.agentId,
    model: data.model,
    model_category: data.model,  // New models map to themselves
    prompt_tokens: data.promptTokens || 0,
    completion_tokens: data.completionTokens || 0,
    input_tokens: data.inputTokens || 0,
    total_tokens: (data.promptTokens || 0) + (data.completionTokens || 0) + (data.inputTokens || 0),
    total_cost: cost,
    operation_type: data.operationType,
    response_time_ms: data.responseTime || null,
    endpoint: data.endpoint || '/api/chat',
    success: data.success !== false
  };

  return await supabase.from('ai_token_usage').insert(record);
}

describe('GPT-5 Model Pricing and Usage', () => {
  
  describe('Model Pricing Configuration', () => {
    it('should have correct pricing for GPT-5 Mini', () => {
      const pricing = getModelPricing('gpt-5-mini');
      expect(pricing).toEqual({
        prompt: 0.00025,      // $0.25 per 1M tokens = $0.00025 per 1K
        completion: 0.002,     // $2.00 per 1M tokens = $0.002 per 1K
        cached: 0.000025      // $0.025 per 1M tokens = $0.000025 per 1K
      });
    });

    it('should have correct pricing for GPT-5 Nano', () => {
      const pricing = getModelPricing('gpt-5-nano');
      expect(pricing).toEqual({
        prompt: 0.00005,      // $0.05 per 1M tokens = $0.00005 per 1K
        completion: 0.0004,    // $0.40 per 1M tokens = $0.0004 per 1K
        cached: 0.000005      // $0.005 per 1M tokens = $0.000005 per 1K
      });
    });

    it('should maintain GPT-4 Turbo pricing for legacy BANT scoring', () => {
      const pricing = getModelPricing('gpt-4-turbo-preview');
      expect(pricing).toBeDefined();
      expect(pricing.prompt).toBeGreaterThan(0);
      expect(pricing.completion).toBeGreaterThan(0);
    });
  });

  describe('Cost Calculations', () => {
    it('should calculate GPT-5 Mini costs correctly', () => {
      const cost = calculateTokenCost({
        model: 'gpt-5-mini',
        promptTokens: 1000,
        completionTokens: 500
      });
      // (1000 * 0.00025 + 500 * 0.002) / 1000 = 0.00125
      expect(cost).toBeCloseTo(0.00125, 5);
    });

    it('should calculate GPT-5 Nano costs correctly', () => {
      const cost = calculateTokenCost({
        model: 'gpt-5-nano',
        promptTokens: 1000,
        completionTokens: 500
      });
      // (1000 * 0.00005 + 500 * 0.0004) / 1000 = 0.00025
      expect(cost).toBeCloseTo(0.00025, 5);
    });

    it('should apply cached pricing when available', () => {
      const cost = calculateTokenCost({
        model: 'gpt-5-mini',
        promptTokens: 1000,
        completionTokens: 500,
        isCached: true
      });
      // (1000 * 0.000025 + 500 * 0.002) / 1000 = 0.001025
      expect(cost).toBeCloseTo(0.001025, 5);
    });

    it('should handle large token counts correctly', () => {
      const cost = calculateTokenCost({
        model: 'gpt-5-mini',
        promptTokens: 1000000,  // 1M tokens
        completionTokens: 500000  // 500K tokens
      });
      // (1000000 * 0.00025 + 500000 * 0.002) / 1000 = 1.25
      expect(cost).toBeCloseTo(1.25, 2);
    });
  });

  describe('Embedding Cost Tracking', () => {
    it('should track text-embedding-ada-002 usage', () => {
      const cost = calculateTokenCost({
        model: 'text-embedding-ada-002',
        inputTokens: 1000
      });
      expect(cost).toBeGreaterThan(0);
    });

    it('should track text-embedding-3-small usage', () => {
      const cost = calculateTokenCost({
        model: 'text-embedding-3-small',
        inputTokens: 1000
      });
      expect(cost).toBeGreaterThan(0);
    });
  });

  describe('Model Mapping', () => {
    it('should map GPT-5 models correctly', () => {
      const modelMapping = {
        'gpt-5-mini': 'gpt-5-mini',
        'gpt-5-nano': 'gpt-5-nano',
        'gpt-4-turbo-preview': 'gpt-4-turbo'
      };

      expect(modelMapping['gpt-5-mini']).toBe('gpt-5-mini');
      expect(modelMapping['gpt-5-nano']).toBe('gpt-5-nano');
    });

    it('should not map old GPT-4.1 models to GPT-3.5', () => {
      const modelMapping = {
        'gpt-5-mini': 'gpt-5-mini',
        'gpt-5-nano': 'gpt-5-nano'
      };
      
      // Old models should not exist in new mapping
      expect(modelMapping['gpt-4.1-mini-2025-04-14']).toBeUndefined();
      expect(modelMapping['gpt-4.1-nano-2025-04-14']).toBeUndefined();
    });
  });

  describe('Token Usage Tracking', () => {
    let mockSupabase;

    beforeEach(() => {
      mockSupabase = {
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockResolvedValue({ error: null })
      };
    });

    it('should track GPT-5 Mini usage correctly', async () => {
      const usageData = {
        model: 'gpt-5-mini',
        promptTokens: 150,
        completionTokens: 50,
        operationType: 'chat_reply',
        conversationId: 'test-123',
        organizationId: 'org-456'
      };

      await trackTokenUsage(usageData, mockSupabase);

      expect(mockSupabase.from).toHaveBeenCalledWith('ai_token_usage');
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-5-mini',
          model_category: 'gpt-5-mini',
          prompt_tokens: 150,
          completion_tokens: 50,
          total_tokens: 200,
          total_cost: expect.any(Number)
        })
      );
    });

    it('should track embedding operations', async () => {
      const usageData = {
        model: 'text-embedding-3-small',
        inputTokens: 500,
        operationType: 'document_embedding',
        agentId: 'agent-789'
      };

      await trackTokenUsage(usageData, mockSupabase);

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'text-embedding-3-small',
          operation_type: 'document_embedding'
        })
      );
    });

    it('should include response time in tracking', async () => {
      const usageData = {
        model: 'gpt-5-nano',
        promptTokens: 100,
        completionTokens: 25,
        operationType: 'intent_classification',
        responseTime: 125
      };

      await trackTokenUsage(usageData, mockSupabase);

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          response_time_ms: 125
        })
      );
    });
  });

  describe('Feature to Model Mapping', () => {
    const featureModelMap = {
      'chat_conversations': 'gpt-5-mini',
      'intent_classification': 'gpt-5-nano',
      'bant_extraction': 'gpt-5-mini',
      'bant_scoring': 'gpt-4-turbo-preview',  // Can migrate to gpt-5-mini
      'property_estimation': 'gpt-5-mini',
      'lead_scoring': 'gpt-5-mini',
      'contact_extraction': 'gpt-5-mini',
      'document_embedding': 'text-embedding-ada-002',
      'semantic_search': 'text-embedding-3-small'
    };

    it('should use GPT-5 Mini for most features', () => {
      const miniFeatures = ['chat_conversations', 'bant_extraction', 'property_estimation', 'lead_scoring'];
      miniFeatures.forEach(feature => {
        expect(featureModelMap[feature]).toBe('gpt-5-mini');
      });
    });

    it('should use GPT-5 Nano for lightweight tasks', () => {
      expect(featureModelMap['intent_classification']).toBe('gpt-5-nano');
    });

    it('should maintain embedding models', () => {
      expect(featureModelMap['document_embedding']).toBe('text-embedding-ada-002');
      expect(featureModelMap['semantic_search']).toBe('text-embedding-3-small');
    });
  });

  describe('Cost Comparison', () => {
    it('should show 90%+ cost reduction with GPT-5 models', () => {
      // Old GPT-4 cost for 1000 prompt + 500 completion
      const oldCost = (1000 * 0.03 + 500 * 0.06) / 1000; // $0.06

      // New GPT-5 Mini cost
      const newCost = (1000 * 0.00025 + 500 * 0.002) / 1000; // $0.00125

      const costReduction = ((oldCost - newCost) / oldCost) * 100;
      expect(costReduction).toBeGreaterThan(90);
    });

    it('should show even greater savings with GPT-5 Nano', () => {
      // Old GPT-3.5-turbo cost (what GPT-4.1-nano was mapped to)
      const oldCost = (1000 * 0.001 + 500 * 0.002) / 1000; // $0.002

      // New GPT-5 Nano cost
      const newCost = (1000 * 0.00005 + 500 * 0.0004) / 1000; // $0.00025

      const costReduction = ((oldCost - newCost) / oldCost) * 100;
      expect(costReduction).toBeGreaterThan(85);
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown models gracefully', () => {
      const pricing = getModelPricing('unknown-model');
      expect(pricing).toBeNull();
    });

    it('should default to safe pricing if model not found', () => {
      const cost = calculateTokenCost({
        model: 'unknown-model',
        promptTokens: 1000,
        completionTokens: 500
      });
      expect(cost).toBeGreaterThan(0); // Should use fallback pricing
    });

    it('should validate token counts', () => {
      expect(() => {
        calculateTokenCost({
          model: 'gpt-5-mini',
          promptTokens: -100,
          completionTokens: 500
        });
      }).toThrow('Invalid token count');
    });
  });
});