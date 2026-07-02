import { z } from 'zod'

// Shared strong-password policy: 8-72 chars (bcrypt limit), at least one
// uppercase, one lowercase, one digit, and one special character.
export const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/;

export const PASSWORD_POLICY_MESSAGE =
    'Password must be 8-72 characters and include an uppercase letter, a lowercase letter, a number, and a special character.';

// Reusable check for any controller that accepts a new password
// (registration, workspace join, password reset, password change).
export function validatePasswordStrength(password: unknown): string | null {
    if (typeof password !== 'string' || !STRONG_PASSWORD_REGEX.test(password)) {
        return PASSWORD_POLICY_MESSAGE;
    }
    return null;
}

const strongPasswordSchema = z.string().regex(STRONG_PASSWORD_REGEX, PASSWORD_POLICY_MESSAGE);

export const RegisterCheckValid = z.object({
    name: z.string(),
    email: z.string().email(),
    password: strongPasswordSchema
})

export const LoginValidationSchema = z.object({
    email: z.string().email(),
    password: z.string()
})