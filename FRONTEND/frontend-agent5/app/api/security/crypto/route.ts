import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiRateLimit, withStrictRateLimit } from '@/infrastructure/security/middleware/ApiRateLimitHandler';
import { NodeCryptoService } from '@/infrastructure/security/services/NodeCryptoService';
import { getValidator } from '@/infrastructure/security/factories/ValidationFactory';

// Initialize crypto service
const cryptoService = new NodeCryptoService();

/**
 * Cryptographic operations endpoint
 * POST /api/security/crypto
 */
async function cryptoHandler(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const validator = getValidator();
    
    // Validate request body structure
    const requestSchema = z.object({
      operation: z.enum(['hash', 'hmac', 'encrypt', 'decrypt', 'generateToken', 'generateSalt', 'hashPassword', 'verifyPassword']),
      data: z.string(),
      key: z.string().optional(),
      algorithm: z.enum(['sha256', 'sha384', 'sha512', 'md5']).optional(),
      salt: z.string().optional(),
      encryptedData: z.object({
        data: z.string(),
        iv: z.string(),
        tag: z.string().optional(),
        algorithm: z.string()
      }).optional()
    });

    const validationResult = validator.validateInput(body, requestSchema);
    if (!validationResult.isValid) {
      return NextResponse.json({
        error: 'Invalid request',
        details: validationResult.errors
      }, { status: 400 });
    }

    const { operation, data, key, algorithm, salt, encryptedData } = validationResult.sanitized!;
    let result;

    try {
      switch (operation) {
        case 'hash':
          if (!data) {
            return NextResponse.json({
              error: 'Data is required for hashing'
            }, { status: 400 });
          }
          result = {
            hash: cryptoService.hash(data, algorithm || 'sha256'),
            algorithm: algorithm || 'sha256'
          };
          break;

        case 'hmac':
          if (!data || !key) {
            return NextResponse.json({
              error: 'Data and key are required for HMAC'
            }, { status: 400 });
          }
          result = {
            hmac: cryptoService.hmac(data, key, algorithm || 'sha256'),
            algorithm: algorithm || 'sha256'
          };
          break;

        case 'encrypt':
          if (!data || !key) {
            return NextResponse.json({
              error: 'Data and key are required for encryption'
            }, { status: 400 });
          }
          result = {
            encrypted: cryptoService.encrypt(data, key)
          };
          break;

        case 'decrypt':
          if (!encryptedData || !key) {
            return NextResponse.json({
              error: 'Encrypted data and key are required for decryption'
            }, { status: 400 });
          }
          result = {
            decrypted: cryptoService.decrypt(encryptedData, key)
          };
          break;

        case 'generateToken':
          const length = Math.min(parseInt(data) || 32, 64); // Max 64 bytes for security
          result = {
            token: cryptoService.generateSecureToken(length),
            length
          };
          break;

        case 'generateSalt':
          const saltLength = Math.min(parseInt(data) || 16, 32); // Max 32 bytes
          result = {
            salt: cryptoService.generateSalt(saltLength),
            length: saltLength
          };
          break;

        case 'hashPassword':
          if (!data) {
            return NextResponse.json({
              error: 'Password is required'
            }, { status: 400 });
          }
          result = await cryptoService.hashPassword(data, salt);
          break;

        case 'verifyPassword':
          if (!data || !key || !salt) {
            return NextResponse.json({
              error: 'Password, hash, and salt are required for verification'
            }, { status: 400 });
          }
          const isValid = await cryptoService.verifyPassword(data, key, salt);
          result = {
            valid: isValid
          };
          break;

        default:
          return NextResponse.json({
            error: 'Unsupported cryptographic operation'
          }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        operation,
        result,
        timestamp: new Date().toISOString()
      });

    } catch (cryptoError) {
      console.error('Cryptographic operation error:', cryptoError);
      return NextResponse.json({
        error: 'Cryptographic operation failed',
        message: cryptoError instanceof Error ? cryptoError.message : 'Unknown crypto error',
        operation
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Crypto API error:', error);
    return NextResponse.json({
      error: 'Request processing failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Key pair generation endpoint
 * POST /api/security/crypto/keypair
 */
async function keyPairHandler(req: NextRequest): Promise<NextResponse> {
  try {
    const keyPair = await cryptoService.generateKeyPair();
    
    return NextResponse.json({
      success: true,
      keyPair: {
        publicKey: keyPair.publicKey,
        // Don't return private key in production - this is for demo purposes
        privateKey: process.env.NODE_ENV === 'development' ? keyPair.privateKey : '[REDACTED]',
        type: keyPair.type
      },
      warning: process.env.NODE_ENV === 'production' ? 'Private key redacted in production' : undefined,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Key pair generation error:', error);
    return NextResponse.json({
      error: 'Key pair generation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Digital signature endpoint
 * POST /api/security/crypto/sign
 */
async function signHandler(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const validator = getValidator();
    
    const requestSchema = z.object({
      operation: z.enum(['sign', 'verify']),
      data: z.string(),
      privateKey: z.string().optional(),
      publicKey: z.string().optional(),
      signature: z.string().optional()
    });

    const validationResult = validator.validateInput(body, requestSchema);
    if (!validationResult.isValid) {
      return NextResponse.json({
        error: 'Invalid request',
        details: validationResult.errors
      }, { status: 400 });
    }

    const { operation, data, privateKey, publicKey, signature } = validationResult.sanitized!;

    try {
      if (operation === 'sign') {
        if (!data || !privateKey) {
          return NextResponse.json({
            error: 'Data and private key are required for signing'
          }, { status: 400 });
        }

        const signatureResult = cryptoService.sign(data, privateKey);
        
        return NextResponse.json({
          success: true,
          operation: 'sign',
          signature: signatureResult,
          timestamp: new Date().toISOString()
        });

      } else if (operation === 'verify') {
        if (!data || !signature || !publicKey) {
          return NextResponse.json({
            error: 'Data, signature, and public key are required for verification'
          }, { status: 400 });
        }

        const isValid = cryptoService.verify(data, signature, publicKey);
        
        return NextResponse.json({
          success: true,
          operation: 'verify',
          valid: isValid,
          timestamp: new Date().toISOString()
        });
      }

    } catch (signError) {
      console.error('Digital signature error:', signError);
      return NextResponse.json({
        error: 'Digital signature operation failed',
        message: signError instanceof Error ? signError.message : 'Unknown signature error',
        operation
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Sign API error:', error);
    return NextResponse.json({
      error: 'Request processing failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Apply strict rate limiting to crypto operations (they're computationally expensive)
export const POST = withStrictRateLimit(async (req: NextRequest) => {
  const { pathname } = req.nextUrl;
  
  if (pathname.endsWith('/keypair')) {
    return keyPairHandler(req);
  } else if (pathname.endsWith('/sign')) {
    return signHandler(req);
  } else {
    return cryptoHandler(req);
  }
});