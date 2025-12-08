import { isAllowedDomain } from '../domain-validator';

describe('domain-validator', () => {
  describe('isAllowedDomain', () => {
    it('should return true for valid @advm.lu email', () => {
      expect(isAllowedDomain('user@advm.lu')).toBe(true);
    });

    it('should return true for uppercase domain', () => {
      expect(isAllowedDomain('user@ADVM.LU')).toBe(true);
    });

    it('should return true for mixed case', () => {
      expect(isAllowedDomain('User@Advm.Lu')).toBe(true);
    });

    it('should return false for different domain', () => {
      expect(isAllowedDomain('user@gmail.com')).toBe(false);
    });

    it('should return false for similar domain', () => {
      expect(isAllowedDomain('user@advm.lu.fake.com')).toBe(false);
    });

    it('should return false for subdomain', () => {
      expect(isAllowedDomain('user@sub.advm.lu')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isAllowedDomain('')).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isAllowedDomain(null as any)).toBe(false);
      expect(isAllowedDomain(undefined as any)).toBe(false);
    });

    it('should handle whitespace', () => {
      expect(isAllowedDomain('  user@advm.lu  ')).toBe(true);
    });
  });
});
