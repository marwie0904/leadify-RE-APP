# Single Question per BANT Category Update

## Overview
Further simplified the Custom BANT Questions feature to allow only ONE question per BANT category with a streamlined navigation flow using Previous/Next buttons.

## Key Changes

### 1. UI/UX Improvements
- **One Question Per Category**: Each BANT category (Budget, Authority, Need, Timeline) now has only ONE question
- **Sequential Navigation**: Users navigate through categories using Previous/Next buttons
- **Progress Indicator**: Visual progress bar showing completed and current categories
- **Color-Coded Categories**: Each category has its own color scheme for better visual distinction
- **Auto-Save on Navigation**: Questions are saved as users progress through categories

### 2. Component Updates (`custom-bant-questions.tsx`)

#### New Features:
- **Step-by-step navigation** instead of tabs
- **Progress indicator** with checkmarks for completed categories
- **Single question focus** - One large textarea per category
- **Smart validation** - Can't proceed without entering a question
- **onComplete callback** - Automatically moves to next step in onboarding

#### Visual Enhancements:
- Budget: Green theme 💚
- Authority: Blue theme 💙
- Need: Purple theme 💜
- Timeline: Orange theme 🧡

### 3. Navigation Flow

```
Budget Question
    ↓ (Next)
Authority Question
    ↓ (Next)
Need Question
    ↓ (Next)
Timeline Question
    ↓ (Continue to BANT Configuration)
```

### 4. Onboarding Integration
- Added `onComplete` callback that automatically progresses to BANT Configuration
- Seamless flow from questions to configuration without manual navigation
- Questions are saved before moving to the next onboarding step

## User Experience

### What Users See:

1. **Budget Screen**:
   - "What question should your AI agent ask about budget?"
   - Single textarea for the question
   - Next button to proceed

2. **Authority Screen**:
   - "What question should your AI agent ask about authority?"
   - Previous button to go back
   - Next button to continue

3. **Need Screen**:
   - "What question should your AI agent ask about need?"
   - Previous/Next navigation

4. **Timeline Screen**:
   - "What question should your AI agent ask about timeline?"
   - Previous button
   - "Continue to BANT Configuration" button

### Benefits:
- **Simplified Input**: Users focus on one question at a time
- **Clear Progress**: Visual indicators show completion status
- **Faster Setup**: Reduced from multiple questions to just 4 total
- **Better UX**: Step-by-step guidance prevents overwhelm
- **Intuitive Navigation**: Previous/Next buttons are familiar patterns

## Technical Details

### Default Questions (One per category):
```javascript
{
  budget: "What is your budget range for this property?",
  authority: "Are you the sole decision maker for this purchase?",
  need: "What is the primary purpose for this property?",
  timeline: "When are you planning to make a purchase?"
}
```

### Database Structure:
- Still uses `agent_bant_questions` table
- Enforces one question per category per agent
- `question_order` is always 1 for simplicity

### API Behavior:
- Backend accepts array of questions but expects only 4 (one per category)
- Validation ensures each category has exactly one question

## Files Modified

### Frontend:
- `/FRONTEND/financial-dashboard-2/components/agents/custom-bant-questions.tsx` - Complete rewrite with new UI
- `/FRONTEND/financial-dashboard-2/components/onboarding/agent-creation-wizard.tsx` - Added onComplete handler

### Scripts:
- `/run-bant-questions-migration-simple.js` - Updated defaults to one per category
- `/test-simplified-bant-questions.js` - Updated test data

## Testing Results
✅ All tests passing with the new single-question structure
✅ Database operations working correctly
✅ Navigation flow implemented successfully

## Next Steps
1. Test in browser to verify the new UI flow
2. Ensure agent management page works with single questions
3. Verify conversation flow uses the single questions correctly

## Migration Notes
- Existing agents with multiple questions per category will be automatically cleaned up
- Only the first question per category is kept (based on question_order)
- No data loss for agents already using single questions