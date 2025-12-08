import { authConfig } from './config';

/**
 * Validates if an email belongs to the allowed domain
 * @param email - Email address to validate
 * @returns true if email domain is allowed
 */
export function isAllowedDomain(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  const normalizedEmail = email.toLowerCase().trim();
  const allowedDomain = `@${authConfig.allowedEmailDomain.toLowerCase()}`;
  
  return normalizedEmail.endsWith(allowedDomain);
}
