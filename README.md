# Tema 9 — Autenticação Distribuída com Amazon Cognito

Projeto da disciplina de **Sistemas Distribuídos** (branch `AWS1`).

## Estrutura
- `frontend/`: SPA React + Vite usando `react-oidc-context` (OAuth 2.0 / OIDC com **Authorization Code + PKCE** via Cognito Managed Login).
- `api/`: API Express protegida que valida JWTs do Cognito via `aws-jwt-verify` (assinatura JWKS, `iss`, `client_id`, `token_use` e `exp`).
- `docs/RELATORIO_TEMA9.md`: Template completo do relatório final com diagrama de redirecionamentos, explicação dos tokens e checklist de evidências.

## Como rodar localmente

### 1. Configurar variáveis de ambiente
Em `api/` e `frontend/`, copie `.env.example` para `.env` e preencha com os dados do **seu** Cognito User Pool:
- `api/.env`: `COGNITO_REGION`, `COGNITO_USER_POOL_ID`, `COGNITO_APP_CLIENT_ID`
- `frontend/.env`: `VITE_COGNITO_AUTHORITY`, `VITE_COGNITO_CLIENT_ID`, `VITE_COGNITO_DOMAIN`, `VITE_COGNITO_REDIRECT_URI`, `VITE_COGNITO_LOGOUT_URI`

### 2. Iniciar API Protegida
```powershell
cd api
npm install
npm test      # roda os 4 testes automatizados (Vitest + Supertest)
npm run dev   # sobe em http://localhost:3001
```

### 3. Iniciar Frontend
```powershell
cd frontend
npm install
npm run dev   # sobe em http://localhost:5173
```

## Checklist rápido do que configurar nos consoles
1. **AWS Cognito:** User Pool + Domínio + App Client (SPA / Public client, **sem client secret**, `Authorization code grant`, PKCE, Callback `http://localhost:5173/callback`, Sign-out `http://localhost:5173/`).
2. **MFA:** Ativar **Authenticator apps (TOTP)** no User Pool.
3. **Google Cloud Console:** OAuth 2.0 Web Client com Redirect URI `https://<dominio-cognito>/oauth2/idpresponse` → cadastrar no Cognito (escopos `openid email profile`, mapear `email` e `name`).
4. **Meta for Developers (Facebook):** App com Facebook Login e Valid OAuth Redirect URI `https://<dominio-cognito>/oauth2/idpresponse` → cadastrar no Cognito (escopos `public_profile,email`, mapear `email` e `name`).
