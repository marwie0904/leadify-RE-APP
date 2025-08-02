/**
 * Browser Console Test Script
 * 
 * Copy and paste this entire script into your browser console
 * while on the agents page to verify the organization ID fix
 */

(async function testOrganizationFix() {
  console.log('🔍 Testing Organization ID Fix...\n');
  
  // Get auth token from Supabase
  const getAuthToken = async () => {
    const supabase = window.supabase;
    if (!supabase) {
      console.error('❌ Supabase client not found');
      return null;
    }
    
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };
  
  const token = await getAuthToken();
  if (!token) {
    console.error('❌ No auth token found. Please make sure you are logged in.');
    return;
  }
  
  // Test profile endpoint
  console.log('1️⃣ Fetching profile data...');
  try {
    const profileResponse = await fetch('/api/settings/profile', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (profileResponse.ok || profileResponse.status === 304) {
      // For 304, we need to make a fresh request
      const freshResponse = await fetch('/api/settings/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      const profileData = await freshResponse.json();
      console.log('✅ Profile data received:', profileData);
      
      // Check organization fields
      console.log('\n📊 Organization fields:');
      console.log(`   organization_id: ${profileData.organization_id || 'NOT FOUND'}`);
      console.log(`   organizationId: ${profileData.organizationId || 'NOT FOUND'}`);
      console.log(`   hasOrganization: ${profileData.hasOrganization}`);
      console.log(`   role: ${profileData.role || 'NOT FOUND'}`);
      
      if (profileData.hasOrganization && profileData.organization_id) {
        console.log('\n✅ FIX CONFIRMED: Organization ID is properly returned from backend!');
        console.log(`   Your organization ID: ${profileData.organization_id}`);
      } else if (profileData.hasOrganization && !profileData.organization_id) {
        console.log('\n❌ ISSUE PERSISTS: hasOrganization is true but organization_id is empty');
      } else {
        console.log('\n⚠️  User does not have an organization');
      }
      
      // Also check the React context
      console.log('\n2️⃣ Checking React Auth Context...');
      
      // Try to access React DevTools
      const reactFiber = document.querySelector('#__next')?._reactRootContainer?._internalRoot?.current;
      if (reactFiber) {
        // Walk the fiber tree to find AuthContext
        let fiber = reactFiber;
        let authContextFound = false;
        
        while (fiber && !authContextFound) {
          if (fiber.memoizedProps?.value?.user) {
            const user = fiber.memoizedProps.value.user;
            console.log('✅ Found user in React context:', user);
            console.log(`   organizationId in React: ${user.organizationId || 'EMPTY'}`);
            console.log(`   hasOrganization in React: ${user.hasOrganization}`);
            authContextFound = true;
            
            if (user.hasOrganization && !user.organizationId) {
              console.log('\n❌ React context shows the issue: hasOrganization=true but organizationId is empty');
              console.log('💡 You may need to refresh the page for the context to update with the fix');
            }
          }
          fiber = fiber.child || fiber.sibling || fiber.return;
        }
        
        if (!authContextFound) {
          console.log('⚠️  Could not find Auth Context in React tree');
        }
      } else {
        console.log('⚠️  React DevTools not accessible');
      }
      
    } else {
      console.error('❌ Profile request failed:', profileResponse.status);
    }
  } catch (error) {
    console.error('❌ Error testing profile endpoint:', error);
  }
  
  // Test agents endpoint
  console.log('\n\n3️⃣ Testing agents endpoint...');
  try {
    const agentsResponse = await fetch('/api/agents', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (agentsResponse.ok) {
      const agentsData = await agentsResponse.json();
      const agents = Array.isArray(agentsData) ? agentsData : agentsData.agents || [];
      console.log(`✅ Agents endpoint working. Found ${agents.length} agent(s)`);
      
      if (agents.length > 0) {
        agents.forEach((agent, index) => {
          console.log(`   ${index + 1}. ${agent.name} (Status: ${agent.status})`);
        });
      }
    } else {
      console.error('❌ Agents request failed:', agentsResponse.status);
    }
  } catch (error) {
    console.error('❌ Error testing agents endpoint:', error);
  }
  
  // Final recommendation
  console.log('\n\n📋 Recommendations:');
  console.log('1. If you see organization_id in the profile response, the backend fix is working');
  console.log('2. If React context still shows empty organizationId, try:');
  console.log('   - Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)');
  console.log('   - Clear browser cache and reload');
  console.log('   - Log out and log back in');
  console.log('\nThe fix updates the backend to return organization_id in the profile endpoint.');
  console.log('Once you refresh, the frontend should properly receive and use this data.');
})();