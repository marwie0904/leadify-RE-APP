import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiRateLimit } from '@/infrastructure/security/middleware/ApiRateLimitHandler';
import { getValidator } from '@/infrastructure/security/factories/ValidationFactory';
import { EmailSchema, URLSchema, PasswordSchema } from '@/infrastructure/security/schemas/CommonSchemas';

/**
 * Input validation endpoint
 * POST /api/security/validate
 */
async function validateHandler(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const validator = getValidator();
    
    // Validate request body structure
    const requestSchema = z.object({
      type: z.enum(['email', 'url', 'password', 'phone', 'custom']),
      value: z.string(),
      schema: z.any().optional(), // For custom validation
      options: z.record(z.any()).optional()
    });

    const validationResult = validator.validateInput(body, requestSchema);
    if (!validationResult.isValid) {
      return NextResponse.json({
        error: 'Invalid request',
        details: validationResult.errors
      }, { status: 400 });
    }

    const { type, value, schema, options } = validationResult.sanitized!;
    let result;

    // Perform specific validation based on type
    switch (type) {
      case 'email':
        result = validator.validateEmail(value);
        break;
        
      case 'url':
        result = validator.validateURL(value, options);
        break;
        
      case 'password':
        result = validator.validatePassword(value, options);
        break;
        
      case 'phone':
        result = validator.validatePhone(value, options?.region);
        break;
        
      case 'custom':
        if (!schema) {
          return NextResponse.json({
            error: 'Schema is required for custom validation'
          }, { status: 400 });
        }
        
        try {
          const zodSchema = eval(`(${schema})`); // In production, use a safer schema parser
          result = validator.validateInput(value, zodSchema);
        } catch (error) {
          return NextResponse.json({
            error: 'Invalid schema',
            details: error instanceof Error ? error.message : 'Unknown error'
          }, { status: 400 });
        }
        break;
        
      default:
        return NextResponse.json({
          error: 'Unsupported validation type'
        }, { status: 400 });
    }

    // Check for security violations
    const securityChecks = {
      xss: validator.isXSS(value),
      sqlInjection: validator.isSQLInjection(value)
    };

    return NextResponse.json({
      valid: result.isValid,
      errors: result.errors,
      sanitized: result.sanitized,
      securityChecks,
      type,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Validation API error:', error);
    return NextResponse.json({
      error: 'Validation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Apply rate limiting to the handler
export const POST = withApiRateLimit(validateHandler, {
  keyType: 'ip'
});