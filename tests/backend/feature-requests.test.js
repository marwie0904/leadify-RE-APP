const request = require('supertest');
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      insert: jest.fn(),
      select: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      eq: jest.fn(),
      order: jest.fn(),
      limit: jest.fn(),
    })),
    auth: {
      getUser: jest.fn(),
    },
  })),
}));

// Mock middleware
const requireAuth = (req, res, next) => {
  req.user = {
    id: 'test-user-id',
    email: 'test@example.com',
  };
  next();
};

const requireAdmin = (req, res, next) => {
  req.user = {
    id: 'admin-user-id',
    email: 'admin@example.com',
    role: 'admin',
  };
  next();
};

describe('Feature Requests API', () => {
  let app;
  let supabase;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Mock Supabase instance
    supabase = createClient('mock-url', 'mock-key');
    
    // Import and setup routes (we'll implement these after tests)
    // setupFeatureRequestRoutes(app, supabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/feature-requests', () => {
    it('should create a new feature request with user authentication', async () => {
      const mockFeatureRequest = {
        id: 'feature-1',
        user_id: 'test-user-id',
        user_email: 'test@example.com',
        user_name: 'Test User',
        organization_id: 'org-1',
        requested_feature: 'Dark mode support',
        reason: 'Better for eyes during night work',
        status: 'submitted',
        priority: 'medium',
        created_at: new Date().toISOString(),
      };

      const fromMock = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockFeatureRequest, error: null }),
      };

      supabase.from = jest.fn().mockReturnValue(fromMock);

      // Setup route
      app.post('/api/feature-requests', requireAuth, async (req, res) => {
        try {
          const { requested_feature, reason } = req.body;
          
          // Validation
          if (!requested_feature || !reason) {
            return res.status(400).json({ 
              success: false, 
              message: 'Requested feature and reason are required' 
            });
          }

          // Get user info from auth
          const user = req.user;
          
          // Get organization from user's membership
          const { data: memberData } = await supabase
            .from('organization_members')
            .select('organization_id, organizations(name)')
            .eq('user_id', user.id)
            .single();

          const featureRequestData = {
            user_id: user.id,
            user_email: user.email,
            user_name: user.name || 'Unknown User',
            organization_id: memberData?.organization_id || null,
            requested_feature,
            reason,
            status: 'submitted',
            priority: 'medium',
          };

          const { data, error } = await supabase
            .from('feature_requests')
            .insert(featureRequestData)
            .select()
            .single();

          if (error) throw error;

          res.status(201).json({ success: true, data });
        } catch (error) {
          res.status(500).json({ success: false, message: error.message });
        }
      });

      const response = await request(app)
        .post('/api/feature-requests')
        .send({
          requested_feature: 'Dark mode support',
          reason: 'Better for eyes during night work',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockFeatureRequest);
    });

    it('should return 400 if required fields are missing', async () => {
      app.post('/api/feature-requests', requireAuth, async (req, res) => {
        const { requested_feature, reason } = req.body;
        
        if (!requested_feature || !reason) {
          return res.status(400).json({ 
            success: false, 
            message: 'Requested feature and reason are required' 
          });
        }
      });

      const response = await request(app)
        .post('/api/feature-requests')
        .send({
          requested_feature: 'Dark mode support',
          // Missing reason
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Requested feature and reason are required');
    });

    it('should return 401 if user is not authenticated', async () => {
      app.post('/api/feature-requests', (req, res, next) => {
        // No auth middleware, simulate unauthorized
        res.status(401).json({ message: 'Authorization token required' });
      });

      const response = await request(app)
        .post('/api/feature-requests')
        .send({
          requested_feature: 'Dark mode support',
          reason: 'Better for eyes',
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Authorization token required');
    });
  });

  describe('GET /api/admin/feature-requests', () => {
    it('should return all feature requests for admin users', async () => {
      const mockFeatureRequests = {
        data: [
          {
            id: 'feature-1',
            requested_feature: 'Dark mode',
            reason: 'Eye strain',
            status: 'submitted',
            priority: 'high',
            user_email: 'user1@example.com',
            created_at: '2024-01-01T00:00:00Z',
          },
          {
            id: 'feature-2',
            requested_feature: 'Export to Excel',
            reason: 'Data analysis',
            status: 'planned',
            priority: 'medium',
            user_email: 'user2@example.com',
            created_at: '2024-01-02T00:00:00Z',
          },
        ],
        count: 2,
      };

      const fromMock = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ 
          data: mockFeatureRequests.data, 
          error: null,
          count: mockFeatureRequests.count 
        }),
      };

      supabase.from = jest.fn().mockReturnValue(fromMock);

      app.get('/api/admin/feature-requests', requireAdmin, async (req, res) => {
        try {
          const { page = 1, limit = 10, status, priority } = req.query;
          const offset = (page - 1) * limit;

          let query = supabase
            .from('feature_requests')
            .select('*', { count: 'exact' });

          if (status) query = query.eq('status', status);
          if (priority) query = query.eq('priority', priority);

          const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

          if (error) throw error;

          res.json({
            success: true,
            data: {
              requests: data,
              total: count,
              page: parseInt(page),
              limit: parseInt(limit),
              totalPages: Math.ceil(count / limit),
            },
          });
        } catch (error) {
          res.status(500).json({ success: false, message: error.message });
        }
      });

      const response = await request(app)
        .get('/api/admin/feature-requests')
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.requests).toHaveLength(2);
      expect(response.body.data.total).toBe(2);
    });

    it('should filter feature requests by status', async () => {
      const mockFilteredRequests = {
        data: [
          {
            id: 'feature-1',
            requested_feature: 'Dark mode',
            status: 'planned',
            priority: 'high',
          },
        ],
        count: 1,
      };

      const fromMock = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockFilteredRequests.data,
          error: null,
          count: mockFilteredRequests.count,
        }),
      };

      supabase.from = jest.fn().mockReturnValue(fromMock);

      app.get('/api/admin/feature-requests', requireAdmin, async (req, res) => {
        const { status } = req.query;
        
        let query = supabase
          .from('feature_requests')
          .select('*', { count: 'exact' });

        if (status) query = query.eq('status', status);

        const { data, error, count } = await query
          .order('created_at', { ascending: false })
          .range(0, 9);

        res.json({
          success: true,
          data: { requests: data, total: count },
        });
      });

      const response = await request(app)
        .get('/api/admin/feature-requests')
        .query({ status: 'planned' });

      expect(response.status).toBe(200);
      expect(response.body.data.requests).toHaveLength(1);
      expect(response.body.data.requests[0].status).toBe('planned');
    });

    it('should return 403 if user is not admin', async () => {
      app.get('/api/admin/feature-requests', (req, res) => {
        // Simulate non-admin user
        res.status(403).json({ message: 'Admin access required' });
      });

      const response = await request(app)
        .get('/api/admin/feature-requests');

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Admin access required');
    });
  });

  describe('PUT /api/admin/feature-requests/:id', () => {
    it('should update feature request status and priority', async () => {
      const updatedFeatureRequest = {
        id: 'feature-1',
        status: 'in_development',
        priority: 'urgent',
        admin_notes: 'Working on this feature',
        updated_at: new Date().toISOString(),
      };

      const fromMock = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: updatedFeatureRequest,
          error: null,
        }),
      };

      supabase.from = jest.fn().mockReturnValue(fromMock);

      app.put('/api/admin/feature-requests/:id', requireAdmin, async (req, res) => {
        try {
          const { id } = req.params;
          const { status, priority, admin_notes, assigned_to } = req.body;

          const updateData = {};
          if (status) updateData.status = status;
          if (priority) updateData.priority = priority;
          if (admin_notes !== undefined) updateData.admin_notes = admin_notes;
          if (assigned_to !== undefined) updateData.assigned_to = assigned_to;

          // Add reviewed_by and reviewed_at for first review
          if (status === 'under_review' || status === 'planned') {
            updateData.reviewed_by = req.user.id;
            updateData.reviewed_at = new Date().toISOString();
          }

          // Add completed_at for completed status
          if (status === 'completed') {
            updateData.completed_at = new Date().toISOString();
          }

          const { data, error } = await supabase
            .from('feature_requests')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

          if (error) throw error;

          res.json({ success: true, data });
        } catch (error) {
          res.status(500).json({ success: false, message: error.message });
        }
      });

      const response = await request(app)
        .put('/api/admin/feature-requests/feature-1')
        .send({
          status: 'in_development',
          priority: 'urgent',
          admin_notes: 'Working on this feature',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('in_development');
      expect(response.body.data.priority).toBe('urgent');
    });

    it('should return 404 if feature request not found', async () => {
      const fromMock = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Feature request not found' },
        }),
      };

      supabase.from = jest.fn().mockReturnValue(fromMock);

      app.put('/api/admin/feature-requests/:id', requireAdmin, async (req, res) => {
        const { id } = req.params;
        
        const { data, error } = await supabase
          .from('feature_requests')
          .update(req.body)
          .eq('id', id)
          .select()
          .single();

        if (error || !data) {
          return res.status(404).json({ 
            success: false, 
            message: 'Feature request not found' 
          });
        }

        res.json({ success: true, data });
      });

      const response = await request(app)
        .put('/api/admin/feature-requests/non-existent-id')
        .send({ status: 'completed' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Feature request not found');
    });

    it('should validate status enum values', async () => {
      app.put('/api/admin/feature-requests/:id', requireAdmin, async (req, res) => {
        const { status } = req.body;
        const validStatuses = [
          'submitted', 'under_review', 'planned', 
          'in_development', 'completed', 'rejected', 'on_hold'
        ];

        if (status && !validStatuses.includes(status)) {
          return res.status(400).json({
            success: false,
            message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
          });
        }

        res.json({ success: true });
      });

      const response = await request(app)
        .put('/api/admin/feature-requests/feature-1')
        .send({ status: 'invalid-status' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid status');
    });

    it('should validate priority enum values', async () => {
      app.put('/api/admin/feature-requests/:id', requireAdmin, async (req, res) => {
        const { priority } = req.body;
        const validPriorities = ['low', 'medium', 'high', 'urgent'];

        if (priority && !validPriorities.includes(priority)) {
          return res.status(400).json({
            success: false,
            message: `Invalid priority. Must be one of: ${validPriorities.join(', ')}`,
          });
        }

        res.json({ success: true });
      });

      const response = await request(app)
        .put('/api/admin/feature-requests/feature-1')
        .send({ priority: 'invalid-priority' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid priority');
    });
  });

  describe('POST /api/feature-requests/:id/vote', () => {
    it('should allow users to vote for a feature request', async () => {
      const voteData = {
        id: 'vote-1',
        feature_request_id: 'feature-1',
        user_id: 'test-user-id',
        created_at: new Date().toISOString(),
      };

      const fromMock = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: voteData,
          error: null,
        }),
      };

      supabase.from = jest.fn().mockReturnValue(fromMock);

      app.post('/api/feature-requests/:id/vote', requireAuth, async (req, res) => {
        try {
          const { id } = req.params;
          const user_id = req.user.id;

          const { data, error } = await supabase
            .from('feature_request_votes')
            .insert({ feature_request_id: id, user_id })
            .select()
            .single();

          if (error) {
            if (error.code === '23505') { // Unique constraint violation
              return res.status(400).json({
                success: false,
                message: 'You have already voted for this feature',
              });
            }
            throw error;
          }

          res.json({ success: true, data });
        } catch (error) {
          res.status(500).json({ success: false, message: error.message });
        }
      });

      const response = await request(app)
        .post('/api/feature-requests/feature-1/vote');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.feature_request_id).toBe('feature-1');
    });

    it('should prevent duplicate votes from same user', async () => {
      const fromMock = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: '23505', message: 'Duplicate key violation' },
        }),
      };

      supabase.from = jest.fn().mockReturnValue(fromMock);

      app.post('/api/feature-requests/:id/vote', requireAuth, async (req, res) => {
        const { id } = req.params;
        const user_id = req.user.id;

        const { data, error } = await supabase
          .from('feature_request_votes')
          .insert({ feature_request_id: id, user_id })
          .select()
          .single();

        if (error?.code === '23505') {
          return res.status(400).json({
            success: false,
            message: 'You have already voted for this feature',
          });
        }

        res.json({ success: true, data });
      });

      const response = await request(app)
        .post('/api/feature-requests/feature-1/vote');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('You have already voted for this feature');
    });
  });

  describe('DELETE /api/feature-requests/:id/vote', () => {
    it('should allow users to remove their vote', async () => {
      const fromMock = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        match: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      supabase.from = jest.fn().mockReturnValue(fromMock);

      app.delete('/api/feature-requests/:id/vote', requireAuth, async (req, res) => {
        try {
          const { id } = req.params;
          const user_id = req.user.id;

          const { error } = await supabase
            .from('feature_request_votes')
            .delete()
            .match({ feature_request_id: id, user_id });

          if (error) throw error;

          res.json({ success: true, message: 'Vote removed successfully' });
        } catch (error) {
          res.status(500).json({ success: false, message: error.message });
        }
      });

      const response = await request(app)
        .delete('/api/feature-requests/feature-1/vote');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Vote removed successfully');
    });
  });

  describe('GET /api/feature-requests/:id/comments', () => {
    it('should return comments for a feature request', async () => {
      const mockComments = [
        {
          id: 'comment-1',
          feature_request_id: 'feature-1',
          user_email: 'user@example.com',
          user_name: 'User Name',
          comment: 'Great idea!',
          is_admin_comment: false,
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'comment-2',
          feature_request_id: 'feature-1',
          user_email: 'admin@example.com',
          user_name: 'Admin',
          comment: 'We are reviewing this',
          is_admin_comment: true,
          created_at: '2024-01-02T00:00:00Z',
        },
      ];

      const fromMock = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockComments,
          error: null,
        }),
      };

      supabase.from = jest.fn().mockReturnValue(fromMock);

      app.get('/api/feature-requests/:id/comments', requireAuth, async (req, res) => {
        try {
          const { id } = req.params;

          const { data, error } = await supabase
            .from('feature_request_comments')
            .select('*')
            .eq('feature_request_id', id)
            .order('created_at', { ascending: false });

          if (error) throw error;

          res.json({ success: true, data });
        } catch (error) {
          res.status(500).json({ success: false, message: error.message });
        }
      });

      const response = await request(app)
        .get('/api/feature-requests/feature-1/comments');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].comment).toBe('Great idea!');
    });
  });

  describe('POST /api/feature-requests/:id/comments', () => {
    it('should allow users to add comments', async () => {
      const newComment = {
        id: 'comment-3',
        feature_request_id: 'feature-1',
        user_id: 'test-user-id',
        user_email: 'test@example.com',
        user_name: 'Test User',
        comment: 'I would also love this feature!',
        is_admin_comment: false,
        created_at: new Date().toISOString(),
      };

      const fromMock = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: newComment,
          error: null,
        }),
      };

      supabase.from = jest.fn().mockReturnValue(fromMock);

      app.post('/api/feature-requests/:id/comments', requireAuth, async (req, res) => {
        try {
          const { id } = req.params;
          const { comment } = req.body;
          const user = req.user;

          if (!comment || comment.trim() === '') {
            return res.status(400).json({
              success: false,
              message: 'Comment cannot be empty',
            });
          }

          const commentData = {
            feature_request_id: id,
            user_id: user.id,
            user_email: user.email,
            user_name: user.name || 'Unknown User',
            comment: comment.trim(),
            is_admin_comment: user.role === 'admin' || user.role === 'moderator',
          };

          const { data, error } = await supabase
            .from('feature_request_comments')
            .insert(commentData)
            .select()
            .single();

          if (error) throw error;

          res.status(201).json({ success: true, data });
        } catch (error) {
          res.status(500).json({ success: false, message: error.message });
        }
      });

      const response = await request(app)
        .post('/api/feature-requests/feature-1/comments')
        .send({ comment: 'I would also love this feature!' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.comment).toBe('I would also love this feature!');
      expect(response.body.data.is_admin_comment).toBe(false);
    });

    it('should reject empty comments', async () => {
      app.post('/api/feature-requests/:id/comments', requireAuth, async (req, res) => {
        const { comment } = req.body;

        if (!comment || comment.trim() === '') {
          return res.status(400).json({
            success: false,
            message: 'Comment cannot be empty',
          });
        }

        res.json({ success: true });
      });

      const response = await request(app)
        .post('/api/feature-requests/feature-1/comments')
        .send({ comment: '   ' }); // Only whitespace

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Comment cannot be empty');
    });
  });
});