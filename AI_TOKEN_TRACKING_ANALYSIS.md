# AI Token Tracking Analysis

## Current Status: ⚠️ PARTIAL TRACKING

Out of 16 AI functions, only **7 are fully tracking tokens**. The rest have issues.

## Token Tracking Requirements

For proper token tracking, we need:
1. **promptTokens** (input tokens)
2. **completionTokens** (output tokens) 
3. **totalTokens** (combined)
4. **organizationId** (for billing)
5. **agentId** (for agent-specific tracking)
6. **conversationId** (for conversation tracking)
7. **userId** (for user tracking)

## Tracking Status by Function

### ✅ FULLY TRACKED (7/16)

1. **masterIntentClassifier** ✅
   - Location: Line 4522
   - Tracks: prompt, completion, total tokens
   - Has: agentId, organizationId, conversationId, userId

2. **determineEstimationStep** ✅
   - Location: Line 4872
   - Tracks: prompt, completion tokens
   - Has: All required metadata

3. **handleEstimationStep1** ✅
   - Location: Line 4941
   - Tracks: prompt, completion tokens
   - Has: All required metadata

4. **handleEstimationStep2** ✅
   - Location: Line 5009
   - Tracks: prompt, completion tokens
   - Has: All required metadata

5. **handleEstimationStep3** ✅
   - Location: Line 5080
   - Tracks: prompt, completion tokens
   - Has: All required metadata

6. **scoreBANTWithAI** ✅
   - Location: Line 5675
   - Tracks: prompt, completion tokens
   - Has: All required metadata

7. **Main Chat Handler (EMBEDDINGS)** ✅
   - Location: Line 6588
   - Tracks: prompt, completion tokens
   - Has: All required metadata

### ❌ NOT TRACKED (4/16)

These functions have token tracking COMMENTED OUT due to missing metadata:

8. **extractContactInfoAI** ❌
   - Location: Line 5158 (COMMENTED OUT)
   - Issue: Missing agent, conversationId, userId parameters
   - Comment: "Token tracking would require passing agent, conversationId, userId as parameters"

9. **extractBANTExactAI** ❌
   - Location: Line 5419 (COMMENTED OUT)
   - Issue: Missing agent, conversationId, userId parameters
   - Same comment as above

10. **normalizeBANTAI** ❌
    - Location: Line 5489 (COMMENTED OUT)
    - Issue: Missing agent, conversationId, userId parameters
    - Same comment as above

11. **extractPaymentPlan** ❌
    - Location: Line 5540 (COMMENTED OUT)
    - Issue: Missing agent, conversationId, userId parameters
    - Same comment as above

### ⚠️ PARTIALLY TRACKED (5/16)

These use callAIWithFallback but DON'T pass metadata properly:

12. **scoreLead** ⚠️
    - Location: Line 2001
    - Issue: Missing metadata object in callAIWithFallback
    - Fix needed: Add metadata with agent, conversation info

13. **extractPropertyInfo** ⚠️
    - Uses callAIWithFallback (via updated extractContactInfoAI)
    - Issue: No metadata passed
    - Fix needed: Pass metadata object

14. **Main Chat Handler (BANT Completion)** ⚠️
    - Location: Line 6751
    - Issue: Missing metadata in callAIWithFallback
    - Fix needed: Add metadata object

15. **Main Chat Handler (Regular)** ⚠️
    - Location: Line 6531
    - Issue: Missing metadata in callAIWithFallback
    - Fix needed: Add metadata object

16. **Main Chat Handler (BANT Extraction)** ⚠️
    - Location: Line 7179
    - Issue: Missing metadata in callAIWithFallback
    - Fix needed: Add metadata object

## Embedding Tracking

### ✅ TRACKED
- **createEmbedding** function (Line 407) - Tracks embedding tokens
- **getRelevantEmbeddings** (Lines 4673, 4755) - Tracks semantic search tokens

## Problems Identified

### 1. Missing Metadata in callAIWithFallback Calls
Many functions updated to use callAIWithFallback but don't pass the 5th parameter (metadata) needed for tracking:
```javascript
// Current (NOT tracking):
const response = await callAIWithFallback(
  AI_MODELS.CHAT_MAIN,
  AI_MODELS.FALLBACK_CHAT,
  messages,
  options
  // MISSING: metadata object
);

// Should be:
const response = await callAIWithFallback(
  AI_MODELS.CHAT_MAIN,
  AI_MODELS.FALLBACK_CHAT,
  messages,
  options,
  {
    agentId: agent.id,
    organizationId: agent.organization_id,
    conversationId: conversationId,
    userId: userId,
    operationType: 'specific_operation',
    endpoint: '/api/chat'
  }
);
```

### 2. Functions Missing Required Parameters
Some functions (extractContactInfoAI, extractBANTExactAI, etc.) don't receive agent/conversation context as parameters, making tracking impossible without refactoring.

### 3. Token Usage Data Retrieved
When tracking IS working, we capture:
- **Input**: `promptTokens` (tokens sent to AI)
- **Output**: `completionTokens` (tokens received from AI)
- **Total**: `totalTokens` (combined count)
- **Cost Calculation**: Based on model-specific pricing

## Recommendations

### Immediate Fixes Needed:

1. **Update callAIWithFallback calls** - Add metadata object to all 5 partially tracked functions
2. **Refactor parameter passing** - Update the 4 untracked functions to receive required context
3. **Ensure all new GPT-5 parameter calls include metadata** - Critical for cost tracking

### Code Changes Required:

1. For scoreLead (line 2001), add:
```javascript
{
  agentId: agent.id,
  organizationId: agent.organization_id,
  conversationId: conversation.id,
  userId: conversation.user_id,
  operationType: 'bant_scoring',
  endpoint: '/api/chat'
}
```

2. For main chat handlers, ensure metadata is passed with agent and conversation info

3. For extraction functions, refactor to accept agent/conversation as parameters

## Summary

- **Tracking Status**: 7/16 fully tracked (44%)
- **Critical Issue**: 9/16 functions (56%) not properly tracking tokens
- **Impact**: Incomplete cost tracking and usage analytics
- **Solution**: Add metadata to callAIWithFallback calls and refactor extraction functions