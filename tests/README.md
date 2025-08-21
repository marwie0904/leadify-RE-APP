# Tests Directory

Organized test suite for the Real Estate AI Agent Web Application.

## Structure

### `/unit`
Unit tests for individual functions and components
- Isolated component testing
- Function-level tests

### `/integration`  
Integration tests for system components (113 files)
- Feature integration tests
- Module interaction tests
- Database integration tests

### `/e2e`
End-to-end tests simulating user workflows
- Complete user journey tests
- Browser automation tests

### `/api`
API endpoint tests (12 files)
- REST API testing
- Response validation
- Authentication tests

### `/frontend`
Frontend component and UI tests (10 files)
- React component tests
- UI interaction tests
- Frontend integration tests

### `/backend`
Backend service and logic tests (58 files)
- Server-side logic tests
- Database operation tests
- Business logic validation
- AI/BANT system tests
- Supabase integration tests

## Running Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm test tests/api/
npm test tests/frontend/
npm test tests/backend/

# Run individual test file
node tests/api/test-api-login.js
```

## Test Coverage

- API endpoints: Comprehensive coverage
- Frontend components: UI and interaction tests
- Backend services: Business logic and database operations
- Integration: Cross-component interaction testing