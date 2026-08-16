/**
 * Minimum password requirements (spec §11): at least 8 characters with a
 * mix of upper/lowercase and a digit. Shared by user creation, password
 * change, and password reset so the rule can't drift between entry points.
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_STRENGTH_REGEX = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
export const PASSWORD_STRENGTH_MESSAGE =
  'Password must contain at least one uppercase letter, one lowercase letter, and one digit';
