# Scripts Directory

Utility and automation scripts for development, testing, and data management.

## Structure

### `/data-generation` (22 files)
Scripts for generating test and sample data
- `create-*.js` - Data creation scripts
- `generate-*.js` - Data generation utilities
- `populate-*.js` - Database population scripts

Example usage:
```bash
node scripts/data-generation/create-test-users.js
node scripts/data-generation/generate-test-data.js
```

### `/setup` (9 files)
Setup and configuration scripts
- `setup-*.js` - System setup scripts
- `apply-*.js` - Migration application scripts
- `run-*.js` - Execution scripts

Example usage:
```bash
node scripts/setup/setup-test-agents.js
node scripts/setup/run-migrations-direct.js
```

### `/utilities` (13 files)
Utility scripts for maintenance and fixes
- `fix-*.js` - Bug fix and correction scripts
- `verify-*.js` - Verification utilities
- `validate-*.js` - Validation scripts
- `clean-*.js` - Cleanup utilities
- `reset-*.js` - Reset scripts

Example usage:
```bash
node scripts/utilities/verify-all-data.js
node scripts/utilities/clean-test-data.js
```

### `/automation` (2 files)
Automation scripts for repetitive tasks
- `simulate-*.js` - Simulation scripts

Example usage:
```bash
node scripts/automation/simulate-conversations.js
```

## Common Operations

### Setting up test environment
```bash
node scripts/setup/setup-test-agents.js
node scripts/data-generation/create-test-users.js
```

### Cleaning up test data
```bash
node scripts/utilities/clean-test-data.js
```

### Verifying system state
```bash
node scripts/utilities/verify-all-data.js
```