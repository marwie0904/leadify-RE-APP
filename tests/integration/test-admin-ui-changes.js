// Test script to verify admin UI changes
// This script simulates admin authentication and checks the UI

// Set test mode and admin credentials in localStorage
const setTestCredentials = () => {
  localStorage.setItem('test_mode', 'true');
  localStorage.setItem('admin_token', 'test-admin-token');
  localStorage.setItem('admin_user', JSON.stringify({
    id: 'admin-123',
    email: 'admin@test.com',
    role: 'admin'
  }));
  localStorage.setItem('auth_token', 'test-auth-token');
  console.log('Test credentials set');
};

// Run this in the browser console
setTestCredentials();