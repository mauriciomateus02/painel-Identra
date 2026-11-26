import { useState } from 'react';
import { useAuth } from 'react-oidc-context';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const COGNITO_DOMAIN =
  import.meta.env.VITE_COGNITO_DOMAIN ||
  'https://us-east-2mcgl44zqg.auth.us-east-2.amazoncognito.com';
const CLIENT_ID =
  import.meta.env.VITE_COGNITO_CLIENT_ID || '6oaek3jr8jpg2olcpu12omdi67';
const LOGOUT_URI =
  import.meta.env.VITE_COGNITO_LOGOUT_URI || 'http://localhost:5173/';

function maskToken(token) {
  if (!token) return '—';
  if (token.length <= 24) return '***';
  return `${token.slice(0, 14)}...${token.slice(-10)}`;
}

export default function App() {
  const auth = useAuth();
  const [apiResult, setApiResult] = useState(null);
  const [loadingApi, setLoadingApi] = useState(false);

  async function callApi(path, mode = 'with-token') {
    setLoadingApi(true);
    setApiResult(null);
    try {
      const headers = {};
      if (mode === 'with-token' && auth.user?.access_token) {
        headers.Authorization = `Bearer ${auth.user.access_token}`;
      } else if (mode === 'invalid-token') {
        headers.Authorization = 'Bearer token.invalido.expirado';
      }

      const response = await fetch(`${API_URL}${path}`, { headers });
      const data = await response.json().catch(() => ({}));
      setApiResult({
        endpoint: path,
        mode,
        status: response.status,
        body: data,
      });
    } catch (error) {
      setApiResult({
        endpoint: path,
        mode,
        status: 'NETWORK_ERROR',
        body: { message: error.message },
      });
    } finally {
      setLoadingApi(false);
    }
  }

  async function signOutCognito() {
    await auth.removeUser();
    const logoutUrl = `${COGNITO_DOMAIN}/logout?client_id=${encodeURIComponent(
      CLIENT_ID,
    )}&logout_uri=${encodeURIComponent(LOGOUT_URI)}`;
    window.location.href = logoutUrl;
  }

  if (auth.isLoading) {
    return (
      <main className="container">
        <h1>Tema 9 — Amazon Cognito</h1>
        <p>Processando autenticação OIDC / PKCE...</p>
      </main>
    );
  }

  if (auth.error) {
    return (
      <main className="container">
        <h1>Tema 9 — Amazon Cognito</h1>
        <div className="card error">
          <strong>Erro de autenticação:</strong> {auth.error.message}
        </div>
        <button onClick={() => auth.signinRedirect()}>Tentar novamente</button>
      </main>
    );
  }

  return (
    <main className="container">
      <header className="header">
        <h1>Tema 9 — Autenticação Distribuída com Amazon Cognito</h1>
        <p className="subtitle">
          OAuth 2.0 / OIDC (Authorization Code + PKCE) • Managed Login • MFA •
          IdPs Sociais
        </p>
      </header>

      <section className="card">
        <h2>1. Sessão e Login (Managed Login)</h2>
        {!auth.isAuthenticated ? (
          <div className="actions">
            <p>Você não está autenticado.</p>
            <button className="primary" onClick={() => auth.signinRedirect()}>
              Entrar / Cadastrar (Cognito Managed Login)
            </button>
          </div>
        ) : (
          <div>
            <p className="badge success">Autenticado via Amazon Cognito</p>
            <div className="grid">
              <div>
                <strong>Usuário (sub):</strong> {auth.user?.profile?.sub}
              </div>
              <div>
                <strong>Email:</strong> {auth.user?.profile?.email ?? '—'}
              </div>
              <div>
                <strong>Access Token (mascarado):</strong>{' '}
                <code>{maskToken(auth.user?.access_token)}</code>
              </div>
              <div>
                <strong>ID Token (mascarado):</strong>{' '}
                <code>{maskToken(auth.user?.id_token)}</code>
              </div>
            </div>
            <div className="actions" style={{ marginTop: '1rem' }}>
              <button className="danger" onClick={signOutCognito}>
                Sair (Logout Local + Cognito)
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="card">
        <h2>2. Testes da API Protegida</h2>
        <div className="actions">
          <button onClick={() => callApi('/health', 'public')}>
            Rota Pública (/health)
          </button>
          <button
            className="primary"
            disabled={!auth.isAuthenticated || loadingApi}
            onClick={() => callApi('/api/protected', 'with-token')}
          >
            Rota Protegida COM Token (200)
          </button>
          <button
            disabled={loadingApi}
            onClick={() => callApi('/api/protected', 'no-token')}
          >
            Rota Protegida SEM Token (401)
          </button>
          <button
            disabled={loadingApi}
            onClick={() => callApi('/api/protected', 'invalid-token')}
          >
            Rota Protegida Token Inválido (401)
          </button>
        </div>

        {apiResult && (
          <pre className="output">
            {JSON.stringify(apiResult, null, 2)}
          </pre>
        )}
      </section>
    </main>
  );
}

