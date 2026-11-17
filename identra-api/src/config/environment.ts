export function validateEnvironment(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const required = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
  for (const key of required) {
    if (typeof config[key] !== 'string' || config[key].trim() === '') {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  return config;
}
