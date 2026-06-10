import { maskSensitiveData } from './mask.util';

describe('maskSensitiveData', () => {
  it('masks sensitive keys', () => {
    const result = maskSensitiveData({
      email: 'user@example.com',
      password: 'secret123',
      token: 'abc',
    });

    expect(result).toEqual({
      email: 'user@example.com',
      password: '[REDACTED]',
      token: '[REDACTED]',
    });
  });

  it('masks nested sensitive keys', () => {
    const result = maskSensitiveData({
      user: { accessToken: 'jwt-token' },
    });

    expect(result).toEqual({
      user: { accessToken: '[REDACTED]' },
    });
  });
});
