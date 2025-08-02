import bcrypt from 'bcryptjs';

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  AGENT = 'AGENT',
}

export interface UserData {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  organizationId?: string;
  passwordHash?: string;
  createdAt?: Date;
  updatedAt?: Date;
  lastLoginAt?: Date;
  isActive?: boolean;
  emailVerified?: boolean;
}

export class User {
  public readonly id: string;
  public email: string;
  public name: string;
  public avatar?: string;
  public role: UserRole;
  public organizationId?: string;
  public passwordHash?: string;
  public readonly createdAt: Date;
  public updatedAt: Date;
  public lastLoginAt?: Date;
  public isActive: boolean;
  public emailVerified: boolean;

  constructor(data: UserData) {
    this.id = data.id;
    this.email = data.email;
    this.name = data.name;
    this.avatar = data.avatar;
    this.role = data.role;
    this.organizationId = data.organizationId;
    this.passwordHash = data.passwordHash;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.lastLoginAt = data.lastLoginAt;
    this.isActive = data.isActive ?? true;
    this.emailVerified = data.emailVerified ?? false;
  }

  async setPassword(password: string): Promise<void> {
    const rounds = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);
    this.passwordHash = await bcrypt.hash(password, rounds);
  }

  async verifyPassword(password: string): Promise<boolean> {
    if (!this.passwordHash) return false;
    return bcrypt.compare(password, this.passwordHash);
  }

  toJSON(): Omit<UserData, 'passwordHash'> {
    const { passwordHash, ...data } = this;
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      avatar: this.avatar,
      role: this.role,
      organizationId: this.organizationId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastLoginAt: this.lastLoginAt,
      isActive: this.isActive,
      emailVerified: this.emailVerified,
    };
  }
}

export interface CreateUserDTO {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
  organizationId?: string;
  avatar?: string;
}

export interface UpdateUserDTO {
  name?: string;
  avatar?: string;
  role?: UserRole;
  organizationId?: string;
  isActive?: boolean;
  emailVerified?: boolean;
}

interface ValidationResult {
  success: boolean;
  errors: string[];
}

export const validateUser = {
  create(dto: CreateUserDTO): ValidationResult {
    const errors: string[] = [];

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(dto.email)) {
      errors.push('Invalid email format');
    }

    // Password validation
    if (dto.password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/(?=.*[a-z])/.test(dto.password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/(?=.*[A-Z])/.test(dto.password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/(?=.*\d)/.test(dto.password)) {
      errors.push('Password must contain at least one number');
    }

    // Name validation
    if (dto.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    }

    // Role validation
    if (dto.role && !Object.values(UserRole).includes(dto.role)) {
      errors.push('Invalid role');
    }

    return {
      success: errors.length === 0,
      errors,
    };
  },

  update(dto: UpdateUserDTO): ValidationResult {
    const errors: string[] = [];

    // Name validation
    if (dto.name !== undefined && dto.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    }

    // Avatar validation
    if (dto.avatar !== undefined && dto.avatar !== '') {
      try {
        new URL(dto.avatar);
      } catch {
        errors.push('Invalid avatar URL');
      }
    }

    // Role validation
    if (dto.role && !Object.values(UserRole).includes(dto.role)) {
      errors.push('Invalid role');
    }

    return {
      success: errors.length === 0,
      errors,
    };
  },
};