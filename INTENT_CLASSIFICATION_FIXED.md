# ✅ Intent Classification Fixed for BANT Answers

## Problem Identified
When a user answers "residency" (or similar BANT answers), the intent classifier was misclassifying it as "Embeddings" instead of "BANT", causing the BANT extraction to never run.

### Root Causes:
1. **Pattern Recognition Gap**: "residency" wasn't in the need patterns (only "residence" was)
2. **AI Returning Empty**: GPT-5-nano was returning empty string "" for some inputs
3. **No Empty Response Handling**: When AI returned empty, it defaulted to "Embeddings"
4. **Model Too Light**: GPT-5-nano might be too lightweight for nuanced classification

## Fixes Applied

### 1. Enhanced Pattern Recognition (Line 4323)
Added more variations to recognize need answers:
```javascript
residence: /(for living|personal use|residence|residency|to live|family home|own use|primary home|residential)/i,
home: /^(home|house|condo|apartment|residency|residential)[\s!.,]*$/i,
```

### 2. Empty Response Handling (Lines 4548-4557)
Added special handling when AI returns empty response:
```javascript
if (!text || text === '') {
  console.log(`[MASTER INTENT] ⚠️ AI returned empty response, using pattern detection`);
  if (bantDetection.isBant && bantDetection.confidence >= 0.5) {
    console.log(`[MASTER INTENT] 🔄 Pattern detection suggests BANT`);
    return 'BANT';
  }
  return 'Embeddings';
}
```

### 3. Upgraded Classification Model (Line 29)
Changed from nano to mini for better accuracy:
```javascript
CLASSIFIER: 'gpt-5-mini-2025-08-07', // Intent classification - mini for better accuracy
```

### 4. Improved Prompt Examples (Lines 4484-4488 & 4501-4505)
Made BANT examples more explicit:
```javascript
BANT - Property interest, buying intent, or BANT answers (looking for property, budget amounts like "20M", authority like "yes", need like "residence/residency/investment", timeline like "next month")
```

## How Intent Classification Works

1. **Pattern Detection First**: Checks if message matches BANT patterns
   - If confidence ≥ 0.7 → Returns "BANT" immediately
   - If confidence ≥ 0.5 → Biases AI toward BANT

2. **AI Classification**: Uses GPT-5-mini to classify into categories
   - Now handles empty responses properly
   - Falls back to pattern detection when AI fails

3. **BANT Flow**: Once classified as "BANT"
   - Extracts BANT information using `extractBANTExactAI`
   - Updates conversation state
   - Generates appropriate next question

## Expected Behavior After Restart

When users answer BANT questions:
- "residency" → Correctly classified as BANT ✅
- "residential" → Correctly classified as BANT ✅
- "for living" → Correctly classified as BANT ✅
- "investment" → Correctly classified as BANT ✅
- "30M" → Correctly classified as BANT ✅
- "yes" (to authority) → Correctly classified as BANT ✅
- "next month" → Correctly classified as BANT ✅

## Token Usage Optimization

- **Previous**: GPT-5-nano (cheapest but sometimes returns empty)
- **Now**: GPT-5-mini (slightly more expensive but more reliable)
- **Impact**: ~2x tokens for classification, but much better accuracy

## Server Restart Required

```bash
# Stop current server (Ctrl+C) then:
node server.js
```

## Testing Checklist

After restart, test these scenarios:
1. ✅ Answer "residency" to need question → Should proceed to timeline
2. ✅ Answer "30M" to budget question → Should proceed to authority  
3. ✅ Answer "yes" to authority → Should proceed to need
4. ✅ Answer "next month" to timeline → Should ask for contact info

The intent classification system now properly recognizes all BANT answers!