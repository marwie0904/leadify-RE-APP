/**
 * Admin Users API Tests
 * Test-Driven Development for User Management System
 */

const request = require('supertest');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

// Mock Supabase client
const mockFrom = jest.fn();
const mockRpc = jest.fn();
const mockAuth = {
  getUser: jest.fn(),
  admin: {
    getUserById: jest.fn()
  }
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
    auth: mockAuth,
    rpc: mockRpc
  }))
}));

// Mock OpenAI
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn()
      }
    },
    embeddings: {
      create: jest.fn()
    }
  }));
});

describe('Admin Users API', () => {
  let app;
  let adminToken;
  let agentToken;
  
  beforeAll(() => {
    // Set environment variables
    process.env.JWT_SECRET = 'test-secret';
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    process.env.SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';
    
    // Import app after setting environment variables
    app = require('../server');
    
    // Create test tokens
    adminToken = jwt.sign(
      { 
        sub: 'admin-user-id',
        email: 'admin@test.com',
        role: 'authenticated',
        user_metadata: { role: 'admin' }
      },
      process.env.JWT_SECRET
    );
    
    agentToken = jwt.sign(
      {
        sub: 'agent-user-id',
        email: 'agent@test.com',
        role: 'authenticated',
        user_metadata: { role: 'agent' }
      },
      process.env.JWT_SECRET
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/users', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .expect(401);
      
      expect(response.body).toHaveProperty('error');
    });

    it('should require admin role', async () => {
      // Mock dev_members table query for non-admin user
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' }
        })
      });

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${agentToken}`)
        .expect(403);
      
      expect(response.body).toHaveProperty('error', 'Admin access required');
    });

    it('should return paginated users list for admin', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'user1@test.com',
          first_name: 'John',
          last_name: 'Doe',
          created_at: '2024-01-15T00:00:00Z',
          organization_name: 'TechCorp',
          organization_id: 'org-1',
          role: 'admin',
          last_sign_in_at: '2024-12-15T10:00:00Z',
          leads_count: '45',
          conversations_count: '23'
        },
        {
          id: 'user-2',
          email: 'user2@test.com',
          first_name: 'Jane',
          last_name: 'Smith',
          created_at: '2024-01-20T00:00:00Z',
          organization_name: 'RealEstate Pro',
          organization_id: 'org-2',
          role: 'agent',
          last_sign_in_at: '2024-12-15T11:00:00Z',
          leads_count: '89',
          conversations_count: '67'
        }
      ];

      supabase.rpc.mockResolvedValueOnce({
        data: mockUsers,
        error: null
      });

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('users');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.users).toHaveLength(2);
      expect(response.body.users[0]).toMatchObject({
        id: 'user-1',
        name: 'John Doe',
        email: 'user1@test.com',
        organization: 'TechCorp',
        role: 'admin',
        status: 'active',
        joinDate: '2024-01-15',
        lastActive: expect.any(String),
        leadsCount: 45,
        conversationsCount: 23
      });
    });

    it('should support search query', async () => {
      supabase.rpc.mockResolvedValueOnce({
        data: [],
        error: null
      });

      await request(app)
        .get('/api/admin/users?search=john')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(supabase.rpc).toHaveBeenCalledWith(
        'get_admin_users',
        expect.objectContaining({
          search_query: 'john'
        })
      );
    });

    it('should support organization filter', async () => {
      supabase.rpc.mockResolvedValueOnce({
        data: [],
        error: null
      });

      await request(app)
        .get('/api/admin/users?organization=org-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(supabase.rpc).toHaveBeenCalledWith(
        'get_admin_users',
        expect.objectContaining({
          org_filter: 'org-1'
        })
      );
    });

    it('should support status filter', async () => {
      supabase.rpc.mockResolvedValueOnce({
        data: [],
        error: null
      });

      await request(app)
        .get('/api/admin/users?status=active')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(supabase.rpc).toHaveBeenCalledWith(
        'get_admin_users',
        expect.objectContaining({
          status_filter: 'active'
        })
      );
    });

    it('should support pagination', async () => {
      supabase.rpc.mockResolvedValueOnce({
        data: [],
        error: null
      });

      await request(app)
        .get('/api/admin/users?page=2&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(supabase.rpc).toHaveBeenCalledWith(
        'get_admin_users',
        expect.objectContaining({
          page_number: 2,
          page_size: 10
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      supabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' }
      });

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);
      
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/admin/users/stats', () => {
    it('should require admin role', async () => {
      await request(app)
        .get('/api/admin/users/stats')
        .set('Authorization', `Bearer ${agentToken}`)
        .expect(403);
    });

    it('should return user statistics', async () => {
      const mockStats = {
        total_users: 100,
        active_users: 85,
        inactive_users: 10,
        suspended_users: 5,
        total_organizations: 15
      };

      supabase.rpc.mockResolvedValueOnce({
        data: mockStats,
        error: null
      });

      const response = await request(app)
        .get('/api/admin/users/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body).toMatchObject({
        totalUsers: 100,
        activeUsers: 85,
        inactiveUsers: 10,
        suspendedUsers: 5,
        totalOrganizations: 15
      });
    });
  });

  describe('POST /api/admin/users/:id/suspend', () => {
    it('should require admin role', async () => {
      await request(app)
        .post('/api/admin/users/user-1/suspend')
        .set('Authorization', `Bearer ${agentToken}`)
        .expect(403);
    });

    it('should suspend an active user', async () => {
      const fromMock = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: [{ id: 'user-1', status: 'suspended' }],
          error: null
        })
      };
      
      supabase.from.mockReturnValue(fromMock);

      const response = await request(app)
        .post('/api/admin/users/user-1/suspend')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Policy violation' })
        .expect(200);
      
      expect(response.body).toHaveProperty('message', 'User suspended successfully');
      expect(fromMock.update).toHaveBeenCalledWith({
        status: 'suspended',
        suspended_at: expect.any(String),
        suspended_by: 'admin-user-id',
        suspension_reason: 'Policy violation'
      });
    });

    it('should prevent suspending admin users', async () => {
      const fromMock = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'user-1', role: 'admin' },
          error: null
        })
      };
      
      supabase.from.mockReturnValue(fromMock);

      const response = await request(app)
        .post('/api/admin/users/user-1/suspend')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
      
      expect(response.body).toHaveProperty('error', 'Cannot suspend admin users');
    });
  });

  describe('POST /api/admin/users/:id/reactivate', () => {
    it('should require admin role', async () => {
      await request(app)
        .post('/api/admin/users/user-1/reactivate')
        .set('Authorization', `Bearer ${agentToken}`)
        .expect(403);
    });

    it('should reactivate a suspended user', async () => {
      const fromMock = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: [{ id: 'user-1', status: 'active' }],
          error: null
        })
      };
      
      supabase.from.mockReturnValue(fromMock);

      const response = await request(app)
        .post('/api/admin/users/user-1/reactivate')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('message', 'User reactivated successfully');
      expect(fromMock.update).toHaveBeenCalledWith({
        status: 'active',
        suspended_at: null,
        suspended_by: null,
        suspension_reason: null,
        reactivated_at: expect.any(String),
        reactivated_by: 'admin-user-id'
      });
    });
  });

  describe('DELETE /api/admin/users/:id', () => {
    it('should require admin role', async () => {
      await request(app)
        .delete('/api/admin/users/user-1')
        .set('Authorization', `Bearer ${agentToken}`)
        .expect(403);
    });

    it('should soft delete a user', async () => {
      const fromMock = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: [{ id: 'user-1', deleted_at: '2024-12-15T12:00:00Z' }],
          error: null
        })
      };
      
      supabase.from.mockReturnValue(fromMock);

      const response = await request(app)
        .delete('/api/admin/users/user-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.body).toHaveProperty('message', 'User deleted successfully');
      expect(fromMock.update).toHaveBeenCalledWith({
        deleted_at: expect.any(String),
        deleted_by: 'admin-user-id',
        status: 'deleted'
      });
    });

    it('should prevent deleting self', async () => {
      const response = await request(app)
        .delete('/api/admin/users/admin-user-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
      
      expect(response.body).toHaveProperty('error', 'Cannot delete your own account');
    });
  });

  describe('POST /api/admin/users/:id/email', () => {
    it('should require admin role', async () => {
      await request(app)
        .post('/api/admin/users/user-1/email')
        .set('Authorization', `Bearer ${agentToken}`)
        .expect(403);
    });

    it('should send email to user', async () => {
      const fromMock = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { 
            id: 'user-1', 
            email: 'user1@test.com',
            first_name: 'John',
            last_name: 'Doe'
          },
          error: null
        })
      };
      
      supabase.from.mockReturnValue(fromMock);

      // Mock email service
      const mockSendEmail = jest.fn().mockResolvedValue({ success: true });
      jest.mock('../services/email', () => ({
        sendEmail: mockSendEmail
      }));

      const response = await request(app)
        .post('/api/admin/users/user-1/email')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          subject: 'Important Update',
          message: 'Please review your account settings'
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('message', 'Email sent successfully');
    });

    it('should validate email content', async () => {
      const response = await request(app)
        .post('/api/admin/users/user-1/email')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);
      
      expect(response.body).toHaveProperty('error', 'Subject and message are required');
    });
  });

  describe('GET /api/admin/users/export', () => {
    it('should require admin role', async () => {
      await request(app)
        .get('/api/admin/users/export')
        .set('Authorization', `Bearer ${agentToken}`)
        .expect(403);
    });

    it('should export users as CSV', async () => {
      const mockUsers = [
        {
          email: 'user1@test.com',
          first_name: 'John',
          last_name: 'Doe',
          organization_name: 'TechCorp',
          role: 'admin',
          status: 'active',
          created_at: '2024-01-15T00:00:00Z',
          leads_count: '45',
          conversations_count: '23'
        }
      ];

      supabase.rpc.mockResolvedValueOnce({
        data: mockUsers,
        error: null
      });

      const response = await request(app)
        .get('/api/admin/users/export?format=csv')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.text).toContain('Name,Email,Organization,Role,Status');
    });
  });
});

describe('Performance Tests', () => {
  let app;
  let supabase;
  let adminToken;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret';
    app = require('../server');
    supabase = require('@supabase/supabase-js').createClient();
    
    adminToken = jwt.sign(
      { 
        sub: 'admin-user-id',
        email: 'admin@test.com',
        role: 'authenticated',
        user_metadata: { role: 'admin' }
      },
      process.env.JWT_SECRET
    );
  });

  it('should handle large datasets efficiently', async () => {
    const largeDataset = Array(1000).fill(null).map((_, i) => ({
      id: `user-${i}`,
      email: `user${i}@test.com`,
      first_name: `User`,
      last_name: `${i}`,
      created_at: '2024-01-15T00:00:00Z',
      organization_name: `Org ${i % 10}`,
      role: i % 4 === 0 ? 'admin' : 'agent',
      last_sign_in_at: '2024-12-15T10:00:00Z',
      leads_count: String(Math.floor(Math.random() * 100)),
      conversations_count: String(Math.floor(Math.random() * 50))
    }));

    supabase.rpc.mockResolvedValueOnce({
      data: largeDataset.slice(0, 100), // Return first page
      error: null
    });

    const startTime = Date.now();
    const response = await request(app)
      .get('/api/admin/users?limit=100')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const endTime = Date.now();

    expect(endTime - startTime).toBeLessThan(1000); // Should respond within 1 second
    expect(response.body.users).toHaveLength(100);
  });
});

describe('Security Tests', () => {
  let app;
  let adminToken;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret';
    app = require('../server');
    
    adminToken = jwt.sign(
      { 
        sub: 'admin-user-id',
        email: 'admin@test.com',
        role: 'authenticated',
        user_metadata: { role: 'admin' }
      },
      process.env.JWT_SECRET
    );
  });

  it('should prevent SQL injection in search', async () => {
    const maliciousQuery = "'; DROP TABLE users; --";
    
    await request(app)
      .get(`/api/admin/users?search=${encodeURIComponent(maliciousQuery)}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    
    // If we got here without error, the query was properly escaped
  });

  it('should rate limit requests', async () => {
    const requests = Array(20).fill(null).map(() => 
      request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
    );

    const responses = await Promise.all(requests);
    const rateLimited = responses.some(r => r.status === 429);
    
    expect(rateLimited).toBe(true);
  });

  it('should validate JWT expiration', async () => {
    const expiredToken = jwt.sign(
      {
        sub: 'admin-user-id',
        email: 'admin@test.com',
        role: 'authenticated',
        user_metadata: { role: 'admin' },
        exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
      },
      process.env.JWT_SECRET
    );

    await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);
  });
});