import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from 'react-oidc-context';
import App from './App.jsx';
import './index.css';

const cognitoAuthConfig = {
  authority:
    import.meta.env.VITE_COGNITO_AUTHORITY ||
    'https://cognito-idp.us-east-2.amazonaws.com/us-east-2_MCGl44ZQG',
  client_id:
    import.meta.env.VITE_COGNITO_CLIENT_ID || '6oaek3jr8jpg2olcpu12omdi67',
  redirect_uri:
    import.meta.env.VITE_COGNITO_REDIRECT_URI ||
    'http://localhost:5173/callback',
  response_type: 'code',
  scope: import.meta.env.VITE_COGNITO_SCOPE || 'phone openid email',
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, '/');
  },
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider {...cognitoAuthConfig}>
      <App />
    </AuthProvider>
  </React.StrictMode>,
);

