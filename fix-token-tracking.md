# Token Tracking Fix Implementation

## Root Cause Analysis

### The Problem
1. **callAIWithFallback** only tracks tokens when `metadata.agentId` exists (lines 336, 371)
2. Functions like `extractPropertyInfo` and `extractPaymentPlan` pass `agent?.id`
3. When `agent` is null, `agent?.id` is undefined, so NO TOKEN TRACKING occurs
4. This causes approximately 3,000 tokens to go untracked

### Evidence
```javascript
// Line 336 in callAIWithFallback
if (response.usage && metadata.agentId) {  // <-- Only tracks if agentId exists
  await trackTokenUsage({...});
}

// Line 5564 in extractPropertyInfo
{
  agentId: agent?.id,  // <-- Could be undefined if agent is null
  ...
}
```

## The Fix

### Option 1: Always Track Tokens (Recommended)
Modify callAIWithFallback to always track tokens, even without agentId:

```javascript
// Line 336 - BEFORE
if (response.usage && metadata.agentId) {

// Line 336 - AFTER
if (response.usage) {
  await trackTokenUsage({
    organizationId: metadata.organizationId || 'system',
    agentId: metadata.agentId || 'system',
    conversationId: metadata.conversationId || 'system',
    userId: metadata.userId || 'system',
    promptTokens: response.usage.prompt_tokens,
    completionTokens: response.usage.completion_tokens,
    totalTokens: response.usage.total_tokens,
    model: primaryModel,
    operationType: metadata.operationType || 'chat_completion',
    endpoint: metadata.endpoint || '/api/chat',
    responseTime: Date.now() - startTime,
    success: true,
    hasJsonFormat: metadata.hasJsonFormat || false
  });
}
```

### Option 2: Pass Default Agent ID
Ensure agent ID is always passed in extraction functions:

```javascript
// In extractPropertyInfo and extractPaymentPlan
{
  agentId: agent?.id || 'extraction_default',
  organizationId: agent?.organization_id || 'system',
  ...
}
```

## Additional Issues to Fix

### 1. Embedding Token Tracking Inconsistency
Embeddings use `inputTokens` instead of `promptTokens`:

```javascript
// Line 410, 4714, 4796 - BEFORE
inputTokens: embeddingRes.usage.total_tokens || query.length / 4,

// AFTER - Standardize to promptTokens
promptTokens: embeddingRes.usage.total_tokens || query.length / 4,
completionTokens: 0,  // Embeddings don't have completions
```

### 2. Missing Token Tracking in Other Functions
Check these functions for proper tracking:
- Any direct OpenAI API calls not using callAIWithFallback
- Background jobs or cron tasks that might use AI

## Implementation Steps

1. **Update callAIWithFallback** (Line 336 and 371)
   - Remove the `metadata.agentId` check
   - Use default values for missing metadata

2. **Update trackTokenUsage function** (Line 11219)
   - Handle 'system' or default agent IDs properly
   - Add logging for untracked calls

3. **Standardize embedding token tracking**
   - Change inputTokens to promptTokens
   - Add completionTokens: 0 for clarity

4. **Add comprehensive logging**
   ```javascript
   console.log(`[TOKEN TRACKING] ${operationType}: ${totalTokens} tokens for ${agentId || 'NO_AGENT'}`);
   ```

## Testing Plan

Create a test script that:
1. Calls each AI function with and without agent
2. Checks if tokens are tracked in both cases
3. Compares tracked tokens with actual OpenAI usage

## Expected Results

After implementing these fixes:
- ALL OpenAI API calls will be tracked
- Token discrepancy should be reduced to near zero
- Better visibility into token usage patterns

## Code Changes Required

### File: BACKEND/server.js

1. **Line 336**: Remove agentId check in callAIWithFallback
2. **Line 371**: Remove agentId check in fallback
3. **Lines 410, 4714, 4796**: Change inputTokens to promptTokens
4. **Line 11219**: Update trackTokenUsage to handle defaults

Total changes: 5 locations in 1 file