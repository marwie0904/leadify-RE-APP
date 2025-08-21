# AI Model Optimization Implementation Plan

## Overview
Optimize AI model usage across the backend by replacing legacy models with the latest GPT-5 mini/nano models for better cost efficiency and performance.

## Model Migration Map

### 🔄 Embeddings Migration
- **FROM**: `text-embedding-ada-002`
- **TO**: `text-embedding-3-small`
- **Affected Functions**: All embedding functions (createEmbedding, getRelevantEmbeddings, etc.)
- **Benefits**: Better multilingual support, cheaper, more efficient

### 🚀 Chat Completions Migration

#### High-Performance Tasks (Use GPT-5 Mini)
1. **scoreLead()** - Complex BANT scoring with reasoning
2. **determineEstimationStep()** - Multi-step flow detection
3. **handleEstimationStep3()** - Final estimate generation with nuance
4. **extractBANTExactAI()** - Long-span extraction
5. **extractPropertyInfo()** - Complex property details extraction
6. **scoreBANTWithAI()** - Custom criteria reasoning
7. **Main Chat Handler** - Conversational quality

#### Fast Classification Tasks (Use GPT-5 Nano)
1. **masterIntentClassifier()** - Ultra-fast intent routing
2. **handleEstimationStep1()** - Simple property selection
3. **handleEstimationStep2()** - Payment plan selection
4. **extractContactInfoAI()** - Name/phone extraction
5. **normalizeBANTAI()** - Simple BANT mapping
6. **extractPaymentPlan()** - Plan extraction

## Implementation Changes Required

### 1. Update Model Constants
```javascript
// Add at top of server.js
const AI_MODELS = {
  // Embeddings
  EMBEDDING: 'text-embedding-3-small',
  
  // High-performance tasks
  CHAT_MAIN: 'gpt-5-mini',
  REASONING: 'gpt-5-mini',
  
  // Fast classification
  CLASSIFIER: 'gpt-5-nano',
  EXTRACTION: 'gpt-5-nano',
  
  // Fallbacks
  FALLBACK_CHAT: 'gpt-4',
  FALLBACK_REASONING: 'gpt-4-turbo-preview'
};
```

### 2. Remove Temperature Parameters
GPT-5 models only support temperature=1 (default), so remove all temperature specifications:
```javascript
// Before
model: 'gpt-5-mini',
temperature: 0,

// After
model: 'gpt-5-mini',
// temperature removed - uses default
```

### 3. Function-Specific Updates

| Function | Line | Current Model | New Model | Action Required |
|----------|------|--------------|-----------|-----------------|
| createEmbedding | 241 | text-embedding-ada-002 | text-embedding-3-small | Update model |
| scoreLead | 1803 | gpt-4-turbo-preview | gpt-5-mini | Update model, remove temperature |
| masterIntentClassifier | 4253 | gpt-5-nano-2025-08-07 | gpt-5-nano | Already correct |
| getRelevantEmbeddings | 4447 | text-embedding-3-small | text-embedding-3-small | No change |
| determineEstimationStep | 4656 | gpt-5-mini-2025-08-07 | gpt-5-mini | Already correct |
| handleEstimationStep1 | 4722 | gpt-5-mini-2025-08-07 | gpt-5-nano | Change to nano |
| handleEstimationStep2 | 4782 | gpt-5-mini-2025-08-07 | gpt-5-nano | Change to nano |
| handleEstimationStep3 | 4842 | gpt-5-mini-2025-08-07 | gpt-5-mini | Already correct |
| extractContactInfoAI | 4904 | gpt-4 | gpt-5-nano | Update model |
| extractBANTExactAI | 5006 | gpt-4 | gpt-5-mini | Update model |
| normalizeBANTAI | 5163 | gpt-4 | gpt-5-nano | Update model |
| extractPropertyInfo | 5251 | gpt-4 | gpt-5-mini | Update model |
| extractPaymentPlan | 5298 | gpt-5-mini-2025-08-07 | gpt-5-nano | Change to nano |
| scoreBANTWithAI | 5388 | gpt-5-mini-2025-08-07 | gpt-5-mini | Already correct |
| Main chat handler | 6335+ | gpt-5-mini-2025-08-07 | gpt-5-mini | Already correct |

## Cost Optimization Benefits

### Estimated Cost Savings
- **Embeddings**: ~50% cheaper with text-embedding-3-small
- **Classification**: ~80% cheaper with gpt-5-nano for simple tasks
- **Chat Completions**: ~60% cheaper with gpt-5-mini vs gpt-4
- **Overall**: Estimated 40-60% reduction in AI costs

### Performance Improvements
- **Faster Response Times**: GPT-5 nano ~50% faster for classification
- **Better Accuracy**: GPT-5 models optimized for specific tasks
- **Reduced Latency**: Strategic use of nano for time-sensitive operations

## Testing Strategy

1. **Unit Tests**: Test each function with new models
2. **Integration Tests**: End-to-end conversation flows
3. **Performance Benchmarks**: Measure latency improvements
4. **Cost Tracking**: Monitor token usage reduction

## Rollout Plan

### Phase 1: Non-Critical Functions (Week 1)
- Update embedding models
- Update simple extraction functions

### Phase 2: Classification Functions (Week 2)
- Update intent classifier
- Update BANT normalization
- Update contact extraction

### Phase 3: Core Chat Functions (Week 3)
- Update main chat handler
- Update BANT scoring
- Update estimation handlers

### Phase 4: Monitoring & Optimization (Week 4)
- Monitor performance metrics
- Fine-tune model selection
- Implement fallback strategies

## Fallback Strategy

```javascript
async function callAIWithFallback(primaryModel, fallbackModel, messages, options = {}) {
  try {
    return await openai.chat.completions.create({
      model: primaryModel,
      messages,
      ...options
    });
  } catch (error) {
    console.warn(`Primary model ${primaryModel} failed, using fallback ${fallbackModel}`);
    return await openai.chat.completions.create({
      model: fallbackModel,
      messages,
      temperature: 0, // Can use with fallback models
      ...options
    });
  }
}
```

## Special Considerations

### O4-Mini / O3-Mini Usage
Consider these models only if:
- Property estimates require complex calculations
- Future features need structured reasoning/math
- Tool use becomes necessary

### Streaming Limitations
- GPT-5 Mini requires organization verification for streaming
- Consider using GPT-5 Nano for streaming responses when possible
- Implement non-streaming fallback for unverified organizations

## Success Metrics

1. **Cost Reduction**: Target 40%+ reduction in AI costs
2. **Latency Improvement**: Target 30%+ faster response times
3. **Quality Maintenance**: No degradation in output quality
4. **Error Rate**: <1% increase in error rates

## Next Steps

1. Create feature branch for model updates
2. Update model references systematically
3. Run comprehensive test suite
4. Deploy to staging for validation
5. Monitor metrics for 48 hours
6. Roll out to production with monitoring