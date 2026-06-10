const SENSITIVE_KEYS = new Set([
  'password',
  'passwordHash',
  'password_hash',
  'token',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'cookie',
  'authorization',
]);

const MASK = '[REDACTED]';

export function maskSensitiveData<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item: unknown) => maskSensitiveData(item)) as T;
  }

  if (typeof value === 'object') {
    const masked: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(key)) {
        masked[key] = MASK;
      } else {
        masked[key] = maskSensitiveData(val);
      }
    }
    return masked as T;
  }

  return value;
}
