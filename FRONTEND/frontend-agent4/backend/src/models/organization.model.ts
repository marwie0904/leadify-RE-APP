export enum OrganizationPlan {
  STARTER = 'STARTER',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE',
}

export interface OrganizationSettings {
  theme?: string;
  language?: string;
  timezone?: string;
  features?: Record<string, boolean>;
}

export interface OrganizationData {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  plan: OrganizationPlan;
  memberCount?: number;
  logo?: string;
  website?: string;
  description?: string;
  settings?: OrganizationSettings;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Organization {
  public readonly id: string;
  public name: string;
  public slug: string;
  public ownerId: string;
  public plan: OrganizationPlan;
  public memberCount: number;
  public logo?: string;
  public website?: string;
  public description?: string;
  public settings: OrganizationSettings;
  public isActive: boolean;
  public readonly createdAt: Date;
  public updatedAt: Date;

  constructor(data: OrganizationData) {
    this.id = data.id;
    this.name = data.name;
    this.slug = data.slug || Organization.createSlug(data.name);
    this.ownerId = data.ownerId;
    this.plan = data.plan || OrganizationPlan.STARTER;
    this.memberCount = data.memberCount || 0;
    this.logo = data.logo;
    this.website = data.website;
    this.description = data.description;
    this.settings = data.settings || {};
    this.isActive = data.isActive ?? true;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  static createSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  getMemberLimit(): number {
    const features = Organization.getPlanFeatures(this.plan);
    return features.memberLimit;
  }

  canAddMembers(): boolean {
    const limit = this.getMemberLimit();
    return limit === -1 || this.memberCount < limit;
  }

  static getPlanFeatures(plan: OrganizationPlan) {
    const features = {
      [OrganizationPlan.STARTER]: {
        memberLimit: 5,
        agentLimit: 1,
        conversationLimit: 1000,
        features: ['basic_analytics', 'email_support'],
      },
      [OrganizationPlan.PROFESSIONAL]: {
        memberLimit: 20,
        agentLimit: 5,
        conversationLimit: 10000,
        features: ['advanced_analytics', 'priority_support', 'api_access'],
      },
      [OrganizationPlan.ENTERPRISE]: {
        memberLimit: -1, // unlimited
        agentLimit: -1,
        conversationLimit: -1,
        features: ['advanced_analytics', 'dedicated_support', 'api_access', 'custom_integrations', 'sla'],
      },
    };

    return features[plan];
  }

  toJSON(): OrganizationData {
    return {
      id: this.id,
      name: this.name,
      slug: this.slug,
      ownerId: this.ownerId,
      plan: this.plan,
      memberCount: this.memberCount,
      logo: this.logo,
      website: this.website,
      description: this.description,
      settings: this.settings,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export interface CreateOrganizationDTO {
  name: string;
  slug?: string;
  ownerId: string;
  plan?: OrganizationPlan;
  logo?: string;
  website?: string;
  description?: string;
}

export interface UpdateOrganizationDTO {
  name?: string;
  slug?: string;
  plan?: OrganizationPlan;
  logo?: string;
  website?: string;
  description?: string;
  settings?: OrganizationSettings;
  isActive?: boolean;
}

interface ValidationResult {
  success: boolean;
  errors: string[];
}

export const validateOrganization = {
  create(dto: CreateOrganizationDTO): ValidationResult {
    const errors: string[] = [];

    // Name validation
    if (dto.name.trim().length < 3) {
      errors.push('Organization name must be at least 3 characters long');
    }
    if (dto.name.trim().length > 100) {
      errors.push('Organization name must not exceed 100 characters');
    }

    // Slug validation
    if (dto.slug) {
      const slugRegex = /^[a-z0-9-]+$/;
      if (!slugRegex.test(dto.slug)) {
        errors.push('Slug must contain only lowercase letters, numbers, and hyphens');
      }
      if (dto.slug.length < 3 || dto.slug.length > 50) {
        errors.push('Slug must be between 3 and 50 characters');
      }
    }

    // Plan validation
    if (dto.plan && !Object.values(OrganizationPlan).includes(dto.plan)) {
      errors.push('Invalid plan');
    }

    // Website validation
    if (dto.website) {
      try {
        new URL(dto.website);
      } catch {
        errors.push('Invalid website URL');
      }
    }

    // Logo validation
    if (dto.logo) {
      try {
        new URL(dto.logo);
      } catch {
        errors.push('Invalid logo URL');
      }
    }

    return {
      success: errors.length === 0,
      errors,
    };
  },

  update(dto: UpdateOrganizationDTO): ValidationResult {
    const errors: string[] = [];

    // Name validation
    if (dto.name !== undefined) {
      if (dto.name.trim().length < 3) {
        errors.push('Organization name must be at least 3 characters long');
      }
      if (dto.name.trim().length > 100) {
        errors.push('Organization name must not exceed 100 characters');
      }
    }

    // Slug validation
    if (dto.slug !== undefined) {
      const slugRegex = /^[a-z0-9-]+$/;
      if (!slugRegex.test(dto.slug)) {
        errors.push('Slug must contain only lowercase letters, numbers, and hyphens');
      }
      if (dto.slug.length < 3 || dto.slug.length > 50) {
        errors.push('Slug must be between 3 and 50 characters');
      }
    }

    // Plan validation
    if (dto.plan && !Object.values(OrganizationPlan).includes(dto.plan)) {
      errors.push('Invalid plan');
    }

    // Website validation
    if (dto.website !== undefined && dto.website !== '') {
      try {
        new URL(dto.website);
      } catch {
        errors.push('Invalid website URL');
      }
    }

    // Logo validation
    if (dto.logo !== undefined && dto.logo !== '') {
      try {
        new URL(dto.logo);
      } catch {
        errors.push('Invalid logo URL');
      }
    }

    return {
      success: errors.length === 0,
      errors,
    };
  },
};