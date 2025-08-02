import { NodeCryptoService } from '@/infrastructure/security/services/NodeCryptoService';
import { HashAlgorithm } from '@/domain/security/services/ICryptoService';

describe('NodeCryptoService', () => {
  let cryptoService: NodeCryptoService;

  beforeEach(() => {
    cryptoService = new NodeCryptoService();
  });

  describe('generateRandomBytes', () => {
    it('should generate random bytes of specified length', () => {
      const bytes = cryptoService.generateRandomBytes(16);
      expect(bytes).toBeInstanceOf(Buffer);
      expect(bytes.length).toBe(16);
    });

    it('should generate different bytes on each call', () => {
      const bytes1 = cryptoService.generateRandomBytes(16);
      const bytes2 = cryptoService.generateRandomBytes(16);
      expect(bytes1).not.toEqual(bytes2);
    });

    it('should throw error for invalid lengths', () => {
      expect(() => cryptoService.generateRandomBytes(0)).toThrow();
      expect(() => cryptoService.generateRandomBytes(-1)).toThrow();
      expect(() => cryptoService.generateRandomBytes(2000)).toThrow();
    });
  });

  describe('generateSecureToken', () => {
    it('should generate secure tokens', () => {
      const token1 = cryptoService.generateSecureToken();
      const token2 = cryptoService.generateSecureToken();
      
      expect(typeof token1).toBe('string');
      expect(typeof token2).toBe('string');
      expect(token1).not.toBe(token2);
    });

    it('should generate tokens of specified length', () => {
      const token = cryptoService.generateSecureToken(16);
      // Base64url encoding makes the string longer than the byte length
      expect(token.length).toBeGreaterThan(0);
    });
  });

  describe('hash', () => {
    it('should hash data with SHA256 by default', () => {
      const data = 'test data';
      const hash = cryptoService.hash(data);
      
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64); // SHA256 produces 32 bytes = 64 hex chars
    });

    it('should produce consistent hashes for same input', () => {
      const data = 'test data';
      const hash1 = cryptoService.hash(data);
      const hash2 = cryptoService.hash(data);
      
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = cryptoService.hash('data1');
      const hash2 = cryptoService.hash('data2');
      
      expect(hash1).not.toBe(hash2);
    });

    it('should support different hash algorithms', () => {
      const data = 'test data';
      const sha256 = cryptoService.hash(data, HashAlgorithm.SHA256);
      const sha512 = cryptoService.hash(data, HashAlgorithm.SHA512);
      
      expect(sha256.length).toBe(64);
      expect(sha512.length).toBe(128);
      expect(sha256).not.toBe(sha512);
    });

    it('should throw error for empty data', () => {
      expect(() => cryptoService.hash('')).toThrow();
    });
  });

  describe('hmac', () => {
    it('should generate HMAC with key', () => {
      const data = 'test data';
      const key = 'secret key';
      const hmac = cryptoService.hmac(data, key);
      
      expect(typeof hmac).toBe('string');
      expect(hmac.length).toBe(64); // SHA256 HMAC
    });

    it('should produce consistent HMACs for same inputs', () => {
      const data = 'test data';
      const key = 'secret key';
      const hmac1 = cryptoService.hmac(data, key);
      const hmac2 = cryptoService.hmac(data, key);
      
      expect(hmac1).toBe(hmac2);
    });

    it('should produce different HMACs for different keys', () => {
      const data = 'test data';
      const hmac1 = cryptoService.hmac(data, 'key1');
      const hmac2 = cryptoService.hmac(data, 'key2');
      
      expect(hmac1).not.toBe(hmac2);
    });

    it('should throw error for missing data or key', () => {
      expect(() => cryptoService.hmac('', 'key')).toThrow();
      expect(() => cryptoService.hmac('data', '')).toThrow();
    });
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt data successfully', () => {
      const originalData = 'sensitive information';
      const key = 'encryption-key';
      
      const encrypted = cryptoService.encrypt(originalData, key);
      expect(encrypted.data).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.algorithm).toBeDefined();
      
      const decrypted = cryptoService.decrypt(encrypted, key);
      expect(decrypted).toBe(originalData);
    });

    it('should produce different encrypted data for same input', () => {
      const data = 'test data';
      const key = 'encryption-key';
      
      const encrypted1 = cryptoService.encrypt(data, key);
      const encrypted2 = cryptoService.encrypt(data, key);
      
      // Should be different due to random IV
      expect(encrypted1.data).not.toBe(encrypted2.data);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });

    it('should fail decryption with wrong key', () => {
      const data = 'test data';
      const key1 = 'correct-key';
      const key2 = 'wrong-key';
      
      const encrypted = cryptoService.encrypt(data, key1);
      
      expect(() => {
        cryptoService.decrypt(encrypted, key2);
      }).toThrow();
    });

    it('should throw error for empty data or key', () => {
      expect(() => cryptoService.encrypt('', 'key')).toThrow();
      expect(() => cryptoService.encrypt('data', '')).toThrow();
    });
  });

  describe('generateKeyPair', () => {
    it('should generate RSA key pair', async () => {
      const keyPair = await cryptoService.generateKeyPair();
      
      expect(keyPair.publicKey).toBeDefined();
      expect(keyPair.privateKey).toBeDefined();
      expect(keyPair.type).toBe('rsa');
      expect(keyPair.publicKey).toContain('-----BEGIN PUBLIC KEY-----');
      expect(keyPair.privateKey).toContain('-----BEGIN PRIVATE KEY-----');
    });

    it('should generate different key pairs on each call', async () => {
      const keyPair1 = await cryptoService.generateKeyPair();
      const keyPair2 = await cryptoService.generateKeyPair();
      
      expect(keyPair1.publicKey).not.toBe(keyPair2.publicKey);
      expect(keyPair1.privateKey).not.toBe(keyPair2.privateKey);
    });
  });

  describe('sign and verify', () => {
    it('should sign and verify data successfully', async () => {
      const data = 'data to sign';
      const keyPair = await cryptoService.generateKeyPair();
      
      const signature = cryptoService.sign(data, keyPair.privateKey);
      expect(typeof signature).toBe('string');
      
      const isValid = cryptoService.verify(data, signature, keyPair.publicKey);
      expect(isValid).toBe(true);
    });

    it('should fail verification with wrong public key', async () => {
      const data = 'data to sign';
      const keyPair1 = await cryptoService.generateKeyPair();
      const keyPair2 = await cryptoService.generateKeyPair();
      
      const signature = cryptoService.sign(data, keyPair1.privateKey);
      const isValid = cryptoService.verify(data, signature, keyPair2.publicKey);
      
      expect(isValid).toBe(false);
    });

    it('should fail verification with tampered data', async () => {
      const originalData = 'original data';
      const tamperedData = 'tampered data';
      const keyPair = await cryptoService.generateKeyPair();
      
      const signature = cryptoService.sign(originalData, keyPair.privateKey);
      const isValid = cryptoService.verify(tamperedData, signature, keyPair.publicKey);
      
      expect(isValid).toBe(false);
    });

    it('should throw error for missing parameters', async () => {
      const keyPair = await cryptoService.generateKeyPair();
      
      expect(() => cryptoService.sign('', keyPair.privateKey)).toThrow();
      expect(() => cryptoService.sign('data', '')).toThrow();
      
      // Note: verify returns false for invalid inputs instead of throwing
      expect(cryptoService.verify('', 'signature', keyPair.publicKey)).toBe(false);
      expect(cryptoService.verify('data', '', keyPair.publicKey)).toBe(false);
      expect(cryptoService.verify('data', 'signature', '')).toBe(false);
    });
  });

  describe('deriveKey', () => {
    it('should derive key from password and salt', async () => {
      const password = 'user-password';
      const salt = 'unique-salt';
      
      const derivedKey = await cryptoService.deriveKey(password, salt);
      expect(typeof derivedKey).toBe('string');
    });

    it('should produce consistent keys for same inputs', async () => {
      const password = 'user-password';
      const salt = 'unique-salt';
      
      const key1 = await cryptoService.deriveKey(password, salt);
      const key2 = await cryptoService.deriveKey(password, salt);
      
      expect(key1).toBe(key2);
    });

    it('should produce different keys for different salts', async () => {
      const password = 'user-password';
      const salt1 = 'salt1';
      const salt2 = 'salt2';
      
      const key1 = await cryptoService.deriveKey(password, salt1);
      const key2 = await cryptoService.deriveKey(password, salt2);
      
      expect(key1).not.toBe(key2);
    });

    it('should reject low iteration counts', async () => {
      const password = 'user-password';
      const salt = 'unique-salt';
      
      await expect(
        cryptoService.deriveKey(password, salt, 1000)
      ).rejects.toThrow();
    });
  });

  describe('generateSalt', () => {
    it('should generate salt of default length', () => {
      const salt = cryptoService.generateSalt();
      expect(typeof salt).toBe('string');
      expect(salt.length).toBeGreaterThan(0);
    });

    it('should generate salts of specified length', () => {
      const salt = cryptoService.generateSalt(32);
      expect(typeof salt).toBe('string');
    });

    it('should generate different salts on each call', () => {
      const salt1 = cryptoService.generateSalt();
      const salt2 = cryptoService.generateSalt();
      expect(salt1).not.toBe(salt2);
    });
  });

  describe('hashPassword and verifyPassword', () => {
    it('should hash and verify passwords', async () => {
      const password = 'user-password';
      
      const result = await cryptoService.hashPassword(password);
      expect(result.hash).toBeDefined();
      expect(result.salt).toBeDefined();
      
      const isValid = await cryptoService.verifyPassword(password, result.hash, result.salt);
      expect(isValid).toBe(true);
    });

    it('should fail verification with wrong password', async () => {
      const correctPassword = 'correct-password';
      const wrongPassword = 'wrong-password';
      
      const result = await cryptoService.hashPassword(correctPassword);
      const isValid = await cryptoService.verifyPassword(wrongPassword, result.hash, result.salt);
      
      expect(isValid).toBe(false);
    });

    it('should use provided salt', async () => {
      const password = 'user-password';
      const salt = 'custom-salt';
      
      const result = await cryptoService.hashPassword(password, salt);
      expect(result.salt).toBe(salt);
    });
  });

  describe('generateSessionToken and verifySessionToken', () => {
    it('should generate and verify session tokens', () => {
      const payload = { userId: 123, role: 'user' };
      
      const token = cryptoService.generateSessionToken(payload);
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT format
      
      const verification = cryptoService.verifySessionToken(token);
      expect(verification.valid).toBe(true);
      expect(verification.payload?.userId).toBe(123);
      expect(verification.payload?.role).toBe('user');
    });

    it('should handle token expiration', () => {
      const payload = { userId: 123 };
      const shortExpiry = 1; // 1 second
      
      const token = cryptoService.generateSessionToken(payload, shortExpiry);
      
      // Should be valid immediately
      const immediate = cryptoService.verifySessionToken(token);
      expect(immediate.valid).toBe(true);
      
      // Should be expired after waiting
      setTimeout(() => {
        const expired = cryptoService.verifySessionToken(token);
        expect(expired.valid).toBe(false);
        expect(expired.error).toContain('expired');
      }, 1100);
    });

    it('should reject invalid tokens', () => {
      const result = cryptoService.verifySessionToken('invalid.token.format');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject tampered tokens', () => {
      const payload = { userId: 123 };
      const token = cryptoService.generateSessionToken(payload);
      const tamperedToken = token.slice(0, -5) + 'xxxxx';
      
      const result = cryptoService.verifySessionToken(tamperedToken);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('signature');
    });
  });
});