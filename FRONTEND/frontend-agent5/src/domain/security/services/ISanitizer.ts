export interface ISanitizer {
  sanitizeHTML(input: string, options?: HTMLSanitizationOptions): string;
  sanitizeSQL(input: string): string;
  sanitizeJSON<T>(input: T): T;
  sanitizeObject<T extends Record<string, any>>(obj: T, rules?: SanitizationRules): T;
  removeScripts(input: string): string;
  escapeSpecialChars(input: string): string;
}

export interface HTMLSanitizationOptions {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  allowedSchemes?: string[];
  stripEmpty?: boolean;
}

export interface SanitizationRules {
  removeFields?: string[];
  maskFields?: string[];
  customSanitizers?: Record<string, (value: any) => any>;
}