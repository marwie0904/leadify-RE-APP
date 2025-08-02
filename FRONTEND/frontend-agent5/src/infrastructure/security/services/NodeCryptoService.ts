import crypto from 'crypto';
import { promisify } from 'util';
import { 
  ICryptoService, 
  HashAlgorithm, 
  EncryptedData, 
  KeyPair 
} from '@/domain/security/services/ICryptoService';

const pbkdf2 = promisify(crypto.pbkdf2);
const generateKeyPair = promisify(crypto.generateKeyPair);

export class NodeCryptoService implements ICryptoService {
  private readonly defaultEncryptionAlgorithm = 'aes-256-cbc';
  private readonly defaultKeyLength = 32; // 256 bits
  private readonly defaultIvLength = 16; // 128 bits
  private readonly defaultTagLength = 16; // 128 bits
  private readonly defaultIterations = 100000; // PBKDF2 iterations

  generateRandomBytes(length: number): Buffer {
    if (length <= 0 || length > 1024) {
      throw new Error('Invalid byte length. Must be between 1 and 1024');
    }
    return crypto.randomBytes(length);
  }

  generateSecureToken(length: number = 32): string {
    const bytes = this.generateRandomBytes(length);
    return bytes.toString('base64url'); // URL-safe base64
  }

  hash(data: string, algorithm: HashAlgorithm = HashAlgorithm.SHA256): string {
    if (!data) {
      throw new Error('Data is required for hashing');
    }

    try {
      const hash = crypto.createHash(algorithm);
      hash.update(data, 'utf8');
      return hash.digest('hex');
    } catch (error) {
      throw new Error(`Hash operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  hmac(data: string, key: string, algorithm: HashAlgorithm = HashAlgorithm.SHA256): string {
    if (!data || !key) {
      throw new Error('Both data and key are required for HMAC');
    }

    try {
      const hmac = crypto.createHmac(algorithm, key);
      hmac.update(data, 'utf8');
      return hmac.digest('hex');
    } catch (error) {
      throw new Error(`HMAC operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  encrypt(data: string, key: string): EncryptedData {
    if (!data || !key) {
      throw new Error('Both data and key are required for encryption');
    }

    try {
      // Derive a proper encryption key from the provided key
      const keyBuffer = this.deriveEncryptionKey(key);
      
      // Generate a random initialization vector
      const iv = crypto.randomBytes(this.defaultIvLength);
      
      // Create cipher with IV
      const cipher = crypto.createCipheriv(this.defaultEncryptionAlgorithm, keyBuffer, iv);
      
      // Encrypt the data
      let encrypted = cipher.update(data, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      return {
        data: encrypted,
        iv: iv.toString('base64'),
        algorithm: this.defaultEncryptionAlgorithm
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  decrypt(encrypted: EncryptedData, key: string): string {
    if (!encrypted?.data || !key) {
      throw new Error('Both encrypted data and key are required for decryption');
    }

    try {
      // Derive the same encryption key
      const keyBuffer = this.deriveEncryptionKey(key);
      
      // Parse the IV
      const iv = Buffer.from(encrypted.iv, 'base64');
      
      // Create decipher with IV
      const decipher = crypto.createDecipheriv(encrypted.algorithm || this.defaultEncryptionAlgorithm, keyBuffer, iv);
      
      // Decrypt the data
      let decrypted = decipher.update(encrypted.data, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateKeyPair(): Promise<KeyPair> {
    try {
      // Generate RSA key pair for better compatibility
      const { publicKey, privateKey } = await generateKeyPair('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      }) as { publicKey: string; privateKey: string };

      return {
        publicKey,
        privateKey,
        type: 'rsa'
      };
    } catch (error) {
      throw new Error(`Key pair generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  sign(data: string, privateKey: string): string {
    if (!data || !privateKey) {
      throw new Error('Both data and private key are required for signing');
    }

    try {
      const sign = crypto.createSign('RSA-SHA256');
      sign.update(data, 'utf8');
      return sign.sign(privateKey, 'base64');
    } catch (error) {
      throw new Error(`Signing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  verify(data: string, signature: string, publicKey: string): boolean {
    if (!data || !signature || !publicKey) {
      return false;
    }

    try {
      const verify = crypto.createVerify('RSA-SHA256');
      verify.update(data, 'utf8');
      return verify.verify(publicKey, signature, 'base64');
    } catch (error) {
      // Verification failures should return false, not throw
      console.warn('Signature verification failed:', error);
      return false;
    }
  }

  async deriveKey(password: string, salt: string, iterations: number = this.defaultIterations): Promise<string> {
    if (!password || !salt) {
      throw new Error('Both password and salt are required for key derivation');
    }

    if (iterations < 10000) {
      throw new Error('Iterations must be at least 10,000 for security');
    }

    try {
      const derivedKey = await pbkdf2(password, salt, iterations, this.defaultKeyLength, 'sha256');
      return derivedKey.toString('base64');
    } catch (error) {
      throw new Error(`Key derivation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a cryptographically secure salt
   */
  generateSalt(length: number = 16): string {
    return this.generateRandomBytes(length).toString('base64');
  }

  /**
   * Generate a secure password hash with salt
   */
  async hashPassword(password: string, salt?: string): Promise<{ hash: string; salt: string }> {
    if (!password) {
      throw new Error('Password is required');
    }

    const passwordSalt = salt || this.generateSalt();
    const hash = await this.deriveKey(password, passwordSalt);

    return {
      hash,
      salt: passwordSalt
    };
  }

  /**
   * Verify a password against a hash
   */
  async verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
    if (!password || !hash || !salt) {
      return false;
    }

    try {
      const derivedHash = await this.deriveKey(password, salt);
      return this.constantTimeCompare(hash, derivedHash);
    } catch (error) {
      console.warn('Password verification failed:', error);
      return false;
    }
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Derive a proper encryption key from a user-provided key
   */
  private deriveEncryptionKey(key: string): Buffer {
    // Use SHA-256 to derive a proper-length key
    const hash = crypto.createHash('sha256');
    hash.update(key, 'utf8');
    return hash.digest();
  }

  /**
   * Generate a time-based one-time password (TOTP) secret
   */
  generateTOTPSecret(): string {
    return this.generateRandomBytes(20).toString('base32');
  }

  /**
   * Generate a JWT-like token with expiration
   */
  generateSessionToken(payload: Record<string, any>, expiresIn: number = 3600): string {
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };

    const now = Math.floor(Date.now() / 1000);
    const tokenPayload = {
      ...payload,
      iat: now,
      exp: now + expiresIn
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(tokenPayload)).toString('base64url');
    
    const secret = process.env.JWT_SECRET || 'default-secret-change-in-production';
    const signature = this.hmac(`${encodedHeader}.${encodedPayload}`, secret, HashAlgorithm.SHA256);
    const encodedSignature = Buffer.from(signature, 'hex').toString('base64url');

    return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
  }

  /**
   * Verify and decode a session token
   */
  verifySessionToken(token: string): { valid: boolean; payload?: any; error?: string } {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return { valid: false, error: 'Invalid token format' };
      }

      const [encodedHeader, encodedPayload, encodedSignature] = parts;
      
      // Verify signature
      const secret = process.env.JWT_SECRET || 'default-secret-change-in-production';
      const expectedSignature = this.hmac(`${encodedHeader}.${encodedPayload}`, secret, HashAlgorithm.SHA256);
      const expectedEncodedSignature = Buffer.from(expectedSignature, 'hex').toString('base64url');

      if (!this.constantTimeCompare(encodedSignature, expectedEncodedSignature)) {
        return { valid: false, error: 'Invalid signature' };
      }

      // Decode payload
      const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString());
      
      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        return { valid: false, error: 'Token expired' };
      }

      return { valid: true, payload };
    } catch (error) {
      return { 
        valid: false, 
        error: `Token verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}