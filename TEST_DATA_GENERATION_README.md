# Test Data Generation & Simulation System

This comprehensive test data generation system creates realistic data and simulates user interactions for the Real Estate AI Agent Web Application.

## What It Creates

### Users (24 total)
- **4 Admin Users**: One per organization, with full admin privileges
- **20 Agent Users**: 5 per organization (including the admin)
- Email pattern: `admin@[org-domain].com`, `agent[1-4]@[org-domain].com`
- All users have password: `TestPassword123!`

### Organizations (4 total)
1. **Prime Residential Realty** - Focus on residential properties
2. **Commercial Property Experts** - Focus on commercial real estate
3. **Luxury Estate Partners** - Focus on high-end luxury properties
4. **Urban Rental Solutions** - Focus on rental properties

### AI Agents (4 total)
Each organization has one AI agent with:
- Unique BANT configurations
- Different scoring thresholds
- Specialized system prompts
- Custom greeting messages

### Issues & Feature Requests
- **8 Issues**: 2 per organization (various priorities and categories)
- **4 Feature Requests**: 1 per organization

### Simulated Conversations (80 total)
Each AI agent receives 20 conversations:
- 4 Hot/Priority leads (ready to buy, high budget)
- 4 Warm leads (interested, planning to buy soon)
- 4 Cold leads (just browsing, no timeline)
- 4 Non-responsive (minimal engagement)
- 4 Handoff situations (complex queries requiring human agent)

## Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers (if not already installed)
npx playwright install chromium
```

## Usage

### Quick Start - Complete Generation

```bash
# Run complete test data generation with visible browser simulation
npm run test-data:generate

# Run with headless browser (faster, no UI)
npm run test-data:generate:fast

# Run without conversation simulation (fastest, no conversations)
npm run test-data:generate:no-sim
```

### Individual Commands

```bash
# Clean existing test data (preserves dev users)
npm run test-data:clean

# Create users and organizations only
npm run test-data:users

# Create AI agents only
npm run test-data:agents

# Create issues and feature requests only
npm run test-data:issues

# Simulate conversations only (visible browser)
npm run test-data:simulate

# Simulate conversations (headless/faster)
npm run test-data:simulate:headless

# Verify all data was created successfully
npm run test-data:verify
```

## Process Overview

1. **Data Cleanup**: Removes all existing test data except dev users
2. **User Creation**: Creates auth users and user records
3. **Organization Setup**: Creates organizations with proper relationships
4. **AI Agent Configuration**: Sets up agents with unique BANT settings
5. **Issues & Features**: Populates support tickets and feature requests
6. **Conversation Simulation**: Uses Playwright to simulate real user chats
7. **Verification**: Validates all data was created successfully

## Timing

- **Without simulation**: ~2-3 minutes
- **With headless simulation**: ~15-20 minutes
- **With visible simulation**: ~25-30 minutes

## Login Credentials

### Admin Accounts
- `admin@primeresidential.com` - Prime Residential Realty Admin
- `admin@commercialproperty.com` - Commercial Property Experts Admin
- `admin@luxuryestates.com` - Luxury Estate Partners Admin
- `admin@urbanrentals.com` - Urban Rental Solutions Admin

### Sample Agent Accounts
- `agent1@primeresidential.com`
- `agent2@commercialproperty.com`
- `agent3@luxuryestates.com`
- `agent4@urbanrentals.com`

**Password for all accounts**: `TestPassword123!`

## Verification

After generation, the system automatically verifies:
- User count and roles
- Organization membership
- AI agent configurations
- Issue and feature request creation
- Conversation counts
- Lead classification
- Token usage tracking

## Features Tested

This test data allows comprehensive testing of:
- ✅ Multi-tenant organization system
- ✅ User authentication and roles
- ✅ AI agent conversations
- ✅ BANT lead qualification
- ✅ Lead scoring and classification
- ✅ Token usage tracking
- ✅ Issue reporting system
- ✅ Feature request management
- ✅ Human-in-loop handoff system
- ✅ Analytics and dashboards
- ✅ Real-time messaging

## Troubleshooting

### Browser Issues
If Playwright browsers aren't installed:
```bash
npx playwright install chromium
```

### Permission Issues
Make scripts executable:
```bash
chmod +x run-complete-test-data-generation.js
```

### Database Connection
Ensure `.env` file contains:
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Frontend Not Running
Start the frontend before simulation:
```bash
cd FRONTEND/financial-dashboard-2
npm run dev
```

## Customization

Edit the configuration files to customize:
- `create-users-orgs.js` - User and organization details
- `create-agents.js` - AI agent configurations and BANT settings
- `create-issues-features.js` - Issue and feature request templates
- `simulate-conversations.js` - Conversation scripts and patterns

## Notes

- The system preserves `hoangmanh.cu@gmail.com` and other dev users
- All timestamps use current time for realistic data
- Conversations are simulated through actual frontend for accurate token tracking
- BANT scores are calculated based on actual conversation content
- Each organization has different scoring thresholds to test variety