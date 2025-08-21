# Real Estate AI Agent - Frontend Testing Guide

## Overview

This testing suite provides comprehensive frontend testing using Playwright to validate the Real Estate AI Agent application. It tests actual user interactions, token tracking, lead management, and conversation flows.

## Prerequisites

1. **Start Backend Server** (Port 3001):
   ```bash
   cd BACKEND
   npm run server
   ```

2. **Start Frontend Server** (Port 3000):
   ```bash
   cd FRONTEND/financial-dashboard-2
   npm run dev
   ```

3. **Install Dependencies**:
   ```bash
   npm install playwright @supabase/supabase-js dotenv uuid
   ```

## Test Scripts

### 1. Sample UI Validation Test (Run First!)
**Command**: `npm run test:sample`

This script validates that all UI elements are correctly identified before running full tests:
- Creates a test organization, user, and AI agent
- Tests login flow at `/auth` page
- Validates navigation sidebar elements
- Tests Agents page and agent cards
- Opens and tests Chat Preview modal
- Verifies Conversations page
- Automatically cleans up test data after completion

**Output**: 
- Screenshots: `sample-*.png`
- Pass/fail report for each UI element

### 2. Full Frontend Test Suite (80 Conversations)
**Command**: `npm run test:frontend:full`

Creates 20 unique conversations for each of the 4 AI agents (80 total):
- **Per Agent**:
  - 4 Hot lead conversations (BANT 85-95)
  - 4 Warm lead conversations (BANT 60-75)
  - 4 Cold lead conversations (BANT 20-40)
  - 4 Non-responsive conversations (BANT 10-20)
  - 4 Handoff request conversations

**Key Features**:
- Creates NEW conversation for each test
- Properly closes conversations between tests
- Tracks actual token usage through API calls
- Verifies lead creation and BANT scoring
- Takes screenshots of each conversation

### 3. Frontend Display Verification
**Command**: `npm run test:verify`

Verifies all pages display test data correctly:
- Dashboard
- Conversations
- Leads
- AI Analytics (token usage)
- Agents
- Organizations
- Issues
- Feature Requests

### 4. Quick Test
**Command**: `npm run test:quick`

Basic functionality test for quick validation.

## Test Workflow

### Recommended Testing Order:

1. **First Time Setup**:
   ```bash
   # 1. Run sample test to validate UI elements
   npm run test:sample
   
   # 2. If sample test passes, run full test
   npm run test:frontend:full
   
   # 3. Verify all data is displayed
   npm run test:verify
   ```

2. **Complete Test Suite**:
   ```bash
   npm run test:complete
   ```
   This runs both frontend tests and verification.

## Understanding the Results

### Sample Test Results
```
✅ Data Creation      - Test org/user/agent created
✅ Login Flow         - Auth page working correctly
✅ Navigation         - Sidebar links found
✅ Agents Page        - Agent cards displayed
✅ Chat Preview       - Chat modal opens and works
✅ Conversations Page - Conversations list works
```

### Full Test Results
```
Per Agent (×4):
  Hot: 4/4          - High-value leads created
  Warm: 4/4         - Medium interest leads
  Cold: 4/4         - Low interest leads  
  Non-Responsive: 4/4 - Minimal engagement
  Handoff: 4/4      - Human agent requests

Database Verification:
  ✅ 80 conversations created
  ✅ ~400 messages sent
  ✅ 64 leads generated
  ✅ 16 handoff requests
  ✅ Token usage tracked
```

## Key UI Elements Tested

### Auth Page (`/auth`)
- Email input: `input[type="email"]`
- Password input: `input[type="password"]`
- Sign in button: `button:has-text("Sign in")`

### Dashboard (`/dashboard`)
- Navigation sidebar with links
- Dashboard content area

### Agents Page (`/agents`)
- Agent cards showing agent names
- Chat Preview button
- Agent configuration options

### Chat Preview Modal
- Message input: `textarea` or `input[placeholder*="message"]`
- Send button: `button:has-text("Send")`
- Message display area

### Conversations Page (`/conversations`)
- Conversation list
- Individual conversation items
- Message history

## Troubleshooting

### Common Issues:

1. **"Backend server not running"**
   - Start backend: `cd BACKEND && npm run server`

2. **"Frontend server not running"**
   - Start frontend: `cd FRONTEND/financial-dashboard-2 && npm run dev`

3. **"Login failed"**
   - Check if user exists in database
   - Verify Supabase auth is working
   - Check `.env` file configuration

4. **"Chat Preview button not found"**
   - Run sample test first to identify correct selectors
   - Check if agent was created successfully
   - Verify user has proper permissions

5. **"No conversations created"**
   - Check API endpoints are responding
   - Verify token usage endpoint is working
   - Check browser console for errors

### Debug Mode

To run tests with more visibility:
```javascript
// In test scripts, change:
headless: false  // Shows browser
slowMo: 1000    // Slower actions
```

## Screenshots

All tests save screenshots:
- `sample-*.png` - Sample test screenshots
- `conversation-*.png` - Individual conversations
- `verify-*.png` - Page verification screenshots

## Database Verification

After running tests, verify data in Supabase:

```sql
-- Check conversations
SELECT COUNT(*) FROM conversations;

-- Check messages
SELECT COUNT(*), role FROM messages GROUP BY role;

-- Check leads
SELECT COUNT(*), status FROM leads GROUP BY status;

-- Check token usage
SELECT SUM(total_tokens), SUM(cost) FROM ai_token_usage;

-- Check handoffs
SELECT COUNT(*) FROM conversation_handoffs;
```

## Clean Up Test Data

To remove all test data:
```bash
node clean-test-data-fixed.js
```

## API Endpoints Tested

- `POST /api/chat` - Main conversation endpoint
- `GET /api/agents` - Agent listing
- `GET /api/conversations` - Conversation history
- `GET /api/leads` - Lead management
- `GET /api/ai-analytics` - Token usage tracking

## Important Notes

1. **Token Tracking**: The full test suite makes real API calls to track actual token usage
2. **Conversation Isolation**: Each test creates a NEW conversation, not reusing existing ones
3. **BANT Scoring**: Different conversation types trigger different BANT scores
4. **Handoff System**: Some conversations trigger human agent handoff requests
5. **Real Frontend Testing**: Uses Playwright to interact with actual UI, not just database

## Support

If tests fail:
1. Run sample test first: `npm run test:sample`
2. Check server logs for errors
3. Verify database schema matches expectations
4. Review screenshots for visual debugging
5. Check browser console for JavaScript errors