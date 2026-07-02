// Mirrors Backend/src/validations/validinputs.ts STRONG_PASSWORD_REGEX —
// keep both in sync if the policy ever changes.
export const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/;

export const PASSWORD_POLICY_MESSAGE =
    'Password must be 8-72 characters and include an uppercase letter, a lowercase letter, a number, and a special character.';

export function isPasswordStrong(password) {
    return typeof password === 'string' && STRONG_PASSWORD_REGEX.test(password);
}

// Per-rule breakdown so the UI can show the user exactly what's still missing.
export function getPasswordChecklist(password) {
    const pwd = password || '';
    return [
        { key: 'hasMinLength', label: '8+ characters', met: pwd.length >= 8 },
        { key: 'hasUpperCase', label: 'Uppercase letter', met: /[A-Z]/.test(pwd) },
        { key: 'hasLowerCase', label: 'Lowercase letter', met: /[a-z]/.test(pwd) },
        { key: 'hasNumber', label: 'Number', met: /\d/.test(pwd) },
        { key: 'hasSpecial', label: 'Special character', met: /[^A-Za-z0-9]/.test(pwd) },
    ];
}
