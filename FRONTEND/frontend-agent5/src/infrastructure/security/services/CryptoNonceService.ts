import crypto from 'crypto';
import { INonceService } from '@/domain/security/services/INonceService';

export class CryptoNonceService implements INonceService {
  private nonceStore: Map<string, number> = new Map();
  private readonly NONCE_LENGTH = 32;
  private readonly NONCE_TTL = 5 * 60 * 1000; // 5 minutes
  private cleanupTimer?: NodeJS.Timeout;

  constructor() {
    // Start periodic cleanup
    this.startPeriodicCleanup();
  }

  generate(): string {
    const nonce = crypto.randomBytes(this.NONCE_LENGTH).toString('base64');
    this.store(nonce);
    return nonce;
  }

  validate(nonce: string): boolean {
    const timestamp = this.nonceStore.get(nonce);
    if (!timestamp) return false;
    
    const isValid = Date.now() - timestamp < this.NONCE_TTL;
    if (!isValid) {
      this.nonceStore.delete(nonce);
    }
    return isValid;
  }

  store(nonce: string): void {
    this.nonceStore.set(nonce, Date.now());
    // Trigger cleanup if store is getting large
    if (this.nonceStore.size > 1000) {
      this.cleanup();
    }
  }

  cleanup(): void {
    const now = Date.now();
    const expiredNonces: string[] = [];
    
    for (const [nonce, timestamp] of this.nonceStore.entries()) {
      if (now - timestamp > this.NONCE_TTL) {
        expiredNonces.push(nonce);
      }
    }

    // Remove expired nonces
    expiredNonces.forEach(nonce => this.nonceStore.delete(nonce));
  }

  private startPeriodicCleanup(): void {
    // Run cleanup every minute
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  /**
   * Stops the periodic cleanup (useful for testing and cleanup)
   */
  public stopPeriodicCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Get the current number of stored nonces (useful for monitoring)
   */
  public getStoredNonceCount(): number {
    return this.nonceStore.size;
  }
}