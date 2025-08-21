const fetch = require('node-fetch');

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function testFeatureRequestFlow() {
  console.log('🧪 Testing Feature Request Flow\n');
  console.log('================================\n');

  try {
    // Test 1: Create a feature request
    console.log('1️⃣ Testing POST /api/feature-requests');
    console.log('   Creating a new feature request...\n');
    
    const createResponse = await fetch(`${API_URL}/api/feature-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // In a real scenario, this would be a JWT token
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        requested_feature: 'Dark mode support for the entire application',
        reason: 'Many users work late at night and dark mode would reduce eye strain and improve user experience'
      })
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      console.log('   ❌ Failed to create feature request:', error);
      console.log('   Note: This might be due to authentication requirements.\n');
    } else {
      const createData = await createResponse.json();
      console.log('   ✅ Feature request created successfully!');
      console.log('   Response:', JSON.stringify(createData, null, 2), '\n');
    }

    // Test 2: Fetch all feature requests (admin endpoint)
    console.log('2️⃣ Testing GET /api/admin/feature-requests');
    console.log('   Fetching all feature requests...\n');
    
    const listResponse = await fetch(`${API_URL}/api/admin/feature-requests`, {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });

    if (!listResponse.ok) {
      const error = await listResponse.text();
      console.log('   ❌ Failed to fetch feature requests:', error);
      console.log('   Note: This endpoint requires admin privileges.\n');
    } else {
      const listData = await listResponse.json();
      console.log('   ✅ Feature requests fetched successfully!');
      console.log('   Total requests:', listData.data?.total || 0);
      
      if (listData.data?.requests && listData.data.requests.length > 0) {
        console.log('   First request:', JSON.stringify(listData.data.requests[0], null, 2), '\n');
        
        // Test 3: Update a feature request (if we have one)
        const requestId = listData.data.requests[0].id;
        console.log('3️⃣ Testing PUT /api/admin/feature-requests/:id');
        console.log(`   Updating feature request ${requestId}...\n`);
        
        const updateResponse = await fetch(`${API_URL}/api/admin/feature-requests/${requestId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token'
          },
          body: JSON.stringify({
            status: 'under_review',
            priority: 'high',
            admin_notes: 'This is a popular request, considering for next release'
          })
        });

        if (!updateResponse.ok) {
          const error = await updateResponse.text();
          console.log('   ❌ Failed to update feature request:', error, '\n');
        } else {
          const updateData = await updateResponse.json();
          console.log('   ✅ Feature request updated successfully!');
          console.log('   Updated data:', JSON.stringify(updateData, null, 2), '\n');
        }
      }
    }

    // Test 4: Check if backend server is running
    console.log('4️⃣ Testing Backend Health Check');
    const healthResponse = await fetch(`${API_URL}/api/health`);
    if (healthResponse.ok) {
      console.log('   ✅ Backend server is running at', API_URL);
    } else {
      console.log('   ❌ Backend server is not responding at', API_URL);
    }

    console.log('\n================================');
    console.log('✨ Feature Request Flow Test Complete!\n');
    console.log('Next steps:');
    console.log('1. Open http://localhost:3000/help in your browser');
    console.log('2. Click on "Request Feature" card to open the modal');
    console.log('3. Submit a feature request');
    console.log('4. Check http://localhost:3000/admin/feature-requests to manage requests');
    console.log('\nNote: Full functionality requires proper authentication setup.');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.log('\nMake sure:');
    console.log('1. Backend server is running on port 3001 (npm run server)');
    console.log('2. Frontend server is running on port 3000 (npm run dev)');
    console.log('3. Database migrations have been applied');
  }
}

// Run the test
testFeatureRequestFlow();