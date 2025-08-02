export interface INonceService {
  /**
   * Generates a cryptographically secure nonce
   * @returns Base64-encoded nonce string
   */
  generate(): string;

  /**
   * Validates if a nonce is valid and not expired
   * @param nonce The nonce to validate
   * @returns True if valid, false otherwise
   */
  validate(nonce: string): boolean;

  /**
   * Stores a nonce for validation
   * @param nonce The nonce to store
   */
  store(nonce: string): void;

  /**
   * Removes expired nonces from storage
   */
  cleanup(): void;
}