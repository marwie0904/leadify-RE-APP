# Database Migration Instructions

## Important: Manual Migration Required

The database schema needs to be updated to match the application requirements. Since Supabase RPC is not available for direct SQL execution from JavaScript, you need to run the migrations manually.

## Step 1: Run Database Migrations

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to the **SQL Editor** section

2. **Run the Migration Script**
   - Open the file `schema-migration.sql` in this directory
   - Copy the entire contents of the file
   - Paste it into the Supabase SQL Editor
   - Click **Run** to execute all migrations

3. **Verify Migration Success**
   - The script will add all missing columns to existing tables
   - It will create the `issues` table if it doesn't exist
   - Check for any error messages in the output
   - Most "column already exists" errors can be safely ignored

## Step 2: Populate Test Data

After running the migrations, populate the database with test data:

```bash
node populate-enhanced-test-data.js
```

This will create:
- 1 Test Organization (Leadify Real Estate AI)
- 5 Organization Members
- 3 AI Agents with BANT configurations
- 3 Conversations with token tracking
- 14 Messages with token counts
- 4 Leads with full BANT scores
- 5 Issues and feature requests

## Step 3: Verify Everything Works

Run the real backend tests to verify 100% success:

```bash
node test-real-backend-final.js
```

## Expected Results

After completing these steps, you should have:
- ✅ All database columns properly configured
- ✅ Test data populated in all tables
- ✅ 100% test success rate with real backend data
- ✅ All frontend pages displaying real data correctly

## Troubleshooting

If you encounter issues:

1. **Migration Errors**: Most "already exists" errors are safe to ignore
2. **Population Errors**: Check your Supabase credentials in `.env`
3. **Test Failures**: Ensure both frontend and backend servers are running

## Quick Test

To quickly verify everything is working:
1. Open http://localhost:3000/admin/organizations/9a24d180-a1fe-4d22-91e2-066d55679888
2. You should see the "Leadify Real Estate AI" organization
3. Navigate through all tabs to see real data