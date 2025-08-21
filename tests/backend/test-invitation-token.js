const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkInvitation() {
  const token = '88c02cf96d1124ada21a872db71de2c28d5f22c63364b8859ab14d7d1fc7c67a';
  
  console.log('Checking invitation with token:', token);
  
  // Check the invitation
  const { data: invite, error } = await supabase
    .from('organization_invites')
    .select(`
      *,
      organizations:organization_id (
        id,
        name
      )
    `)
    .eq('token', token)
    .single();
  
  if (error) {
    console.error('Error fetching invitation:', error);
  } else {
    console.log('Invitation found:', invite);
    
    // Check if it's expired
    const now = new Date();
    const expiresAt = new Date(invite.expires_at);
    console.log('Current time:', now.toISOString());
    console.log('Expires at:', expiresAt.toISOString());
    console.log('Is expired?', now > expiresAt);
    console.log('Status:', invite.status);
  }
  
  process.exit(0);
}

checkInvitation();