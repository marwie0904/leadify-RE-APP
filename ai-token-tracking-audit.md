# AI Token Usage Tracking Audit Report

## Problem Statement
- **Expected Tokens**: 274,928 (app tracking)
- **Actual Tokens**: 277,861 (OpenAI dashboard)
- **Discrepancy**: 2,933 tokens (approximately 3,000)

## Analysis Summary

### All OpenAI API Functions Found in BACKEND/server.js

#### 1. **createCompletionWithFallback** (Lines 327-383)
- **Purpose**: Main chat completion with fallback support
- **Token Tracking**: ✅ WORKING
- **Implementation**: 
  - Primary model tracking at lines 337-345
  - Fallback model tracking at lines 372-380
- **Fields Tracked**: prompt_tokens, completion_tokens, total_tokens

#### 2. **generateEmbedding** (Lines 401-421)
- **Purpose**: Generate embeddings for documents
- **Token Tracking**: ⚠️ PARTIAL
- **Issue**: Uses `inputTokens` instead of standard `prompt_tokens`
- **Implementation**: Lines 410-415
- **Fields Tracked**: total_tokens (as inputTokens)

#### 3. **masterIntentClassifier** (Lines 4504-4556)
- **Purpose**: Classify user intent (BANT, GREETING, etc.)
- **Token Tracking**: ✅ WORKING
- **Implementation**: Lines 4548-4556
- **Fields Tracked**: prompt_tokens, completion_tokens

#### 4. **extractPropertyDetails** (Lines 5540-5597)
- **Purpose**: Extract property details from conversation
- **Token Tracking**: ❌ DISABLED (COMMENTED OUT)
- **Implementation**: Lines 5576-5590 (commented)
- **Note**: "Token tracking would require passing agent, conversationId, userId as parameters"

#### 5. **extractPaymentPlan** (Lines 5600-5649)
- **Purpose**: Extract payment plan from conversation
- **Token Tracking**: ❌ DISABLED (COMMENTED OUT)
- **Implementation**: Lines 5631-5645 (commented)
- **Note**: Same issue as extractPropertyDetails

#### 6. **leadScoringWithAI** (Lines 1995-2040)
- **Purpose**: Score leads using AI
- **Token Tracking**: ✅ WORKING
- **Implementation**: Lines 2028-2036
- **Fields Tracked**: prompt_tokens, completion_tokens

#### 7. **Estimation Functions** (Multiple locations)
- **getEstimationResponse** (Lines 4870-4920)
- **Token Tracking**: ✅ WORKING
- **Implementation**: Lines 4908-4918
- **Fields Tracked**: prompt_tokens, completion_tokens

#### 8. **BANT Extraction** (Lines 7310-7360)
- **Purpose**: Extract BANT information
- **Token Tracking**: ✅ WORKING
- **Implementation**: Lines 7345-7355
- **Fields Tracked**: prompt_tokens, completion_tokens

#### 9. **Chat Reply Functions** (Lines 6680-6695, 6910-6925)
- **Purpose**: Generate chat responses
- **Token Tracking**: ✅ WORKING
- **Implementation**: Multiple locations
- **Fields Tracked**: prompt_tokens, completion_tokens

#### 10. **Semantic Search Embeddings** (Lines 4700-4720, 4782-4800)
- **Purpose**: Generate embeddings for semantic search
- **Token Tracking**: ⚠️ USES INPUT_TOKENS
- **Implementation**: Lines 4710-4718, 4792-4800
- **Fields Tracked**: total_tokens (as inputTokens)

## Key Issues Found

### 1. **CRITICAL: Disabled Token Tracking**
Two functions have completely disabled token tracking:
- `extractPropertyDetails` (estimation flow)
- `extractPaymentPlan` (estimation flow)

These are called during property estimation conversations and their tokens are NOT being counted.

### 2. **Inconsistent Token Field Names**
- Embeddings use `inputTokens` instead of `prompt_tokens`
- Some functions use `total_tokens` while others calculate it

### 3. **Missing totalTokens Calculation**
The trackTokenUsage function should calculate:
```javascript
totalTokens = (promptTokens || 0) + (completionTokens || 0) + (inputTokens || 0)
```

## Token Tracking Function Analysis

Location: Line 11219
```javascript
async function trackTokenUsage(data) {
  // Current implementation
  const totalTokens = (data.promptTokens || 0) + 
                     (data.completionTokens || 0) + 
                     (data.inputTokens || 0);
}
```

## Recommendations

### Immediate Fixes Needed:

1. **Enable token tracking for extractPropertyDetails and extractPaymentPlan**
   - These functions need agent, conversationId, and userId passed as parameters
   - Currently causing token leakage

2. **Standardize token field names**
   - Use consistent naming: promptTokens, completionTokens, totalTokens
   - Fix embedding functions to use promptTokens instead of inputTokens

3. **Add comprehensive logging**
   - Log every OpenAI API call with request/response details
   - Add debug mode to compare tracked vs actual usage

## Estimated Token Leakage

Based on the analysis:
- **extractPropertyDetails**: ~500-1000 tokens per call
- **extractPaymentPlan**: ~300-500 tokens per call
- If called 3-5 times in a conversation: **2,400-7,500 tokens leaked**

This matches the ~3,000 token discrepancy observed!

## Next Steps

1. Fix the commented-out token tracking in extraction functions
2. Test each function individually to verify token counting
3. Add comprehensive logging for all OpenAI API calls
4. Implement a token reconciliation system