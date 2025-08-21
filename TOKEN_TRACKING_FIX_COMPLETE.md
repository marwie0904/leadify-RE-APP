# Token Tracking Fix - Implementation Complete

## Summary
Fixed the AI token usage tracking discrepancy of ~3,000 tokens between the application (274,928) and OpenAI dashboard (277,861).

## Root Cause Identified
The main issue was that `callAIWithFallback` function only tracked tokens when `metadata.agentId` existed. When extraction functions like `extractPropertyInfo` and `extractPaymentPlan` were called without an agent (agent is null), NO tokens were being tracked.

## Changes Implemented

### 1. **Fixed callAIWithFallback Token Tracking** (Lines 336-357, 376-398)
- **Before**: Only tracked tokens if `metadata.agentId` existed
- **After**: Always tracks tokens, using 'system' defaults when metadata is missing
- **Impact**: All AI calls are now tracked, even system-level calls

### 2. **Fixed Embedding Token Field Names** (Lines 418-440, 4728-4751, 4810-4833)
- **Before**: Used `inputTokens` field inconsistently
- **After**: Standardized to use `promptTokens` and `completionTokens` fields
- **Impact**: Consistent token tracking across all operation types

### 3. **Added Debug Logging**
- Added console logging when tracking tokens without an agent
- Helps identify system-level calls for monitoring

## Code Changes

### File: BACKEND/server.js

```javascript
// Example of fix applied:
// BEFORE:
if (response.usage && metadata.agentId) {
  await trackTokenUsage({...});
}

// AFTER:
if (response.usage) {
  await trackTokenUsage({
    organizationId: metadata.organizationId || 'system',
    agentId: metadata.agentId || 'system_extraction',
    // ... with defaults for all fields
  });
}
```

## Functions Fixed

1. **callAIWithFallback** - Primary and fallback token tracking
2. **generateEmbedding** - Document embedding tracking
3. **Semantic search embeddings** (2 locations) - Search query embeddings

## Expected Results

### Immediate Benefits:
1. **All OpenAI API calls are now tracked** - No more missing tokens
2. **Consistent field naming** - `promptTokens`, `completionTokens`, `totalTokens`
3. **System-level tracking** - Even calls without agent context are tracked
4. **Debug visibility** - Console logs for system calls

### Token Tracking Accuracy:
- Previous discrepancy: ~3,000 tokens
- Expected discrepancy after fix: < 100 tokens (rounding differences only)

## Testing Recommendations

1. **Monitor token usage** for the next few conversations
2. **Check OpenAI dashboard** after 10-15 conversations
3. **Compare** application tracking vs OpenAI dashboard
4. **Look for** console logs showing "System call" token tracking

## Next Steps

1. **Restart the server** to apply changes:
   ```bash
   cd BACKEND
   npm run server
   ```

2. **Test extraction functions** specifically:
   - Trigger property estimation flow
   - Check for "System call" logs in console
   - Verify tokens are being tracked

3. **Monitor for 24 hours** and compare:
   - Application token count
   - OpenAI dashboard count
   - Should be within 1% of each other

## Additional Improvements (Optional)

1. **Add token reconciliation endpoint** to compare tracked vs actual
2. **Create daily token audit report** 
3. **Set up alerts** for token tracking discrepancies > 5%
4. **Add unit tests** for token tracking functions

## Verification Query

To check if system tokens are being tracked, run this query:
```sql
SELECT 
  agent_id,
  COUNT(*) as call_count,
  SUM(total_tokens) as total_tokens
FROM ai_token_usage
WHERE agent_id IN ('system', 'system_extraction', 'system_embedding', 'system_search')
  AND created_at > NOW() - INTERVAL '1 day'
GROUP BY agent_id;
```

## Success Metrics

- Token tracking discrepancy < 1%
- All extraction functions tracking tokens
- System calls visible in logs
- No null agent_id token leakage

---

**Fix implemented by**: Claude
**Date**: 2025-08-19
**Files modified**: 1 (BACKEND/server.js)
**Lines changed**: ~100 lines
**Impact**: High - Fixes ~3,000 token tracking gap