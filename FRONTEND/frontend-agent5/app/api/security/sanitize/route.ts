import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiRateLimit } from '@/infrastructure/security/middleware/ApiRateLimitHandler';
import { DOMPurifySanitizer } from '@/infrastructure/security/services/DOMPurifySanitizer';
import { getValidator } from '@/infrastructure/security/factories/ValidationFactory';

/**
 * Input sanitization endpoint
 * POST /api/security/sanitize
 */
async function sanitizeHandler(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const validator = getValidator();
    const sanitizer = new DOMPurifySanitizer();
    
    // Validate request body structure
    const requestSchema = z.object({
      type: z.enum(['html', 'json', 'sql', 'url', 'filepath', 'object']),
      input: z.any(),
      options: z.record(z.any()).optional()
    });

    const validationResult = validator.validateInput(body, requestSchema);
    if (!validationResult.isValid) {
      return NextResponse.json({
        error: 'Invalid request',
        details: validationResult.errors
      }, { status: 400 });
    }

    const { type, input, options } = validationResult.sanitized!;
    let result;

    try {
      // Perform sanitization based on type
      switch (type) {
        case 'html':
          if (typeof input !== 'string') {
            return NextResponse.json({
              error: 'HTML input must be a string'
            }, { status: 400 });
          }
          result = {
            sanitized: sanitizer.sanitizeHTML(input, options),
            original: input,
            type: 'html'
          };
          break;
          
        case 'json':
          result = {
            sanitized: sanitizer.sanitizeJSON(input),
            original: input,
            type: 'json'
          };
          break;
          
        case 'sql':
          if (typeof input !== 'string') {
            return NextResponse.json({
              error: 'SQL input must be a string'
            }, { status: 400 });
          }
          result = {
            sanitized: sanitizer.sanitizeSQL(input),
            original: input,
            type: 'sql'
          };
          break;
          
        case 'url':
          if (typeof input !== 'string') {
            return NextResponse.json({
              error: 'URL input must be a string'
            }, { status: 400 });
          }
          result = {
            sanitized: sanitizer.sanitizeURL(input),
            original: input,
            type: 'url'
          };
          break;
          
        case 'filepath':
          if (typeof input !== 'string') {
            return NextResponse.json({
              error: 'File path input must be a string'
            }, { status: 400 });
          }
          result = {
            sanitized: sanitizer.sanitizeFilePath(input),
            original: input,
            type: 'filepath'
          };
          break;
          
        case 'object':
          if (typeof input !== 'object' || input === null) {
            return NextResponse.json({
              error: 'Object input must be a valid object'
            }, { status: 400 });
          }
          result = {
            sanitized: sanitizer.sanitizeObject(input, options),
            original: input,
            type: 'object'
          };
          break;
          
        default:
          return NextResponse.json({
            error: 'Unsupported sanitization type'
          }, { status: 400 });
      }

      // Additional security analysis
      const securityAnalysis = {
        removedScripts: type === 'html' ? (input.match(/<script/gi) || []).length : 0,
        removedEvents: type === 'html' ? (input.match(/on\w+\s*=/gi) || []).length : 0,
        removedDangerousUrls: type === 'html' ? (input.match(/javascript:|data:|vbscript:/gi) || []).length : 0,
        potentialThreats: {
          xss: validator.isXSS(typeof input === 'string' ? input : JSON.stringify(input)),
          sqlInjection: validator.isSQLInjection(typeof input === 'string' ? input : JSON.stringify(input))
        }
      };

      return NextResponse.json({
        success: true,
        result,
        securityAnalysis,
        timestamp: new Date().toISOString()
      });

    } catch (sanitizationError) {
      return NextResponse.json({
        error: 'Sanitization failed',
        message: sanitizationError instanceof Error ? sanitizationError.message : 'Unknown sanitization error',
        type
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Sanitization API error:', error);
    return NextResponse.json({
      error: 'Request processing failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Apply rate limiting to the handler
export const POST = withApiRateLimit(sanitizeHandler, {
  keyType: 'ip'
});