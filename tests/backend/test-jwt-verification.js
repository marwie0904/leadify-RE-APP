/**
 * Test JWT verification to debug authentication issue
 */

const jwt = require('jsonwebtoken');

// This is the token from localStorage (truncated for testing)
const testToken = "eyJhbGciOiJIUzI1NiIsImtpZCI6IjJmdk5DdHVVSmJzN2F3c2";

console.log("Testing JWT verification...");

// Try to decode without verification to see the payload
try {
  const decoded = jwt.decode(testToken);
  console.log("Decoded token (no verification):", decoded);
} catch (error) {
  console.log("Error decoding token:", error.message);
}

// Try to verify with the JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
try {
  const verified = jwt.verify(testToken, JWT_SECRET);
  console.log("Verified token:", verified);
} catch (error) {
  console.log("Error verifying token:", error.message);
}

// Test with a properly formed token
const testPayload = {
  sub: '4c984a9a-150e-4673-8192-17f80a7ef4d7',
  email: 'marwryyy@gmail.com',
  role: 'authenticated',
  user_metadata: {
    role: 'admin',
    full_name: 'Mar Wie Ang'
  }
};

const newToken = jwt.sign(testPayload, JWT_SECRET);
console.log("\nGenerated test token:", newToken);

// Verify the generated token
try {
  const verified = jwt.verify(newToken, JWT_SECRET);
  console.log("Verified generated token:", verified);
} catch (error) {
  console.log("Error verifying generated token:", error.message);
}