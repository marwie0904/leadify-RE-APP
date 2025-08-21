# 📊 Complete AI Models and Costs Overview

## Active Models Being Used (3 Models Total)

### 1. GPT-5 (Main Model)
**Model ID**: `gpt-5-2025-08-07`
**Usage**: 
- Main chat conversations
- Complex reasoning tasks
- BANT scoring and analysis
- Property estimation flows
- Fallback for all operations

**Pricing** (per 1M tokens):
- Input: $0.25
- Output: $2.00
- Cached Input: $0.025

**Cost per 1K tokens**:
- Input: $0.00025
- Output: $0.002
- Cached: $0.000025

### 2. GPT-5 Nano (Fast Classification)
**Model ID**: `gpt-5-nano-2025-08-07`
**Usage**:
- Intent classification
- Contact information extraction
- BANT normalization
- Property info extraction
- Payment plan extraction
- Simple, fast extraction tasks

**Pricing** (per 1M tokens):
- Input: $0.05
- Output: $0.40
- Cached Input: $0.005

**Cost per 1K tokens**:
- Input: $0.00005
- Output: $0.0004
- Cached: $0.000005

### 3. Text Embedding 3 Small
**Model ID**: `text-embedding-3-small`
**Usage**:
- Creating document embeddings
- Semantic search for relevant context
- Agent knowledge base vectorization

**Pricing** (per 1M tokens):
- Input: $0.02

**Cost per 1K tokens**:
- Input: $0.00002

## Usage by Function (16 AI Functions)

### GPT-5 Standard (`gpt-5-2025-08-07`) - 10 Functions
1. **scoreLead** - BANT lead scoring
2. **determineEstimationStep** - Estimation flow control
3. **handleEstimationStep1** - Property type selection
4. **handleEstimationStep2** - Payment plan selection
5. **handleEstimationStep3** - Final estimate generation
6. **extractBANTExactAI** - BANT extraction from conversations
7. **scoreBANTWithAI** - Custom BANT scoring
8. **Main Chat Handler** - Regular conversations
9. **Main Chat Handler (BANT)** - BANT-specific responses
10. **Main Chat Handler (Embeddings)** - Context-aware responses

### GPT-5 Nano (`gpt-5-nano-2025-08-07`) - 6 Functions
1. **masterIntentClassifier** - Intent routing
2. **extractContactInfoAI** - Contact extraction
3. **normalizeBANTAI** - BANT normalization
4. **extractPropertyInfo** - Property details extraction
5. **extractPaymentPlan** - Payment plan extraction
6. **Simple extraction tasks** - Various quick extractions

### Text Embedding 3 Small - Multiple Uses
- **createEmbedding** - Document embedding creation
- **getRelevantEmbeddings** - Semantic search (used 2x per search)
- Agent document processing
- Knowledge base creation

## Cost Tracking Implementation

### Database Storage
All token usage is tracked in:
- **Table**: `ai_token_usage`
- **View**: `ai_token_usage_daily` (daily aggregations)

### Tracked Metrics
For each AI call:
- Organization ID (for billing)
- Agent ID (for agent-specific costs)
- Conversation ID (for conversation tracking)
- User ID (for user analytics)
- Prompt tokens (input)
- Completion tokens (output)
- Total tokens
- Model used
- Operation type
- Response time
- Success/failure status
- Fallback usage

## Cost Examples

### Typical Conversation (1000 tokens in, 500 tokens out)
- **GPT-5**: $0.00025 + $0.001 = **$0.00125**
- **GPT-5 Nano**: $0.00005 + $0.0002 = **$0.00025**

### Document Embedding (1000 tokens)
- **Text Embedding 3 Small**: **$0.00002**

### Daily Usage Estimate (per agent)
- 100 conversations × 2K tokens avg = 200K tokens
- GPT-5 costs: ~$0.25/day
- GPT-5 Nano costs: ~$0.05/day
- Embeddings: ~$0.002/day
- **Total**: ~$0.30/day per active agent

## Summary

✅ **3 Active Models** in production:
- GPT-5 (main reasoning)
- GPT-5 Nano (fast extraction)
- Text Embedding 3 Small (semantic search)

✅ **Cost Tracking Updated** with correct pricing:
- GPT-5: $0.25/$2.00 per 1M tokens
- GPT-5 Nano: $0.05/$0.40 per 1M tokens
- Embeddings: $0.02 per 1M tokens

✅ **100% Token Tracking** across all 16 AI functions

✅ **No GPT-4 Models** in active use (legacy definitions removed from cost tracking)