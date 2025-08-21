# 🤖 Complete AI Functions Use Cases and Model Assignments

## Overview
The system has **16 AI functions** performing various tasks from simple classification to complex reasoning. Here's the complete breakdown for optimization decisions.

## AI Functions by Category

### 🎯 1. Intent Classification & Routing
**Function**: `masterIntentClassifier()`
- **Current Model**: GPT-5 Nano (`gpt-5-nano-2025-08-07`)
- **Purpose**: Ultra-fast routing of user messages to appropriate handlers
- **Use Case**: Determines if message is about BANT, estimation, contact info, or general chat
- **Token Usage**: ~100-200 tokens per call
- **Parameters**: `reasoning_effort: minimal, verbosity: low`
- **Response Time Requirement**: <200ms
- **Optimization Opportunity**: ✅ Already optimized with Nano

---

### 💰 2. BANT Lead Scoring & Analysis (4 Functions)

#### `scoreLead()`
- **Current Model**: GPT-5 (`gpt-5-2025-08-07`)
- **Purpose**: Analyze conversation and score lead based on BANT criteria
- **Use Case**: Complex analysis of Budget, Authority, Need, Timeline
- **Token Usage**: ~500-1000 tokens per call
- **Parameters**: `reasoning_effort: high, verbosity: medium`
- **Optimization Opportunity**: Could use GPT-5 Mini for cost savings

#### `extractBANTExactAI()`
- **Current Model**: GPT-5 (`gpt-5-2025-08-07`)
- **Purpose**: Extract specific BANT values from conversation
- **Use Case**: Pull out budget numbers, timeline dates, decision maker info
- **Token Usage**: ~300-500 tokens per call
- **Parameters**: `reasoning_effort: high, verbosity: medium`
- **Optimization Opportunity**: Could use GPT-5 Nano for extraction

#### `normalizeBANTAI()`
- **Current Model**: GPT-5 Nano (`gpt-5-nano-2025-08-07`)
- **Purpose**: Normalize extracted BANT data to standard format
- **Use Case**: Convert "next month" to date, "$1M" to number, etc.
- **Token Usage**: ~100-200 tokens per call
- **Parameters**: `reasoning_effort: minimal, verbosity: low`
- **Optimization Opportunity**: ✅ Already optimized

#### `scoreBANTWithAI()`
- **Current Model**: GPT-5 (`gpt-5-2025-08-07`)
- **Purpose**: Score leads using custom BANT criteria
- **Use Case**: Apply agent-specific scoring rules and weights
- **Token Usage**: ~400-800 tokens per call
- **Parameters**: `reasoning_effort: high, verbosity: medium`
- **Optimization Opportunity**: Keep GPT-5 for complex reasoning

---

### 🏠 3. Property Estimation Flow (4 Functions)

#### `determineEstimationStep()`
- **Current Model**: GPT-5 (`gpt-5-2025-08-07`)
- **Purpose**: Determine which step of estimation flow user is in
- **Use Case**: Multi-step conversation flow control
- **Token Usage**: ~200-400 tokens per call
- **Parameters**: `reasoning_effort: medium, verbosity: low`
- **Optimization Opportunity**: Could use GPT-5 Nano

#### `handleEstimationStep1()` (Property Type)
- **Current Model**: GPT-5 (`gpt-5-2025-08-07`)
- **Purpose**: Handle property type selection conversation
- **Use Case**: Guide user through property type choices
- **Token Usage**: ~300-500 tokens per call
- **Parameters**: `reasoning_effort: medium, verbosity: low`
- **Optimization Opportunity**: Could use GPT-5 Mini

#### `handleEstimationStep2()` (Payment Plan)
- **Current Model**: GPT-5 (`gpt-5-2025-08-07`)
- **Purpose**: Handle payment plan selection
- **Use Case**: Present and explain payment options
- **Token Usage**: ~300-500 tokens per call
- **Parameters**: `reasoning_effort: medium, verbosity: low`
- **Optimization Opportunity**: Could use GPT-5 Mini

#### `handleEstimationStep3()` (Final Estimate)
- **Current Model**: GPT-5 (`gpt-5-2025-08-07`)
- **Purpose**: Generate detailed property estimate
- **Use Case**: Provide comprehensive pricing and details
- **Token Usage**: ~500-1000 tokens per call
- **Parameters**: `reasoning_effort: high, verbosity: high`
- **Optimization Opportunity**: Keep GPT-5 for detailed responses

---

### 📞 4. Contact & Information Extraction (3 Functions)

#### `extractContactInfoAI()`
- **Current Model**: GPT-5 Nano (`gpt-5-nano-2025-08-07`)
- **Purpose**: Extract name, email, phone from messages
- **Use Case**: Capture lead contact details
- **Token Usage**: ~100-200 tokens per call
- **Parameters**: `reasoning_effort: minimal, verbosity: low`
- **Optimization Opportunity**: ✅ Already optimized

#### `extractPropertyInfo()`
- **Current Model**: GPT-5 Nano (`gpt-5-nano-2025-08-07`)
- **Purpose**: Extract property details from conversation
- **Use Case**: Capture location, size, type, features
- **Token Usage**: ~150-250 tokens per call
- **Parameters**: `reasoning_effort: minimal, verbosity: low`
- **Optimization Opportunity**: ✅ Already optimized

#### `extractPaymentPlan()`
- **Current Model**: GPT-5 Nano (`gpt-5-nano-2025-08-07`)
- **Purpose**: Extract payment preferences
- **Use Case**: Identify cash, financing, timeline preferences
- **Token Usage**: ~100-150 tokens per call
- **Parameters**: `reasoning_effort: minimal, verbosity: low`
- **Optimization Opportunity**: ✅ Already optimized

---

### 💬 5. Main Chat Handlers (4 Variations)

#### Main Chat Handler (Regular)
- **Current Model**: GPT-5 (`gpt-5-2025-08-07`)
- **Purpose**: General conversation responses
- **Use Case**: Handle open-ended real estate queries
- **Token Usage**: ~500-1500 tokens per call
- **Parameters**: `reasoning_effort: medium, verbosity: medium`
- **Optimization Opportunity**: Keep GPT-5 for quality

#### Main Chat Handler (With Embeddings)
- **Current Model**: GPT-5 (`gpt-5-2025-08-07`)
- **Purpose**: Context-aware responses using document knowledge
- **Use Case**: Answer questions using agent's uploaded documents
- **Token Usage**: ~1000-2000 tokens per call (includes context)
- **Parameters**: `reasoning_effort: medium, verbosity: medium`
- **Optimization Opportunity**: Keep GPT-5 for context understanding

#### Main Chat Handler (BANT Completion)
- **Current Model**: GPT-5 (`gpt-5-2025-08-07`)
- **Purpose**: Complete BANT qualification conversation
- **Use Case**: Fill in missing BANT information through conversation
- **Token Usage**: ~500-1000 tokens per call
- **Parameters**: `reasoning_effort: medium, verbosity: medium`
- **Optimization Opportunity**: Could use GPT-5 Mini

#### Main Chat Handler (BANT Extraction)
- **Current Model**: GPT-5 (`gpt-5-2025-08-07`)
- **Purpose**: Extract BANT info while maintaining conversation
- **Use Case**: Seamlessly gather qualification data
- **Token Usage**: ~600-1200 tokens per call
- **Parameters**: `reasoning_effort: medium, verbosity: medium`
- **Optimization Opportunity**: Keep GPT-5 for natural conversation

---

## 📊 Summary Statistics

### Current Model Distribution:
- **GPT-5 Standard**: 10 functions (62.5%)
- **GPT-5 Nano**: 6 functions (37.5%)

### By Use Case Category:
- **Complex Reasoning**: 5 functions → GPT-5
- **Conversations**: 4 functions → GPT-5
- **Simple Extraction**: 6 functions → GPT-5 Nano
- **Classification**: 1 function → GPT-5 Nano

### Token Usage Patterns:
- **Low (< 300 tokens)**: 7 functions → Ideal for Nano
- **Medium (300-800 tokens)**: 5 functions → Could use Mini
- **High (> 800 tokens)**: 4 functions → Need GPT-5

---

## 🎯 Optimization Recommendations

### Keep GPT-5 Standard For:
1. `scoreLead()` - Complex BANT analysis
2. `scoreBANTWithAI()` - Custom scoring logic
3. `handleEstimationStep3()` - Detailed estimates
4. Main Chat (Regular) - Quality conversations
5. Main Chat (Embeddings) - Context understanding
6. Main Chat (BANT Extraction) - Natural conversation flow

### Consider GPT-5 Mini For (if available):
1. `handleEstimationStep1()` - Structured responses
2. `handleEstimationStep2()` - Structured responses
3. Main Chat (BANT Completion) - Guided conversation
4. `determineEstimationStep()` - Flow control

### Already Optimized with GPT-5 Nano:
1. `masterIntentClassifier()` ✅
2. `extractContactInfoAI()` ✅
3. `extractPropertyInfo()` ✅
4. `extractPaymentPlan()` ✅
5. `normalizeBANTAI()` ✅

### Potential New Optimization:
1. `extractBANTExactAI()` - Could move to Nano (currently GPT-5)

---

## 💰 Cost Impact Analysis

### Current Daily Costs (100 conversations/agent):
- GPT-5: ~$0.20/day (10 functions)
- GPT-5 Nano: ~$0.05/day (6 functions)
- **Total**: ~$0.25/day per agent

### With Optimizations (if GPT-5 Mini available at $0.10/$0.80 per 1M):
- GPT-5: ~$0.12/day (6 functions)
- GPT-5 Mini: ~$0.08/day (4 functions)
- GPT-5 Nano: ~$0.05/day (6 functions)
- **Total**: ~$0.25/day per agent (similar cost, better performance)

---

## 🔧 Implementation Priority

### High Priority (Quick Wins):
1. Move `extractBANTExactAI()` to GPT-5 Nano
2. Test `determineEstimationStep()` with Nano

### Medium Priority (Needs Testing):
1. Test estimation steps 1&2 with lower models
2. Evaluate BANT completion chat with reduced model

### Low Priority (Keep As Is):
1. Main conversation handlers
2. Complex scoring functions
3. Already optimized extraction functions