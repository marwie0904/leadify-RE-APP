export interface ICryptoService {
  generateRandomBytes(length: number): Buffer;
  generateSecureToken(length?: number): string;
  hash(data: string, algorithm: HashAlgorithm): string;
  hmac(data: string, key: string, algorithm: HashAlgorithm): string;
  encrypt(data: string, key: string): EncryptedData;
  decrypt(encrypted: EncryptedData, key: string): string;
  generateKeyPair(): Promise<KeyPair>;
  sign(data: string, privateKey: string): string;
  verify(data: string, signature: string, publicKey: string): boolean;
  deriveKey(password: string, salt: string, iterations?: number): Promise<string>;
}

export enum HashAlgorithm {
  SHA256 = 'sha256',
  SHA384 = 'sha384',
  SHA512 = 'sha512',
  MD5 = 'md5' // Only for legacy compatibility
}

export interface EncryptedData {
  data: string;
  iv: string;
  tag?: string;
  algorithm: string;
}

export interface KeyPair {
  publicKey: string;
  privateKey: string;
  type: 'rsa' | 'ec';
}