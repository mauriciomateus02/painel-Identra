import express from 'express';
import cors from 'cors';
import { requireCognitoAuth } from './auth.js';

/**
 * Builds the Express application with public and Cognito-protected routes.
 */
export function createApp({ verifier, corsOrigin = 'http://localhost:5173' }) {
  const app = express();

  app.use(
    cors({
      origin: corsOrigin.split(',').map((o) => o.trim()),
      credentials: false,
    }),
  );
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'cognito-protected-api',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/protected', requireCognitoAuth(verifier), (req, res) => {
    res.json({
      message: 'Acesso autorizado via token válido do Amazon Cognito',
      claims: {
        sub: req.user.sub,
        iss: req.user.iss,
        client_id: req.user.client_id ?? req.user.aud,
        token_use: req.user.token_use,
        scope: req.user.scope,
        username: req.user.username ?? req.user['cognito:username'],
        exp: req.user.exp,
      },
    });
  });

  return app;
}

