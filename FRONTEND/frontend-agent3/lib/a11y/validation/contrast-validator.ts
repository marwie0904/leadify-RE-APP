import { AccessibilityError, AccessibilityErrorCode } from '../core/types';

export type WCAGLevel = 'AA' | 'AAA';
export type TextSize = 'normal' | 'large';

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface ContrastResult {
  passes: boolean;
  ratio: number;
  requiredRatio: number;
  level: WCAGLevel;
  size: TextSize;
  foreground: string;
  background: string;
  message?: string;
  suggestion?: string;
  suggestedForeground?: string;
  suggestedBackground?: string;
}

export interface ContrastCombination {
  foreground: string;
  background: string;
  size: TextSize;
  level: WCAGLevel;
}

// WCAG contrast ratio requirements
const WCAG_REQUIREMENTS = {
  AA: {
    normal: 4.5,
    large: 3.0,
  },
  AAA: {
    normal: 7.0,
    large: 4.5,
  },
} as const;

// Common color names to RGB values
const COLOR_NAMES: Record<string, RGB> = {
  black: { r: 0, g: 0, b: 0 },
  white: { r: 255, g: 255, b: 255 },
  red: { r: 255, g: 0, b: 0 },
  green: { r: 0, g: 128, b: 0 },
  blue: { r: 0, g: 0, b: 255 },
  yellow: { r: 255, g: 255, b: 0 },
  cyan: { r: 0, g: 255, b: 255 },
  magenta: { r: 255, g: 0, b: 255 },
  silver: { r: 192, g: 192, b: 192 },
  gray: { r: 128, g: 128, b: 128 },
  maroon: { r: 128, g: 0, b: 0 },
  olive: { r: 128, g: 128, b: 0 },
  lime: { r: 0, g: 255, b: 0 },
  aqua: { r: 0, g: 255, b: 255 },
  teal: { r: 0, g: 128, b: 128 },
  navy: { r: 0, g: 0, b: 128 },
  fuchsia: { r: 255, g: 0, b: 255 },
  purple: { r: 128, g: 0, b: 128 },
};

export class ContrastValidator {
  private luminanceCache = new Map<string, number>();

  /**
   * Parse a color string into RGB values
   */
  parseColor(color: string): RGB {
    const normalizedColor = color.trim().toLowerCase();

    // Handle color names
    if (COLOR_NAMES[normalizedColor]) {
      return COLOR_NAMES[normalizedColor];
    }

    // Handle hex colors
    if (normalizedColor.startsWith('#')) {
      return this.parseHexColor(normalizedColor);
    }

    // Handle rgb/rgba colors
    if (normalizedColor.startsWith('rgb')) {
      return this.parseRgbColor(normalizedColor);
    }

    throw new AccessibilityError(
      `Invalid color format: ${color}. Supported formats: hex (#ffffff), rgb(255,255,255), rgba(255,255,255,1), or named colors.`,
      AccessibilityErrorCode.INVALID_COLOR
    );
  }

  private parseHexColor(hex: string): RGB {
    // Remove # and normalize
    const cleanHex = hex.slice(1);
    
    if (cleanHex.length === 3) {
      // Short hex format (#fff)
      const r = parseInt(cleanHex[0] + cleanHex[0], 16);
      const g = parseInt(cleanHex[1] + cleanHex[1], 16);
      const b = parseInt(cleanHex[2] + cleanHex[2], 16);
      
      if (isNaN(r) || isNaN(g) || isNaN(b)) {
        throw new AccessibilityError(
          `Invalid hex color: ${hex}`,
          AccessibilityErrorCode.INVALID_COLOR
        );
      }
      
      return { r, g, b };
    } else if (cleanHex.length === 6) {
      // Full hex format (#ffffff)
      const r = parseInt(cleanHex.slice(0, 2), 16);
      const g = parseInt(cleanHex.slice(2, 4), 16);
      const b = parseInt(cleanHex.slice(4, 6), 16);
      
      if (isNaN(r) || isNaN(g) || isNaN(b)) {
        throw new AccessibilityError(
          `Invalid hex color: ${hex}`,
          AccessibilityErrorCode.INVALID_COLOR
        );
      }
      
      return { r, g, b };
    }

    throw new AccessibilityError(
      `Invalid hex color length: ${hex}. Expected 3 or 6 characters after #.`,
      AccessibilityErrorCode.INVALID_COLOR
    );
  }

  private parseRgbColor(rgbString: string): RGB {
    const rgbMatch = rgbString.match(/rgba?\(([^)]+)\)/);
    if (!rgbMatch) {
      throw new AccessibilityError(
        `Invalid RGB color format: ${rgbString}`,
        AccessibilityErrorCode.INVALID_COLOR
      );
    }

    const values = rgbMatch[1].split(',').map(v => parseFloat(v.trim()));
    
    if (values.length < 3) {
      throw new AccessibilityError(
        `Invalid RGB color format: ${rgbString}. Expected at least 3 values.`,
        AccessibilityErrorCode.INVALID_COLOR
      );
    }

    const [r, g, b] = values;

    // Validate RGB values are in range
    if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
      throw new AccessibilityError(
        `RGB values must be between 0 and 255: ${rgbString}`,
        AccessibilityErrorCode.INVALID_COLOR
      );
    }

    return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
  }

  /**
   * Calculate the relative luminance of a color
   * Based on WCAG 2.1 specification
   */
  calculateLuminance(rgb: RGB): number {
    const cacheKey = `${rgb.r},${rgb.g},${rgb.b}`;
    
    if (this.luminanceCache.has(cacheKey)) {
      return this.luminanceCache.get(cacheKey)!;
    }

    // Convert to 0-1 range and apply gamma correction
    const sRGB = {
      r: rgb.r / 255,
      g: rgb.g / 255,
      b: rgb.b / 255,
    };

    const linearRGB = {
      r: sRGB.r <= 0.03928 ? sRGB.r / 12.92 : Math.pow((sRGB.r + 0.055) / 1.055, 2.4),
      g: sRGB.g <= 0.03928 ? sRGB.g / 12.92 : Math.pow((sRGB.g + 0.055) / 1.055, 2.4),
      b: sRGB.b <= 0.03928 ? sRGB.b / 12.92 : Math.pow((sRGB.b + 0.055) / 1.055, 2.4),
    };

    // Calculate luminance using the WCAG formula
    const luminance = 0.2126 * linearRGB.r + 0.7152 * linearRGB.g + 0.0722 * linearRGB.b;
    
    this.luminanceCache.set(cacheKey, luminance);
    return luminance;
  }

  /**
   * Calculate contrast ratio between two colors
   */
  calculateContrastRatio(foreground: string, background: string): number {
    const fgRgb = this.parseColor(foreground);
    const bgRgb = this.parseColor(background);

    const fgLuminance = this.calculateLuminance(fgRgb);
    const bgLuminance = this.calculateLuminance(bgRgb);

    // Ensure lighter color is in numerator
    const lighter = Math.max(fgLuminance, bgLuminance);
    const darker = Math.min(fgLuminance, bgLuminance);

    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Validate contrast ratio against WCAG standards
   */
  validateContrast(
    foreground: string,
    background: string,
    size: TextSize = 'normal',
    level: WCAGLevel = 'AA'
  ): ContrastResult {
    try {
      const ratio = this.calculateContrastRatio(foreground, background);
      const requiredRatio = WCAG_REQUIREMENTS[level][size];
      const passes = ratio >= requiredRatio;

      const result: ContrastResult = {
        passes,
        ratio,
        requiredRatio,
        level,
        size,
        foreground,
        background,
      };

      if (!passes) {
        result.message = `insufficient contrast ratio ${ratio.toFixed(2)}:1. Required: ${requiredRatio}:1 for ${level} ${size} text.`;
        result.suggestion = this.generateSuggestion(foreground, background, requiredRatio);
        
        // Generate color suggestions
        const suggestions = this.generateColorSuggestions(foreground, background, requiredRatio);
        result.suggestedForeground = suggestions.foreground;
        result.suggestedBackground = suggestions.background;
      }

      return result;
    } catch (error) {
      if (error instanceof AccessibilityError) {
        throw error;
      }
      throw new AccessibilityError(
        `Failed to validate contrast: ${error instanceof Error ? error.message : 'Unknown error'}`,
        AccessibilityErrorCode.VALIDATION_ERROR
      );
    }
  }

  /**
   * Validate multiple color combinations
   */
  validateMultiple(combinations: ContrastCombination[]): ContrastResult[] {
    return combinations.map(combo => 
      this.validateContrast(combo.foreground, combo.background, combo.size, combo.level)
    );
  }

  /**
   * Generate human-readable suggestion for improving contrast
   */
  private generateSuggestion(foreground: string, background: string, requiredRatio: number): string {
    const fgRgb = this.parseColor(foreground);
    const bgRgb = this.parseColor(background);
    
    const fgBrightness = this.getBrightness(fgRgb);
    const bgBrightness = this.getBrightness(bgRgb);

    if (fgBrightness > bgBrightness) {
      // Light text on dark background
      if (Math.abs(fgBrightness - bgBrightness) < 100) {
        return `Consider using a darker background or lighter foreground color to improve contrast.`;
      }
      return `Consider using a darker background color to improve contrast.`;
    } else {
      // Dark text on light background  
      if (Math.abs(fgBrightness - bgBrightness) < 100) {
        return `Consider using a darker foreground color or lighter background to improve contrast.`;
      }
      return `Consider using a darker foreground color to improve contrast.`;
    }
  }

  /**
   * Generate specific color suggestions
   */
  private generateColorSuggestions(
    foreground: string, 
    background: string, 
    requiredRatio: number
  ): { foreground?: string; background?: string } {
    const fgRgb = this.parseColor(foreground);
    const bgRgb = this.parseColor(background);
    
    const suggestions: { foreground?: string; background?: string } = {};

    // Try adjusting foreground color
    const adjustedFg = this.adjustColorForContrast(fgRgb, bgRgb, requiredRatio, 'foreground');
    if (adjustedFg) {
      suggestions.foreground = this.toHex(adjustedFg);
    }

    // Try adjusting background color
    const adjustedBg = this.adjustColorForContrast(fgRgb, bgRgb, requiredRatio, 'background');
    if (adjustedBg) {
      suggestions.background = this.toHex(adjustedBg);
    }

    return suggestions;
  }

  /**
   * Adjust a color to meet contrast requirements
   */
  private adjustColorForContrast(
    fgRgb: RGB,
    bgRgb: RGB,
    requiredRatio: number,
    adjust: 'foreground' | 'background'
  ): RGB | null {
    const targetRgb = adjust === 'foreground' ? { ...fgRgb } : { ...bgRgb };
    const referenceRgb = adjust === 'foreground' ? bgRgb : fgRgb;
    
    const referenceLuminance = this.calculateLuminance(referenceRgb);
    const targetLuminance = this.calculateLuminance(targetRgb);

    // Try darkening first, then lightening
    const adjustmentDirections = [-1, 1]; // -1 for darkening, 1 for lightening
    
    for (const direction of adjustmentDirections) {
      for (let i = 1; i <= 255; i++) {
        const adjustmentFactor = direction * i;
        
        const adjustedRgb = {
          r: Math.max(0, Math.min(255, targetRgb.r + adjustmentFactor)),
          g: Math.max(0, Math.min(255, targetRgb.g + adjustmentFactor)),
          b: Math.max(0, Math.min(255, targetRgb.b + adjustmentFactor)),
        };

        const testFgRgb = adjust === 'foreground' ? adjustedRgb : fgRgb;
        const testBgRgb = adjust === 'background' ? adjustedRgb : bgRgb;
        
        const testFgLuminance = this.calculateLuminance(testFgRgb);
        const testBgLuminance = this.calculateLuminance(testBgRgb);
        
        const lighter = Math.max(testFgLuminance, testBgLuminance);
        const darker = Math.min(testFgLuminance, testBgLuminance);
        const ratio = (lighter + 0.05) / (darker + 0.05);

        if (ratio >= requiredRatio) {
          return adjustedRgb;
        }
      }
    }

    return null;
  }

  /**
   * Convert RGB to hex string
   */
  toHex(rgb: RGB): string {
    const toHexComponent = (value: number) => {
      const hex = Math.round(value).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHexComponent(rgb.r)}${toHexComponent(rgb.g)}${toHexComponent(rgb.b)}`;
  }

  /**
   * Calculate perceived brightness of a color
   */
  getBrightness(rgb: RGB): number {
    // Using the relative luminance formula for perceived brightness
    return 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
  }

  /**
   * Determine if a color is light or dark
   */
  isLight(rgb: RGB): boolean {
    return this.getBrightness(rgb) > 127.5;
  }

  /**
   * Clear the luminance cache
   */
  clearCache(): void {
    this.luminanceCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate?: number } {
    return {
      size: this.luminanceCache.size,
    };
  }
}