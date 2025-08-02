import { Organization, OrganizationPlan, CreateOrganizationDTO, UpdateOrganizationDTO, validateOrganization } from '../organization.model';

describe('Organization Model', () => {
  describe('Organization Entity', () => {
    it('should create a valid organization entity', () => {
      const org = new Organization({
        id: 'org-123',
        name: 'Test Company',
        slug: 'test-company',
        ownerId: 'user-123',
        plan: OrganizationPlan.STARTER,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(org.id).toBe('org-123');
      expect(org.name).toBe('Test Company');
      expect(org.slug).toBe('test-company');
      expect(org.ownerId).toBe('user-123');
      expect(org.plan).toBe(OrganizationPlan.STARTER);
    });

    it('should generate slug from name if not provided', () => {
      const org = Organization.createSlug('Test Company Name');
      expect(org).toBe('test-company-name');

      const orgWithSpecialChars = Organization.createSlug('Test & Company @ 2024!');
      expect(orgWithSpecialChars).toBe('test-company-2024');
    });

    it('should track member count and limits', () => {
      const org = new Organization({
        id: 'org-123',
        name: 'Test Company',
        slug: 'test-company',
        ownerId: 'user-123',
        plan: OrganizationPlan.PROFESSIONAL,
        memberCount: 5,
      });

      expect(org.memberCount).toBe(5);
      expect(org.getMemberLimit()).toBe(20); // Professional plan limit
      expect(org.canAddMembers()).toBe(true);
    });

    it('should check member limits correctly', () => {
      const org = new Organization({
        id: 'org-123',
        name: 'Test Company',
        slug: 'test-company',
        ownerId: 'user-123',
        plan: OrganizationPlan.STARTER,
        memberCount: 5,
      });

      expect(org.getMemberLimit()).toBe(5); // Starter plan limit
      expect(org.canAddMembers()).toBe(false);
    });

    it('should convert to JSON properly', () => {
      const org = new Organization({
        id: 'org-123',
        name: 'Test Company',
        slug: 'test-company',
        ownerId: 'user-123',
        plan: OrganizationPlan.PROFESSIONAL,
        settings: { theme: 'dark' },
      });

      const json = org.toJSON();
      expect(json).toEqual({
        id: 'org-123',
        name: 'Test Company',
        slug: 'test-company',
        ownerId: 'user-123',
        plan: OrganizationPlan.PROFESSIONAL,
        memberCount: 0,
        isActive: true,
        settings: { theme: 'dark' },
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });
  });

  describe('CreateOrganizationDTO Validation', () => {
    it('should validate a valid CreateOrganizationDTO', () => {
      const dto: CreateOrganizationDTO = {
        name: 'Test Company',
        ownerId: 'user-123',
      };

      const result = validateOrganization.create(dto);
      expect(result.success).toBe(true);
    });

    it('should reject short organization name', () => {
      const dto: CreateOrganizationDTO = {
        name: 'AB',
        ownerId: 'user-123',
      };

      const result = validateOrganization.create(dto);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Organization name must be at least 3 characters long');
    });

    it('should reject invalid slug format', () => {
      const dto: CreateOrganizationDTO = {
        name: 'Test Company',
        slug: 'Invalid Slug!',
        ownerId: 'user-123',
      };

      const result = validateOrganization.create(dto);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Slug must contain only lowercase letters, numbers, and hyphens');
    });

    it('should validate with custom plan', () => {
      const dto: CreateOrganizationDTO = {
        name: 'Test Company',
        ownerId: 'user-123',
        plan: OrganizationPlan.ENTERPRISE,
      };

      const result = validateOrganization.create(dto);
      expect(result.success).toBe(true);
    });
  });

  describe('UpdateOrganizationDTO Validation', () => {
    it('should validate a valid UpdateOrganizationDTO', () => {
      const dto: UpdateOrganizationDTO = {
        name: 'Updated Company Name',
        settings: { theme: 'light' },
      };

      const result = validateOrganization.update(dto);
      expect(result.success).toBe(true);
    });

    it('should allow partial updates', () => {
      const dto: UpdateOrganizationDTO = {
        plan: OrganizationPlan.PROFESSIONAL,
      };

      const result = validateOrganization.update(dto);
      expect(result.success).toBe(true);
    });

    it('should reject invalid plan', () => {
      const dto: any = {
        plan: 'INVALID_PLAN',
      };

      const result = validateOrganization.update(dto);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid plan');
    });
  });

  describe('Plan Features', () => {
    it('should return correct features for each plan', () => {
      expect(Organization.getPlanFeatures(OrganizationPlan.STARTER)).toEqual({
        memberLimit: 5,
        agentLimit: 1,
        conversationLimit: 1000,
        features: ['basic_analytics', 'email_support'],
      });

      expect(Organization.getPlanFeatures(OrganizationPlan.PROFESSIONAL)).toEqual({
        memberLimit: 20,
        agentLimit: 5,
        conversationLimit: 10000,
        features: ['advanced_analytics', 'priority_support', 'api_access'],
      });

      expect(Organization.getPlanFeatures(OrganizationPlan.ENTERPRISE)).toEqual({
        memberLimit: -1, // unlimited
        agentLimit: -1,
        conversationLimit: -1,
        features: ['advanced_analytics', 'dedicated_support', 'api_access', 'custom_integrations', 'sla'],
      });
    });
  });
});