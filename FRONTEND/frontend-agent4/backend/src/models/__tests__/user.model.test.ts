import { User, UserRole, CreateUserDTO, UpdateUserDTO, validateUser } from '../user.model';

describe('User Model', () => {
  describe('User Entity', () => {
    it('should create a valid user entity', () => {
      const user = new User({
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.USER,
        organizationId: 'org-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      expect(user.id).toBe('123');
      expect(user.email).toBe('test@example.com');
      expect(user.name).toBe('Test User');
      expect(user.role).toBe(UserRole.USER);
      expect(user.organizationId).toBe('org-123');
    });

    it('should hash password when setting', async () => {
      const user = new User({
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.USER,
      });

      await user.setPassword('mySecurePassword123!');
      expect(user.passwordHash).toBeDefined();
      expect(user.passwordHash).not.toBe('mySecurePassword123!');
    });

    it('should verify password correctly', async () => {
      const user = new User({
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.USER,
      });

      await user.setPassword('mySecurePassword123!');
      
      const isValid = await user.verifyPassword('mySecurePassword123!');
      const isInvalid = await user.verifyPassword('wrongPassword');
      
      expect(isValid).toBe(true);
      expect(isInvalid).toBe(false);
    });

    it('should convert to JSON without sensitive data', () => {
      const user = new User({
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.USER,
        passwordHash: 'hashedPassword',
      });

      const json = user.toJSON();
      expect(json.passwordHash).toBeUndefined();
      expect(json.email).toBe('test@example.com');
    });
  });

  describe('CreateUserDTO Validation', () => {
    it('should validate a valid CreateUserDTO', () => {
      const dto: CreateUserDTO = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'Test User',
        role: UserRole.USER,
        organizationId: 'org-123',
      };

      const result = validateUser.create(dto);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const dto: CreateUserDTO = {
        email: 'invalid-email',
        password: 'SecurePass123!',
        name: 'Test User',
        role: UserRole.USER,
      };

      const result = validateUser.create(dto);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });

    it('should reject weak password', () => {
      const dto: CreateUserDTO = {
        email: 'test@example.com',
        password: 'weak',
        name: 'Test User',
        role: UserRole.USER,
      };

      const result = validateUser.create(dto);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should reject invalid role', () => {
      const dto: any = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'Test User',
        role: 'INVALID_ROLE',
      };

      const result = validateUser.create(dto);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid role');
    });
  });

  describe('UpdateUserDTO Validation', () => {
    it('should validate a valid UpdateUserDTO', () => {
      const dto: UpdateUserDTO = {
        name: 'Updated Name',
        avatar: 'https://example.com/avatar.jpg',
      };

      const result = validateUser.update(dto);
      expect(result.success).toBe(true);
    });

    it('should allow partial updates', () => {
      const dto: UpdateUserDTO = {
        name: 'Updated Name',
      };

      const result = validateUser.update(dto);
      expect(result.success).toBe(true);
    });

    it('should reject invalid avatar URL', () => {
      const dto: UpdateUserDTO = {
        avatar: 'not-a-url',
      };

      const result = validateUser.update(dto);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid avatar URL');
    });
  });
});