import { ContrastValidator, ContrastResult, WCAGLevel, TextSize } from '@/lib/a11y/validation/contrast-validator';
import { AccessibilityError, AccessibilityErrorCode } from '@/lib/a11y/core/types';

describe('ContrastValidator', () => {
  let validator: ContrastValidator;

  beforeEach(() => {
    validator = new ContrastValidator();
  });

  describe('Color Parsing', () => {
    it('should parse hex colors correctly', () => {
      expect(validator.parseColor('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
      expect(validator.parseColor('#000000')).toEqual({ r: 0, g: 0, b: 0 });
      expect(validator.parseColor('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
      expect(validator.parseColor('#00ff00')).toEqual({ r: 0, g: 255, b: 0 });
      expect(validator.parseColor('#0000ff')).toEqual({ r: 0, g: 0, b: 255 });
    });

    it('should parse short hex colors correctly', () => {
      expect(validator.parseColor('#fff')).toEqual({ r: 255, g: 255, b: 255 });
      expect(validator.parseColor('#000')).toEqual({ r: 0, g: 0, b: 0 });
      expect(validator.parseColor('#f00')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('should parse RGB colors correctly', () => {
      expect(validator.parseColor('rgb(255, 255, 255)')).toEqual({ r: 255, g: 255, b: 255 });
      expect(validator.parseColor('rgb(0, 0, 0)')).toEqual({ r: 0, g: 0, b: 0 });
      expect(validator.parseColor('rgb(128, 64, 192)')).toEqual({ r: 128, g: 64, b: 192 });
    });

    it('should parse RGBA colors correctly (ignoring alpha)', () => {
      expect(validator.parseColor('rgba(255, 255, 255, 0.5)')).toEqual({ r: 255, g: 255, b: 255 });
      expect(validator.parseColor('rgba(128, 64, 192, 0.8)')).toEqual({ r: 128, g: 64, b: 192 });
    });

    it('should handle color names', () => {
      expect(validator.parseColor('white')).toEqual({ r: 255, g: 255, b: 255 });
      expect(validator.parseColor('black')).toEqual({ r: 0, g: 0, b: 0 });
      expect(validator.parseColor('red')).toEqual({ r: 255, g: 0, b: 0 });
      expect(validator.parseColor('green')).toEqual({ r: 0, g: 128, b: 0 });
      expect(validator.parseColor('blue')).toEqual({ r: 0, g: 0, b: 255 });
    });

    it('should throw error for invalid colors', () => {
      expect(() => validator.parseColor('invalid')).toThrow(AccessibilityError);
      expect(() => validator.parseColor('#gggggg')).toThrow(AccessibilityError);
      expect(() => validator.parseColor('rgb(300, 400, 500)')).toThrow(AccessibilityError);
    });
  });

  describe('Luminance Calculation', () => {
    it('should calculate luminance for white correctly', () => {
      const luminance = validator.calculateLuminance({ r: 255, g: 255, b: 255 });
      expect(luminance).toBeCloseTo(1, 3);
    });

    it('should calculate luminance for black correctly', () => {
      const luminance = validator.calculateLuminance({ r: 0, g: 0, b: 0 });
      expect(luminance).toBeCloseTo(0, 3);
    });

    it('should calculate luminance for mid-gray correctly', () => {
      const luminance = validator.calculateLuminance({ r: 128, g: 128, b: 128 });
      expect(luminance).toBeCloseTo(0.216, 3);
    });

    it('should calculate luminance for red correctly', () => {
      const luminance = validator.calculateLuminance({ r: 255, g: 0, b: 0 });
      expect(luminance).toBeCloseTo(0.2126, 3);
    });

    it('should calculate luminance for green correctly', () => {
      const luminance = validator.calculateLuminance({ r: 0, g: 255, b: 0 });
      expect(luminance).toBeCloseTo(0.7152, 3);
    });

    it('should calculate luminance for blue correctly', () => {
      const luminance = validator.calculateLuminance({ r: 0, g: 0, b: 255 });
      expect(luminance).toBeCloseTo(0.0722, 3);
    });
  });

  describe('Contrast Ratio Calculation', () => {
    it('should calculate contrast ratio between white and black', () => {
      const ratio = validator.calculateContrastRatio('#ffffff', '#000000');
      expect(ratio).toBeCloseTo(21, 1);
    });

    it('should calculate contrast ratio between black and white', () => {
      const ratio = validator.calculateContrastRatio('#000000', '#ffffff');
      expect(ratio).toBeCloseTo(21, 1);
    });

    it('should calculate contrast ratio between same colors', () => {
      const ratio = validator.calculateContrastRatio('#ffffff', '#ffffff');
      expect(ratio).toBeCloseTo(1, 1);
    });

    it('should calculate contrast ratio between different colors', () => {
      const ratio = validator.calculateContrastRatio('#000080', '#ffffff');
      expect(ratio).toBeGreaterThan(8);
    });

    it('should handle different color formats', () => {
      const ratio1 = validator.calculateContrastRatio('#ffffff', 'rgb(0, 0, 0)');
      const ratio2 = validator.calculateContrastRatio('white', 'black');
      expect(ratio1).toBeCloseTo(21, 1);
      expect(ratio2).toBeCloseTo(21, 1);
    });
  });

  describe('WCAG Compliance Validation', () => {
    describe('Normal Text (AA Level)', () => {
      it('should pass for high contrast combinations', () => {
        const result = validator.validateContrast('#000000', '#ffffff', 'normal', 'AA');
        expect(result.passes).toBe(true);
        expect(result.ratio).toBeCloseTo(21, 1);
        expect(result.level).toBe('AA');
        expect(result.size).toBe('normal');
        expect(result.requiredRatio).toBe(4.5);
      });

      it('should fail for low contrast combinations', () => {
        const result = validator.validateContrast('#777777', '#888888', 'normal', 'AA');
        expect(result.passes).toBe(false);
        expect(result.ratio).toBeLessThan(4.5);
      });

      it('should provide detailed failure information', () => {
        const result = validator.validateContrast('#aaaaaa', '#bbbbbb', 'normal', 'AA');
        expect(result.passes).toBe(false);
        expect(result.message).toContain('insufficient contrast');
        expect(result.suggestion).toContain('darker');
      });
    });

    describe('Normal Text (AAA Level)', () => {
      it('should pass for very high contrast combinations', () => {
        const result = validator.validateContrast('#000000', '#ffffff', 'normal', 'AAA');
        expect(result.passes).toBe(true);
        expect(result.requiredRatio).toBe(7);
      });

      it('should fail for medium contrast combinations', () => {
        const result = validator.validateContrast('#777777', '#ffffff', 'normal', 'AAA');
        expect(result.passes).toBe(false);
      });
    });

    describe('Large Text (AA Level)', () => {
      it('should pass for medium contrast combinations', () => {
        const result = validator.validateContrast('#666666', '#ffffff', 'large', 'AA');
        expect(result.passes).toBe(true);
        expect(result.requiredRatio).toBe(3);
      });

      it('should fail for very low contrast combinations', () => {
        const result = validator.validateContrast('#cccccc', '#ffffff', 'large', 'AA');
        expect(result.passes).toBe(false);
      });
    });

    describe('Large Text (AAA Level)', () => {
      it('should pass for good contrast combinations', () => {
        const result = validator.validateContrast('#444444', '#ffffff', 'large', 'AAA');
        expect(result.passes).toBe(true);
        expect(result.requiredRatio).toBe(4.5);
      });
    });
  });

  describe('Batch Validation', () => {
    it('should validate multiple color combinations', () => {
      const combinations = [
        { foreground: '#000000', background: '#ffffff', size: 'normal' as TextSize, level: 'AA' as WCAGLevel },
        { foreground: '#777777', background: '#888888', size: 'normal' as TextSize, level: 'AA' as WCAGLevel },
        { foreground: '#666666', background: '#ffffff', size: 'large' as TextSize, level: 'AA' as WCAGLevel },
      ];

      const results = validator.validateMultiple(combinations);
      expect(results).toHaveLength(3);
      expect(results[0].passes).toBe(true);
      expect(results[1].passes).toBe(false);
      expect(results[2].passes).toBe(true);
    });

    it('should handle empty batch validation', () => {
      const results = validator.validateMultiple([]);
      expect(results).toHaveLength(0);
    });
  });

  describe('Color Suggestions', () => {
    it('should suggest darker colors for light foregrounds on light backgrounds', () => {
      const result = validator.validateContrast('#cccccc', '#ffffff', 'normal', 'AA');
      expect(result.suggestion).toContain('darker');
      expect(result.suggestedForeground).toBeDefined();
      
      if (result.suggestedForeground) {
        const newRatio = validator.calculateContrastRatio(result.suggestedForeground, '#ffffff');
        expect(newRatio).toBeGreaterThanOrEqual(4.5);
      }
    });

    it('should suggest lighter colors for dark foregrounds on dark backgrounds', () => {
      const result = validator.validateContrast('#333333', '#000000', 'normal', 'AA');
      expect(result.suggestion).toContain('lighter');
      expect(result.suggestedForeground).toBeDefined();
    });

    it('should suggest background color alternatives', () => {
      const result = validator.validateContrast('#666666', '#777777', 'normal', 'AA');
      expect(result.suggestedBackground).toBeDefined();
      
      if (result.suggestedBackground) {
        const newRatio = validator.calculateContrastRatio('#666666', result.suggestedBackground);
        expect(newRatio).toBeGreaterThanOrEqual(4.5);
      }
    });
  });

  describe('Real-world Color Combinations', () => {
    const testCases = [
      // High contrast - should pass AA and AAA
      { fg: '#000000', bg: '#ffffff', expectedAA: true, expectedAAA: true },
      { fg: '#ffffff', bg: '#000000', expectedAA: true, expectedAAA: true },
      
      // Medium-high contrast - should pass both AA and AAA for normal text
      { fg: '#595959', bg: '#ffffff', expectedAA: true, expectedAAA: true },
      { fg: '#ffffff', bg: '#595959', expectedAA: true, expectedAAA: true },
      
      // Low contrast - should fail both
      { fg: '#999999', bg: '#bbbbbb', expectedAA: false, expectedAAA: false },
      
      // Brand colors
      { fg: '#1976d2', bg: '#ffffff', expectedAA: true, expectedAAA: false }, // Material Blue
      { fg: '#ffffff', bg: '#1976d2', expectedAA: true, expectedAAA: false },
      { fg: '#d32f2f', bg: '#ffffff', expectedAA: true, expectedAAA: false }, // Material Red
    ];

    testCases.forEach(({ fg, bg, expectedAA, expectedAAA }, index) => {
      it(`should correctly validate real-world combination ${index + 1}: ${fg} on ${bg}`, () => {
        const resultAA = validator.validateContrast(fg, bg, 'normal', 'AA');
        const resultAAA = validator.validateContrast(fg, bg, 'normal', 'AAA');
        
        expect(resultAA.passes).toBe(expectedAA);
        expect(resultAAA.passes).toBe(expectedAAA);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small color differences', () => {
      const result = validator.validateContrast('#000000', '#000001', 'normal', 'AA');
      expect(result.passes).toBe(false);
      expect(result.ratio).toBeCloseTo(1, 2);
    });

    it('should handle alpha channel in colors', () => {
      const result = validator.validateContrast('rgba(0, 0, 0, 0.5)', '#ffffff', 'normal', 'AA');
      expect(result.passes).toBe(true); // Should ignore alpha and treat as solid black
    });

    it('should provide consistent results regardless of parameter order', () => {
      const result1 = validator.validateContrast('#000000', '#ffffff', 'normal', 'AA');
      const result2 = validator.validateContrast('#ffffff', '#000000', 'normal', 'AA');
      
      expect(result1.ratio).toBeCloseTo(result2.ratio, 3);
      expect(result1.passes).toBe(result2.passes);
    });
  });

  describe('Error Handling', () => {
    it('should throw AccessibilityError for invalid foreground color', () => {
      expect(() => {
        validator.validateContrast('invalid-color', '#ffffff', 'normal', 'AA');
      }).toThrow(AccessibilityError);
    });

    it('should throw AccessibilityError for invalid background color', () => {
      expect(() => {
        validator.validateContrast('#000000', 'invalid-color', 'normal', 'AA');
      }).toThrow(AccessibilityError);
    });

    it('should provide helpful error messages', () => {
      try {
        validator.validateContrast('not-a-color', '#ffffff', 'normal', 'AA');
      } catch (error) {
        expect(error).toBeInstanceOf(AccessibilityError);
        expect((error as AccessibilityError).code).toBe(AccessibilityErrorCode.INVALID_COLOR);
        expect((error as AccessibilityError).message).toContain('Invalid color format');
      }
    });
  });

  describe('Performance', () => {
    it('should handle large batch validations efficiently', () => {
      const startTime = performance.now();
      
      const combinations = Array.from({ length: 1000 }, (_, i) => ({
        foreground: `#${i.toString(16).padStart(6, '0')}`,
        background: '#ffffff',
        size: 'normal' as TextSize,
        level: 'AA' as WCAGLevel
      }));

      const results = validator.validateMultiple(combinations);
      const endTime = performance.now();
      
      expect(results).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should cache luminance calculations', () => {
      const color = '#ff6b35';
      
      // First calculation
      const start1 = performance.now();
      validator.calculateContrastRatio(color, '#ffffff');
      const end1 = performance.now();
      
      // Second calculation (should be faster due to caching)
      const start2 = performance.now();
      validator.calculateContrastRatio(color, '#ffffff');
      const end2 = performance.now();
      
      expect(end2 - start2).toBeLessThanOrEqual(end1 - start1);
    });
  });

  describe('Utility Methods', () => {
    it('should convert colors to hex format', () => {
      expect(validator.toHex({ r: 255, g: 255, b: 255 })).toBe('#ffffff');
      expect(validator.toHex({ r: 0, g: 0, b: 0 })).toBe('#000000');
      expect(validator.toHex({ r: 255, g: 0, b: 0 })).toBe('#ff0000');
    });

    it('should calculate color brightness', () => {
      expect(validator.getBrightness({ r: 255, g: 255, b: 255 })).toBeCloseTo(255, 1);
      expect(validator.getBrightness({ r: 0, g: 0, b: 0 })).toBeCloseTo(0, 1);
      expect(validator.getBrightness({ r: 128, g: 128, b: 128 })).toBeCloseTo(128, 1);
    });

    it('should determine if color is light or dark', () => {
      expect(validator.isLight({ r: 255, g: 255, b: 255 })).toBe(true);
      expect(validator.isLight({ r: 0, g: 0, b: 0 })).toBe(false);
      expect(validator.isLight({ r: 200, g: 200, b: 200 })).toBe(true);
      expect(validator.isLight({ r: 50, g: 50, b: 50 })).toBe(false);
    });
  });
});