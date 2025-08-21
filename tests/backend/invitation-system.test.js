/**
 * Comprehensive Test Suite for Organization Invitation System
 * Tests all aspects of the invitation flow including edge cases and error scenarios
 */

const request = require('supertest');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Mock Supabase client
jest.mock('@supabase/supabase-js');

describe('Organization Invitation System', () => {
  let app;
  let supabaseMock;
  let supabaseServiceRoleMock;
  
  beforeAll(() => {
    // Set up environment variables
    process.env.SUPABASE_URL = 'http://localhost:54321';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    process.env.JWT_SECRET = 'test-jwt-secret-32-characters-long';
    process.env.FRONTEND_URL = 'http://localhost:3000';
    process.env.RESEND_API_KEY = '';
    process.env.RESEND_FROM_EMAIL = '';
    
    // Create mocked Supabase clients
    supabaseMock = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      auth: {
        signInWithPassword: jest.fn(),
        signUp: jest.fn(),
      }
    };
    
    supabaseServiceRoleMock = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      auth: {
        admin: {
          createUser: jest.fn(),
          listUsers: jest.fn(),
          updateUserById: jest.fn(),
          generateLink: jest.fn()
        },
        signInWithPassword: jest.fn()
      }
    };
    
    // Mock createClient to return our mocked clients
    createClient.mockImplementation((url, key, options) => {
      if (options?.auth?.autoRefreshToken === false) {
        return supabaseServiceRoleMock;
      }
      return supabaseMock;
    });
    
    // Import app after mocks are set up
    app = require('../server');
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('POST /api/organization/invite', () => {
    const validAuthHeaders = {
      'Authorization': 'Bearer valid-token'
    };
    
    const mockUser = {
      id: 'user-123',
      email: 'admin@example.com'
    };
    
    beforeEach(() => {
      // Mock requireAuth middleware
      jest.spyOn(app, 'requireAuth').mockImplementation((req, res, next) => {
        req.user = mockUser;
        next();
      });
    });
    
    it('should create invitation for new user with correct URL', async () => {
      // Mock checking user permissions
      supabaseMock.single.mockResolvedValueOnce({
        data: { role: 'admin' },
        error: null
      });
      
      // Mock checking existing member
      supabaseMock.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      });
      
      // Mock checking existing invite
      supabaseMock.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      });
      
      // Mock creating invitation
      const mockInvite = {
        id: 'invite-123',
        token: 'test-token-123',
        email: 'newuser@example.com',
        organization_id: 'org-123',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };
      
      supabaseServiceRoleMock.single.mockResolvedValueOnce({
        data: mockInvite,
        error: null
      });
      
      // Mock getting organization name
      supabaseMock.single.mockResolvedValueOnce({
        data: { name: 'Test Organization' },
        error: null
      });
      
      const response = await request(app)
        .post('/api/organization/invite')
        .set(validAuthHeaders)
        .send({
          email: 'newuser@example.com',
          organizationId: 'org-123',
          role: 'member'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Invitation created successfully');
      expect(response.body.inviteLink).toContain('http://localhost:3000/auth/invite?token=');
      expect(response.body.inviteLink).not.toContain('localhost:3001');
    });
    
    it('should reject invitation from non-admin users', async () => {
      // Mock user with member role
      supabaseMock.single.mockResolvedValueOnce({
        data: { role: 'member' },
        error: null
      });
      
      const response = await request(app)
        .post('/api/organization/invite')
        .set(validAuthHeaders)
        .send({
          email: 'newuser@example.com',
          organizationId: 'org-123',
          role: 'member'
        });
      
      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Only owners and admins can invite users');
    });
  });
  
  describe('GET /api/auth/invite/verify', () => {
    it('should verify valid invitation token with organization data', async () => {
      const mockInvite = {
        id: 'invite-123',
        email: 'test@example.com',
        organization_id: 'org-123',
        token: 'valid-token',
        status: 'pending',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        organizations: {
          id: 'org-123',
          name: 'Test Organization'
        }
      };
      
      // Mock invitation query with organization join
      supabaseMock.single.mockResolvedValueOnce({
        data: mockInvite,
        error: null
      });
      
      // Mock user existence check
      supabaseServiceRoleMock.auth.admin.listUsers.mockResolvedValueOnce({
        data: { users: [] },
        error: null
      });
      
      const response = await request(app)
        .get('/api/auth/invite/verify')
        .query({ token: 'valid-token' });
      
      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
      expect(response.body.email).toBe('test@example.com');
      expect(response.body.organizationName).toBe('Test Organization');
      expect(response.body.userExists).toBe(false);
    });
    
    it('should detect existing users correctly', async () => {
      const mockInvite = {
        id: 'invite-123',
        email: 'existing@example.com',
        organization_id: 'org-123',
        token: 'valid-token',
        status: 'pending',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        organizations: {
          id: 'org-123',
          name: 'Test Organization'
        }
      };
      
      supabaseMock.single.mockResolvedValueOnce({
        data: mockInvite,
        error: null
      });
      
      // Mock user exists
      supabaseServiceRoleMock.auth.admin.listUsers.mockResolvedValueOnce({
        data: { 
          users: [{ email: 'existing@example.com', id: 'user-123' }]
        },
        error: null
      });
      
      const response = await request(app)
        .get('/api/auth/invite/verify')
        .query({ token: 'valid-token' });
      
      expect(response.status).toBe(200);
      expect(response.body.userExists).toBe(true);
    });
    
    it('should reject expired invitations', async () => {
      const mockInvite = {
        id: 'invite-123',
        email: 'test@example.com',
        organization_id: 'org-123',
        token: 'expired-token',
        status: 'pending',
        expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Past date
        organizations: {
          id: 'org-123',
          name: 'Test Organization'
        }
      };
      
      supabaseMock.single.mockResolvedValueOnce({
        data: mockInvite,
        error: null
      });
      
      const response = await request(app)
        .get('/api/auth/invite/verify')
        .query({ token: 'expired-token' });
      
      expect(response.status).toBe(400);
      expect(response.body.valid).toBe(false);
      expect(response.body.message).toContain('expired');
    });
  });
  
  describe('POST /api/auth/invite/accept', () => {
    it('should handle new user creation with auto-confirmation', async () => {
      const mockInvite = {
        id: 'invite-123',
        email: 'newuser@example.com',
        organization_id: 'org-123',
        token: 'valid-token',
        status: 'pending',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        role: 'member'
      };
      
      // Mock getting invitation
      supabaseMock.single.mockResolvedValueOnce({
        data: mockInvite,
        error: null
      });
      
      // Mock creating user with auto-confirmation
      const mockNewUser = {
        id: 'new-user-123',
        email: 'newuser@example.com',
        email_confirmed_at: new Date().toISOString(),
        user_metadata: {
          first_name: 'John',
          last_name: 'Doe'
        }
      };
      
      supabaseServiceRoleMock.auth.admin.createUser.mockResolvedValueOnce({
        data: { user: mockNewUser },
        error: null
      });
      
      // Mock signing in to get session
      const mockSession = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        user: mockNewUser
      };
      
      supabaseServiceRoleMock.auth.signInWithPassword.mockResolvedValueOnce({
        data: { session: mockSession, user: mockNewUser },
        error: null
      });
      
      // Mock adding to organization
      supabaseMock.single.mockResolvedValueOnce({
        data: {
          id: 'member-123',
          organization_id: 'org-123',
          user_id: 'new-user-123',
          role: 'member'
        },
        error: null
      });
      
      // Mock updating invitation status
      supabaseMock.eq.mockReturnThis();
      
      // Mock getting organization name
      supabaseMock.single.mockResolvedValueOnce({
        data: { name: 'Test Organization' },
        error: null
      });
      
      const response = await request(app)
        .post('/api/auth/invite/accept')
        .send({
          token: 'valid-token',
          password: 'SecurePassword123!',
          firstName: 'John',
          lastName: 'Doe',
          existingUser: false
        });
      
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Successfully joined organization');
      expect(response.body.token).toBe('new-access-token');
      expect(response.body.organization.name).toBe('Test Organization');
      expect(response.body.isNewUser).toBe(true);
      expect(response.body.requiresEmailConfirmation).toBe(false);
    });
    
    it('should handle existing user accepting invitation', async () => {
      const mockInvite = {
        id: 'invite-123',
        email: 'existing@example.com',
        organization_id: 'org-123',
        token: 'valid-token',
        status: 'pending',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        role: 'agent'
      };
      
      // Mock getting invitation
      supabaseMock.single.mockResolvedValueOnce({
        data: mockInvite,
        error: null
      });
      
      // Mock existing user sign in
      const mockExistingUser = {
        id: 'existing-user-123',
        email: 'existing@example.com',
        email_confirmed_at: '2024-01-01T00:00:00Z'
      };
      
      const mockSession = {
        access_token: 'existing-access-token',
        refresh_token: 'existing-refresh-token',
        user: mockExistingUser
      };
      
      supabaseMock.auth.signInWithPassword.mockResolvedValueOnce({
        data: { session: mockSession, user: mockExistingUser },
        error: null
      });
      
      // Mock adding to organization
      supabaseMock.single.mockResolvedValueOnce({
        data: {
          id: 'member-123',
          organization_id: 'org-123',
          user_id: 'existing-user-123',
          role: 'agent'
        },
        error: null
      });
      
      // Mock updating invitation
      supabaseMock.eq.mockReturnThis();
      
      // Mock getting organization name
      supabaseMock.single.mockResolvedValueOnce({
        data: { name: 'Test Organization' },
        error: null
      });
      
      const response = await request(app)
        .post('/api/auth/invite/accept')
        .send({
          token: 'valid-token',
          password: 'UserPassword123!',
          existingUser: true
        });
      
      expect(response.status).toBe(200);
      expect(response.body.isNewUser).toBe(false);
      expect(response.body.token).toBe('existing-access-token');
    });
    
    it('should handle null session gracefully', async () => {
      const mockInvite = {
        id: 'invite-123',
        email: 'newuser@example.com',
        organization_id: 'org-123',
        token: 'valid-token',
        status: 'pending',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        role: 'member'
      };
      
      // Mock getting invitation
      supabaseMock.single.mockResolvedValueOnce({
        data: mockInvite,
        error: null
      });
      
      // Mock user creation
      const mockNewUser = {
        id: 'new-user-123',
        email: 'newuser@example.com',
        email_confirmed_at: null // Not confirmed
      };
      
      // Mock signUp returning null session (email confirmation required)
      supabaseMock.auth.signUp.mockResolvedValueOnce({
        data: { 
          user: mockNewUser,
          session: null // This causes the original error
        },
        error: null
      });
      
      // Mock adding to organization
      supabaseMock.single.mockResolvedValueOnce({
        data: {
          id: 'member-123',
          organization_id: 'org-123',
          user_id: 'new-user-123',
          role: 'member'
        },
        error: null
      });
      
      // Mock organization name
      supabaseMock.single.mockResolvedValueOnce({
        data: { name: 'Test Organization' },
        error: null
      });
      
      const response = await request(app)
        .post('/api/auth/invite/accept')
        .send({
          token: 'valid-token',
          password: 'SecurePassword123!',
          firstName: 'John',
          lastName: 'Doe',
          existingUser: false
        });
      
      // Should not crash and should return success
      expect(response.status).toBe(200);
      expect(response.body.token).toBeNull();
      expect(response.body.requiresEmailConfirmation).toBe(true);
    });
    
    it('should reject invalid passwords for existing users', async () => {
      const mockInvite = {
        id: 'invite-123',
        email: 'existing@example.com',
        organization_id: 'org-123',
        token: 'valid-token',
        status: 'pending',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };
      
      supabaseMock.single.mockResolvedValueOnce({
        data: mockInvite,
        error: null
      });
      
      // Mock failed sign in
      supabaseMock.auth.signInWithPassword.mockResolvedValueOnce({
        data: null,
        error: { message: 'Invalid login credentials' }
      });
      
      const response = await request(app)
        .post('/api/auth/invite/accept')
        .send({
          token: 'valid-token',
          password: 'WrongPassword',
          existingUser: true
        });
      
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid credentials');
    });
  });
  
  describe('Edge Cases and Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      supabaseMock.single.mockRejectedValueOnce(new Error('Database connection failed'));
      
      const response = await request(app)
        .get('/api/auth/invite/verify')
        .query({ token: 'any-token' });
      
      expect(response.status).toBe(500);
      expect(response.body.valid).toBe(false);
      expect(response.body.message).toBe('Internal server error');
    });
    
    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/invite/accept')
        .send({
          token: 'valid-token'
          // Missing password
        });
      
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('required');
    });
    
    it('should handle duplicate organization membership gracefully', async () => {
      const mockInvite = {
        id: 'invite-123',
        email: 'existing@example.com',
        organization_id: 'org-123',
        token: 'valid-token',
        status: 'pending',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };
      
      supabaseMock.single.mockResolvedValueOnce({
        data: mockInvite,
        error: null
      });
      
      // Mock successful sign in
      supabaseMock.auth.signInWithPassword.mockResolvedValueOnce({
        data: {
          session: { access_token: 'token' },
          user: { id: 'user-123' }
        },
        error: null
      });
      
      // Mock duplicate membership error
      supabaseMock.single.mockResolvedValueOnce({
        data: null,
        error: {
          code: '23505',
          message: 'duplicate key value violates unique constraint'
        }
      });
      
      const response = await request(app)
        .post('/api/auth/invite/accept')
        .send({
          token: 'valid-token',
          password: 'Password123!',
          existingUser: true
        });
      
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('already a member');
    });
  });
});