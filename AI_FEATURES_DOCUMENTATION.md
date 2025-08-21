# AI Features Documentation

## Overview
This document provides a comprehensive overview of all AI-powered features in the Real Estate AI Agent Web Application, detailing what each feature does and how AI models are being utilized.

## AI Models Currently in Use

### Primary Models
- **GPT-5 Mini** (`gpt-5-mini-2025-08-07`): Main conversation and chat responses
- **GPT-5 Nano** (`gpt-5-nano-2025-08-07`): Intent classification and quick decisions
- **GPT-4-turbo-preview**: Advanced BANT lead scoring analysis (migration to GPT-5 Mini planned)
- **text-embedding-ada-002**: Document embeddings for RAG
- **text-embedding-3-small**: Query embeddings for semantic search

### Model Pricing (per 1 Million Tokens)

| Model | Prompt (Input) | Cached Input | Completion (Output) | Monthly Savings vs GPT-4 |
|-------|----------------|--------------|---------------------|--------------------------|
| GPT-5 Mini | $0.25 | $0.025 | $2.00 | ~98% reduction |
| GPT-5 Nano | $0.05 | $0.005 | $0.40 | ~99% reduction |
| GPT-4 Turbo | $10.00 | N/A | $30.00 | Baseline |
| text-embedding-ada-002 | $0.10 | N/A | N/A | Standard |
| text-embedding-3-small | $0.02 | N/A | N/A | Standard |

## AI-Powered Features

### 1. **Intelligent Chat Conversations**
**Model**: GPT-5 Mini (`gpt-5-mini`)  
**Purpose**: Generate contextual responses to user inquiries about real estate properties  
**Cost Efficiency**: 98% reduction compared to GPT-4  
**What it does**:
- Maintains conversation context across multiple messages
- Provides property information based on agent's knowledge base
- Answers questions about neighborhoods, amenities, and property features
- Guides users through property inquiries naturally

### 2. **BANT Lead Qualification System**
**Model**: GPT-4-turbo-preview (scoring) + GPT-5 Mini (`gpt-5-mini`) (extraction)  
**Purpose**: Automatically qualify leads based on Budget, Authority, Need, and Timeline  
**What it does**:
- Analyzes entire conversation history to extract BANT information
- Scores leads on a 0-100 scale across each BANT dimension
- Classifies leads as Priority, Hot, Warm, or Cold
- Identifies missing qualification information
- Generates targeted follow-up questions to gather missing BANT data
- Tracks qualification progress in real-time

### 3. **Intent Classification**
**Model**: GPT-5 Nano (`gpt-5-nano`)  
**Purpose**: Quickly determine user intent from their messages  
**What it does**:
- Classifies messages into categories: Question, Request, Statement, or Other
- Identifies if user is asking property-specific questions
- Detects BANT-related responses from users
- Routes conversations to appropriate handling logic
- Enables fast, accurate response generation based on intent

### 4. **Property Estimation Flow**
**Model**: GPT-5 Mini (`gpt-5-mini`)  
**Purpose**: Guide users through property valuation process  
**What it does**:
- Manages multi-step estimation conversations
- Extracts property type (residential/commercial)
- Identifies payment preferences (cash/mortgage)
- Captures property details (location, size, features)
- Provides estimated property values
- Maintains context across the entire estimation flow

### 5. **Document Processing & RAG (Retrieval Augmented Generation)**
**Models**: text-embedding-ada-002 (documents) + text-embedding-3-small (queries)  
**Purpose**: Enable agents to answer questions based on uploaded documents  
**What it does**:
- Processes uploaded documents (PDFs, text files, etc.)
- Chunks documents into manageable segments
- Creates semantic embeddings for each chunk
- Stores embeddings in vector database
- Retrieves relevant context for user questions
- Augments AI responses with document-specific information

### 6. **Semantic Search**
**Model**: text-embedding-3-small  
**Purpose**: Find relevant information from agent's knowledge base  
**What it does**:
- Converts user queries into semantic embeddings
- Performs similarity search against document embeddings
- Returns most relevant document chunks
- Enables context-aware responses
- Improves answer accuracy with specific information

### 7. **Lead Scoring & Classification**
**Model**: GPT-5 Mini (`gpt-5-mini`)  
**Purpose**: Evaluate lead quality and prioritize follow-ups  
**What it does**:
- Analyzes conversation patterns and engagement levels
- Calculates numerical scores for lead quality
- Assigns classification labels (Priority/Hot/Warm/Cold)
- Identifies buying signals and urgency indicators
- Provides confidence scores for classifications
- Helps agents focus on high-value leads

### 8. **BANT Question Generation**
**Model**: GPT-5 Mini (`gpt-5-mini`)  
**Purpose**: Generate contextual questions to qualify leads  
**What it does**:
- Identifies missing BANT information
- Generates natural, conversational questions
- Adapts questions based on conversation context
- Follows a strategic qualification sequence
- Maintains professional tone while gathering information

### 9. **Contact Information Extraction**
**Model**: GPT-5 Mini (`gpt-5-mini`)  
**Purpose**: Automatically extract contact details from conversations  
**What it does**:
- Identifies names mentioned in conversation
- Extracts email addresses
- Captures phone numbers
- Detects company/organization names
- Updates lead records automatically
- Reduces manual data entry

### 10. **Conversation Summarization**
**Model**: GPT-5 Mini (`gpt-5-mini`)  
**Purpose**: Create concise summaries of lengthy conversations  
**What it does**:
- Generates brief overviews of conversation topics
- Highlights key discussion points
- Identifies action items and next steps
- Captures important property requirements
- Enables quick conversation review for agents

### 11. **Smart Response Suggestions**
**Model**: GPT-5 Mini (`gpt-5-mini`)  
**Purpose**: Provide agents with suggested responses  
**What it does**:
- Analyzes conversation context
- Generates multiple response options
- Adapts tone and style to match agent preferences
- Includes relevant property information
- Helps maintain consistent communication quality

### 12. **Multi-Source Conversation Handling**
**Purpose**: Unified AI responses across different channels  
**What it does**:
- Processes messages from website chat widgets
- Handles Facebook Messenger conversations
- Manages embedded chat interfaces
- Maintains context across channel switches
- Provides consistent AI personality across platforms

## Token Usage & Cost Tracking

### Tracked Operations
Each AI operation is tracked with the following metrics:
- **Prompt tokens**: Input tokens sent to the model
- **Completion tokens**: Output tokens generated by the model
- **Total cost**: Calculated based on model-specific pricing
- **Response time**: Milliseconds taken for AI processing
- **Operation type**: Classification of the AI task

### Operation Types
- `chat_reply`: Standard conversation responses
- `bant_extraction`: BANT information extraction
- `lead_scoring`: Lead quality scoring
- `intent_classification`: Message intent detection
- `estimation`: Property estimation flow

### Current Issues with Tracking
1. **Embedding operations** (text-embedding-ada-002) are not currently tracked
2. **Cost calculations** use outdated pricing models
3. **Model categories** need proper mapping for accurate cost calculation

## Performance Optimizations

### Caching Strategies
- Query embeddings are cached to reduce API calls
- Conversation context is maintained in memory
- BANT memory persists across sessions
- Estimation flow state is preserved

### Parallel Processing
- Multiple AI operations run concurrently when possible
- BANT extraction and contact extraction happen in parallel
- Background processing for non-critical operations

### Token Optimization
- System prompts are optimized for brevity
- Response length limits prevent excessive token usage
- Context windows are managed to stay within limits
- Unnecessary conversation history is trimmed

## Recent Improvements (August 2025)

### Model Upgrades
- **Migrated to GPT-5 Models**: Upgraded from GPT-4.1 variants to GPT-5 Mini and Nano
- **Cost Reduction**: Achieved 98-99% cost reduction compared to GPT-4
- **Performance**: Maintained or improved response quality with faster inference

### Enhanced Token Tracking
- **Embedding Operations**: Now tracking all text-embedding-ada-002 and text-embedding-3-small usage
- **Accurate Pricing**: Updated to exact per-million token pricing
- **Cached Token Support**: Added support for cached input pricing (90% discount)
- **Input Token Tracking**: Separate tracking for embedding model input tokens
- **Real-time Cost Calculation**: Accurate cost tracking for all AI operations

### Database Enhancements
- **Migration Support**: Automated migration of historical data to new model names
- **Cost Recalculation**: Historical costs updated with new pricing structure
- **Performance Indexes**: Added indexes for cached and input token queries
- **Cost Savings View**: New database view for analyzing GPT-5 cost savings

## Future Improvements Needed

1. **Token Tracking Enhancement**
   ✅ Add tracking for embedding operations (COMPLETED)
   ✅ Update pricing to current model costs (COMPLETED)
   - Implement per-organization token budgets

2. **Model Optimization**
   - Consider using GPT-4o-mini for cost savings
   - Evaluate performance vs. cost trade-offs
   - Implement model selection based on task complexity

3. **Feature Additions**
   - Voice conversation transcription and analysis
   - Multilingual support
   - Advanced property recommendation engine
   - Predictive lead scoring

4. **Performance Improvements**
   - Implement response streaming for real-time feel
   - Add result caching for common queries
   - Optimize embedding search algorithms

## Security & Privacy Considerations

- All AI operations are logged for audit purposes
- Personal information is redacted in logs
- Conversations are isolated by organization
- Token usage is tracked per organization for billing
- No training on customer data
- Compliance with data protection regulations