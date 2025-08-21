# Project Structure - Real Estate AI Agent Web Application

## Root Directory Organization

```
REAL-ESTATE-WEB-APP/
│
├── database/                 # All database-related files
│   ├── migrations/          # Schema migration files (9 files)
│   ├── schemas/             # Table definitions (7 files)
│   ├── scripts/             # Admin and utility SQL scripts (30 files)
│   └── seeds/               # Seed data for development
│
├── tests/                   # Organized test suites
│   ├── unit/                # Unit tests for individual components
│   ├── integration/         # Integration tests (113 files)
│   ├── e2e/                 # End-to-end tests
│   ├── api/                 # API endpoint tests (18 files)
│   ├── frontend/            # Frontend component tests (10 files)
│   └── backend/             # Backend service tests (205 files)
│
├── scripts/                 # Utility and automation scripts
│   ├── data-generation/     # Test data generation (22 files)
│   ├── setup/               # Setup and configuration (9 files)
│   ├── utilities/           # Maintenance utilities (13 files)
│   └── automation/          # Automation scripts (2 files)
│
├── BACKEND/                 # Express.js backend server
│   ├── server.js            # Main server entry point
│   ├── middleware/          # Authentication and middleware
│   ├── services/            # Business logic services
│   ├── utils/               # Utility functions
│   └── package.json         # Backend dependencies
│
├── FRONTEND/                # Frontend applications
│   ├── frontend-application/  # Primary Next.js 15 app (formerly financial-dashboard-2)
│   │   ├── app/             # Next.js app directory
│   │   ├── components/      # React components
│   │   ├── contexts/        # React contexts
│   │   ├── lib/             # Utility libraries
│   │   └── public/          # Static assets
│   │
│   ├── api-agent[1-4]/      # API-focused agent implementations
│   ├── frontend-agent[1-6]/ # Various frontend implementations
│   └── frontend-arch-agent[1-3]/ # Architecture-focused implementations
│
├── Documentation/           # Project documentation
│   ├── *.md files          # Various documentation files
│   └── README files        # Directory-specific documentation
│
└── Configuration Files
    ├── package.json         # Root package configuration
    ├── .env                 # Environment variables
    └── CLAUDE.md           # AI assistant instructions
```

## Quick Navigation

### Database Operations
- **Migrations**: `database/migrations/`
- **Schemas**: `database/schemas/`
- **Admin Scripts**: `database/scripts/`

### Testing
- **Run all tests**: `npm test`
- **API tests**: `tests/api/`
- **Frontend tests**: `tests/frontend/`
- **Backend tests**: `tests/backend/`
- **Integration tests**: `tests/integration/`

### Scripts & Utilities
- **Generate test data**: `scripts/data-generation/`
- **Setup environment**: `scripts/setup/`
- **Fix issues**: `scripts/utilities/`
- **Automation**: `scripts/automation/`

### Development
- **Backend server**: `BACKEND/server.js`
- **Frontend app**: `FRONTEND/frontend-application/`
- **Start backend**: `npm run server` (from BACKEND/)
- **Start frontend**: `npm run dev` (from FRONTEND/frontend-application/)

## File Count Summary

- **SQL Files**: 46 total
  - Migrations: 9
  - Schemas: 7
  - Scripts: 30
  
- **Test Files**: 356 total
  - Integration: 113
  - Backend: 205
  - API: 18
  - Frontend: 10
  - Others: 10

- **Script Files**: 46 total
  - Data Generation: 22
  - Setup: 9
  - Utilities: 13
  - Automation: 2

## Key Commands

```bash
# Backend Development
cd BACKEND && npm run server

# Frontend Development
cd FRONTEND/frontend-application && npm run dev

# Run Tests
npm test                     # All tests
node tests/api/[test].js    # Specific test

# Database Operations
# Use Supabase MCP for SQL operations

# Generate Test Data
node scripts/data-generation/create-test-users.js

# Clean Test Data
node scripts/utilities/clean-test-data.js
```

## Environment Setup

1. Install dependencies:
   ```bash
   npm install          # Root dependencies
   cd BACKEND && npm install
   cd FRONTEND/frontend-application && npm install
   ```

2. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Set Supabase credentials
   - Set OpenAI API key

3. Run migrations:
   ```bash
   # Use Supabase dashboard or MCP
   ```

4. Start development servers:
   ```bash
   # Terminal 1: Backend
   cd BACKEND && npm run server
   
   # Terminal 2: Frontend
   cd FRONTEND/frontend-application && npm run dev
   ```