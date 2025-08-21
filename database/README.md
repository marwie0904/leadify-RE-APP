# Database Directory

This directory contains all database-related files organized by purpose.

## Structure

### `/migrations`
Database migration files that modify schema structure
- `schema-migration.sql` - Main schema migrations
- `simplified-migration.sql` - Simplified migration scripts

### `/schemas`
Database schema definitions and table structures
- Table creation scripts
- Schema documentation

### `/scripts`
Database utility and administrative scripts
- `GRANT_ADMIN_ACCESS.sql` - Admin access grants
- `CHECK_ADMIN_ACCESS.sql` - Access verification scripts
- `add-admin-user.sql` - Admin user creation
- `setup-admin-access.sql` - Admin setup scripts

### `/seeds`
Seed data for development and testing
- Sample data scripts
- Test data generation

## Usage

To run migrations:
```bash
# Use Supabase MCP or run directly through Supabase dashboard
```

To execute scripts:
```bash
# Use appropriate database client or Supabase interface
```