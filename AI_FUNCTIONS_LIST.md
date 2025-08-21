# Complete List of AI Functions in server.js

Based on analysis of the codebase, here are all the AI functions that make OpenAI API calls:

## 1. **masterIntentClassifier** (Line ~4500)
- **Purpose**: Classifies user intent (BANT, Estimation, General, etc.)
- **Model**: gpt-3.5-turbo
- **Operation Type**: intent_classification
- **Token Tracking**: Currently tracks correctly

## 2. **extractBANTInfo** (Line ~5000)
- **Purpose**: Extracts BANT information from conversation
- **Model**: gpt-4 or gpt-4o-mini
- **Operation Type**: bant_extraction
- **Token Tracking**: Currently tracks correctly

## 3. **normalizeBANTAI** (Line ~5500)
- **Purpose**: Normalizes extracted BANT data
- **Model**: gpt-4o-mini
- **Operation Type**: bant_normalization
- **Token Tracking**: Currently tracks correctly

## 4. **scoreLeadWithAI** (Line ~5800)
- **Purpose**: Scores leads based on BANT criteria
- **Model**: gpt-4o-mini
- **Operation Type**: lead_scoring
- **Token Tracking**: Currently tracks correctly

## 5. **extractContactInfo** (Line ~5300)
- **Purpose**: Extracts contact information from messages
- **Model**: gpt-4o-mini
- **Operation Type**: contact_extraction
- **Token Tracking**: Currently tracks correctly

## 6. **generateEmbedding** (Line ~290)
- **Purpose**: Creates embeddings for semantic search
- **Model**: text-embedding-3-small
- **Operation Type**: embedding_generation
- **Token Tracking**: NOT tracked

## 7. **General Chat Response** (Line ~6700)
- **Purpose**: Generates general chat responses with context
- **Model**: gpt-4
- **Operation Type**: chat_reply
- **Token Tracking**: NOW FIXED (was missing)

## 8. **BANT Personalized Response** (Line ~6900)
- **Purpose**: Generates personalized BANT responses
- **Model**: gpt-4
- **Operation Type**: chat_reply
- **Token Tracking**: NOW FIXED (was missing)

## 9. **BANT Fixed Response** (Line ~7300)
- **Purpose**: Generates structured BANT questions
- **Model**: N/A (template-based)
- **Operation Type**: chat_reply
- **Token Tracking**: NOW FIXED (was missing)

## 10. **Fallback Chat Response** (Line ~7400)
- **Purpose**: Fallback response when no context available
- **Model**: gpt-4
- **Operation Type**: chat_reply
- **Token Tracking**: NOW FIXED (was missing)

## 11. **callAIWithFallback** (Line ~350)
- **Purpose**: Main AI call with error handling
- **Model**: gpt-4
- **Operation Type**: Various
- **Token Tracking**: Partially tracked (missing failed attempts)

## 12. **Estimation Flow Response** (Line ~6800)
- **Purpose**: Handles property estimation conversations
- **Model**: gpt-4
- **Operation Type**: estimation_reply
- **Token Tracking**: NOT tracked

## Test Order for Token Verification

Let's test these functions in this order:

1. **masterIntentClassifier** - Simple intent classification
2. **extractBANTInfo** - BANT extraction from message
3. **normalizeBANTAI** - BANT normalization
4. **scoreLeadWithAI** - Lead scoring
5. **extractContactInfo** - Contact extraction
6. **generateEmbedding** - Embedding generation
7. **General Chat Response** - Full chat response
8. **BANT Response** - BANT-specific response
9. **Estimation Response** - Estimation flow
10. **callAIWithFallback** - Error handling test