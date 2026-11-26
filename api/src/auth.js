import { CognitoJwtVerifier } from 'aws-jwt-verify';

/**
 * Creates a Cognito JWT verifier that validates signature (via JWKS),
 * issuer (iss), audience/client_id, token_use, and expiration (exp).
 */
export function createCognitoVerifier({
  userPoolId,
  clientId,
  tokenUse = 'access',
}) {
  if (!userPoolId || !clientId) {
    throw new Error('COGNITO_USER_POOL_ID and COGNITO_APP_CLIENT_ID are required');
  }

  return CognitoJwtVerifier.create({
    userPoolId,
    tokenUse,
    clientId,
  });
}

/**
 * Express middleware that requires a valid Bearer JWT issued by Amazon Cognito.
 */
export function requireCognitoAuth(verifier) {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or malformed Authorization Bearer token',
      });
    }

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Empty Bearer token',
      });
    }

    try {
      const payload = await verifier.verify(token);
      req.user = payload;
      return next();
    } catch (err) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired Cognito token',
        detail: err?.message ?? 'Token verification failed',
      });
    }
  };
}

