require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: 'auth' } }
);

const userId = 'e3f1b629-8f11-40bb-a840-94b3921db8a0'; // Replace with your test user ID if needed

(async () => {
  console.log('[DEBUG][ENV] SUPABASE_URL:', process.env.SUPABASE_URL);
  console.log('[DEBUG][ENV] SUPABASE_SERVICE_ROLE_KEY]:', process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log('[DEBUG][TEST] Querying user ID:', userId);
  const result = await supabaseAdmin.auth.admin.getUserById(userId);
  console.log('[DEBUG][RESULT]', result);
})(); 