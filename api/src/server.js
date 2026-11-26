import 'dotenv/config';
import { createApp } from './app.js';
import { createCognitoVerifier } from './auth.js';

const port = Number(process.env.PORT ?? 3001);
const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
const userPoolId = process.env.COGNITO_USER_POOL_ID;
const clientId = process.env.COGNITO_APP_CLIENT_ID;
const tokenUse = process.env.COGNITO_TOKEN_USE ?? 'access';

const verifier = createCognitoVerifier({ userPoolId, clientId, tokenUse });
const app = createApp({ verifier, corsOrigin });

app.listen(port, () => {
  console.log(`API protegida rodando em http://localhost:${port}`);
});

